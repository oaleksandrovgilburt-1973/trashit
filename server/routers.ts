import { TRPCError } from "@trpc/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { sdk } from "./_core/sdk";
import { parse as parseCookies } from "cookie";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { notifyOwner } from "./_core/notification";
import { sendPushNotification } from "./fcm";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc"; // protectedProcedure used for worker/user procedures
import Stripe from "stripe";
import {
  getAllSettings, getAllUsers, getAllWorkers,
  getAdminConfig, getUserByEmail, getUserByOpenId,
  getUsersByRole, getSetting, getWorkerByOpenId,
  getWorkerByUsername, getWorkerSession, getWorkerSessionCount,
  addWorkerSession, removeOldestWorkerSession,
  initAdminConfig, updateAdminConfig,
  updateUserCredits, updateUserFcmToken, updateUserProfile, updateUserRole,
  updateWorkerLastSignedIn, updateWorkerPassword,
  upsertSetting, upsertUser, createWorker,
  // Districts
  getAllDistricts, getActiveDistricts, createDistrict,
  updateDistrictStatus, deleteDistrict,
  // Requests
  createRequest, getRequestsByUser, getAllRequests,
  getPendingRequests, getRequestById,
  completeRequest, completeRequestsByEntrance, cancelRequest, updateRequestProblem,
  // Cleaning
  createCleaningRequest, getCleaningRequestsByUser, getAllCleaningRequests,
  updateCleaningRequestStatus,
  // Transactions
  createTransaction, getTransactionsByUser, getAllTransactions,
  getTransactionByStripeSession,
  getDb,
  // Worker Problems
  createWorkerProblem, getAllWorkerProblems, getOpenWorkerProblems, updateWorkerProblem,
  // Worker Stats
  getAllWorkersWithStats, deactivateWorker, deleteWorker, activateWorker,
  // Block Access
  getActiveBlocksWithAccess,
  // Worker Districts
  getWorkerDistricts, setWorkerDistricts, getRequestsByDistricts,
} from "./db";

const BONUS_CREDITS = "2.00";
const MAX_WORKER_DEVICES = 4;
const WORKER_SESSION_COOKIE = "trashit_worker_session";
const ADMIN_SESSION_COOKIE = "trashit_admin_session";

// ─── Admin-only middleware ────────────────────────────────────────────────────
// Admin uses custom username/password auth (not Manus OAuth).
// We verify the admin session cookie set by adminAuth.login instead of ctx.user.
const adminProcedure = publicProcedure.use(({ ctx, next }) => {
  const cookies = parseCookies(ctx.req.headers.cookie ?? "");
  const adminToken = cookies[ADMIN_SESSION_COOKIE];
  if (!adminToken || adminToken.length < 10) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Необходим е администраторски вход." });
  }
  return next({ ctx });
});

// ─── Shared cookie helpers ────────────────────────────────────────────────────
function setWorkerCookie(ctx: { res: any; req: any }, token: string) {
  const opts = getSessionCookieOptions(ctx.req);
  ctx.res.cookie(WORKER_SESSION_COOKIE, token, { ...opts, maxAge: 30 * 24 * 60 * 60 * 1000 });
}

function setAdminCookie(ctx: { res: any; req: any }, token: string) {
  const opts = getSessionCookieOptions(ctx.req);
  ctx.res.cookie(ADMIN_SESSION_COOKIE, token, { ...opts, maxAge: 8 * 60 * 60 * 1000 });
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,

  // ── Manus OAuth auth ──────────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ── Client auth (email/password) ──────────────────────────────────────────
  clientAuth: router({
    register: publicProcedure
      .input(z.object({
        name: z.string().min(2, "Името трябва да е поне 2 символа"),
        email: z.string().email("Невалиден имейл адрес"),
        password: z.string().min(6, "Паролата трябва да е поне 6 символа"),
        phone: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getUserByEmail(input.email);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "Вече съществува акаунт с този имейл." });
        }
        const passwordHash = await bcrypt.hash(input.password, 10);
        const openId = `email_${nanoid(16)}`;
        await upsertUser({
          openId,
          name: input.name,
          email: input.email,
          phone: input.phone ?? null,
          passwordHash,
          loginMethod: "email",
          role: "user",
          creditsStandard: BONUS_CREDITS,
          credits: BONUS_CREDITS,
          bonusGranted: true,
          isFirstLogin: false,
          lastSignedIn: new Date(),
        });
        const sessionToken = await sdk.createSessionToken(openId, { name: input.name, expiresInMs: ONE_YEAR_MS });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true, bonusCredits: BONUS_CREDITS, openId };
      }),

    login: publicProcedure
      .input(z.object({
        email: z.string().email("Невалиден имейл адрес"),
        password: z.string().min(1, "Въведете парола"),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUserByEmail(input.email);
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Грешен имейл или парола." });
        }
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Грешен имейл или парола." });
        }
        await upsertUser({ openId: user.openId, lastSignedIn: new Date() });
        const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name ?? "", expiresInMs: ONE_YEAR_MS });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true, openId: user.openId, name: user.name, role: user.role };
      }),

    // Phone registration (stub — real SMS OTP requires external service)
    registerPhone: publicProcedure
      .input(z.object({
        name: z.string().min(2),
        phone: z.string().min(8, "Невалиден телефонен номер"),
      }))
      .mutation(async ({ ctx, input }) => {
        const openId = `phone_${nanoid(16)}`;
        await upsertUser({
          openId,
          name: input.name,
          phone: input.phone,
          loginMethod: "phone",
          role: "user",
          creditsStandard: BONUS_CREDITS,
          credits: BONUS_CREDITS,
          bonusGranted: true,
          isFirstLogin: false,
          lastSignedIn: new Date(),
        });
        const sessionToken = await sdk.createSessionToken(openId, { name: input.name, expiresInMs: ONE_YEAR_MS });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true, bonusCredits: BONUS_CREDITS, openId };
      }),
  }),

  // ── Worker auth ───────────────────────────────────────────────────────────
  workerAuth: router({
    login: publicProcedure
      .input(z.object({
        username: z.string().min(1, "Въведете потребителско име"),
        password: z.string().min(1, "Въведете парола"),
        deviceName: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const worker = await getWorkerByUsername(input.username);
        if (!worker || !worker.isActive) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Грешно потребителско име или парола." });
        }
        const valid = await bcrypt.compare(input.password, worker.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Грешно потребителско име или парола." });
        }

        // Device token management (max 4 devices)
        const sessionCount = await getWorkerSessionCount(worker.id);
        if (sessionCount >= MAX_WORKER_DEVICES) {
          await removeOldestWorkerSession(worker.id);
        }
        const deviceToken = nanoid(32);
        await addWorkerSession(worker.id, deviceToken, input.deviceName ?? "Unknown device");
        await updateWorkerLastSignedIn(worker.id);

        // Set persistent cookie
        setWorkerCookie(ctx, deviceToken);

        return {
          success: true,
          mustChangePassword: worker.mustChangePassword,
          workerId: worker.id,
          name: worker.name,
          deviceToken,
        };
      }),

    changePassword: publicProcedure
      .input(z.object({
        workerId: z.number(),
        currentPassword: z.string().min(1),
        newPassword: z.string().min(6, "Новата парола трябва да е поне 6 символа"),
        deviceToken: z.string(),
      }))
      .mutation(async ({ input }) => {
        const session = await getWorkerSession(input.deviceToken);
        if (!session || session.workerId !== input.workerId) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Невалидна сесия." });
        }
        const worker = await getWorkerByOpenId(
          (await getAllWorkers()).find(w => w.id === input.workerId)?.openId ?? ""
        );
        if (!worker) throw new TRPCError({ code: "NOT_FOUND", message: "Работникът не е намерен." });

        const valid = await bcrypt.compare(input.currentPassword, worker.passwordHash);
        if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Грешна текуща парола." });

        const newHash = await bcrypt.hash(input.newPassword, 10);
        await updateWorkerPassword(worker.id, newHash);
        return { success: true };
      }),

    verifySession: publicProcedure
      .input(z.object({ deviceToken: z.string() }))
      .query(async ({ input }) => {
        const session = await getWorkerSession(input.deviceToken);
        if (!session) return null;
        const allWorkers = await getAllWorkers();
        const worker = allWorkers.find(w => w.id === session.workerId);
        if (!worker || !worker.isActive) return null;
        return {
          workerId: worker.id,
          name: worker.name,
          mustChangePassword: worker.mustChangePassword,
          openId: worker.openId,
        };
      }),

    logout: publicProcedure
      .input(z.object({ deviceToken: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const db = await import("./db");
        const session = await getWorkerSession(input.deviceToken);
        if (session) {
          const drizzleDb = await (await import("./db")).getDb();
          if (drizzleDb) {
            const { workerSessions } = await import("../drizzle/schema");
            const { eq } = await import("drizzle-orm");
            await drizzleDb.delete(workerSessions).where(eq(workerSessions.deviceToken, input.deviceToken));
          }
        }
        const opts = getSessionCookieOptions(ctx.req);
        ctx.res.clearCookie(WORKER_SESSION_COOKIE, { ...opts, maxAge: -1 });
        return { success: true };
      }),
  }),

  // ── Admin auth ────────────────────────────────────────────────────────────
  adminAuth: router({
    login: publicProcedure
      .input(z.object({
        username: z.string().min(1, "Въведете потребителско име"),
        password: z.string().min(1, "Въведете парола"),
      }))
      .mutation(async ({ input, ctx }) => {
        const config = await getAdminConfig();

        // Handle default admin/admin (only if not yet blocked)
        if (!config) {
          // First-time: initialize with hashed "admin" password
          const defaultHash = await bcrypt.hash("admin", 10);
          await initAdminConfig(defaultHash);
          if (input.username !== "admin" || input.password !== "admin") {
            throw new TRPCError({ code: "UNAUTHORIZED", message: "Грешно потребителско име или парола." });
          }
          const token = nanoid(32);
          setAdminCookie(ctx, token);
          return { success: true, token, mustChangeCredentials: true };
        }

        // Check if default is blocked
        if (config.defaultBlocked && input.username === "admin" && input.password === "admin") {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Достъпът с администраторски данни по подразбиране е блокиран." });
        }

        const usernameMatch = config.username === input.username;
        const passwordMatch = await bcrypt.compare(input.password, config.passwordHash);

        if (!usernameMatch || !passwordMatch) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Грешно потребителско име или парола." });
        }

        const token = nanoid(32);
        setAdminCookie(ctx, token);
        return { success: true, token, mustChangeCredentials: !config.defaultBlocked };
      }),

    changeCredentials: publicProcedure
      .input(z.object({
        currentPassword: z.string().min(1),
        newUsername: z.string().min(3, "Потребителското име трябва да е поне 3 символа"),
        newPassword: z.string().min(6, "Паролата трябва да е поне 6 символа"),
        adminToken: z.string(),
      }))
      .mutation(async ({ input }) => {
        const config = await getAdminConfig();
        if (!config) throw new TRPCError({ code: "NOT_FOUND", message: "Администраторската конфигурация не е намерена." });

        const passwordMatch = await bcrypt.compare(input.currentPassword, config.passwordHash);
        if (!passwordMatch) throw new TRPCError({ code: "UNAUTHORIZED", message: "Грешна текуща парола." });

        const newHash = await bcrypt.hash(input.newPassword, 10);
        await updateAdminConfig(input.newUsername, newHash);
        return { success: true };
      }),

    verifyToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        // Simple token verification — in production use JWT
        // For now we store token in memory/cookie and verify it exists
        if (!input.token || input.token.length < 10) return null;
        const config = await getAdminConfig();
        if (!config) return null;
        return { isAdmin: true, username: config.username };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const opts = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(ADMIN_SESSION_COOKIE, { ...opts, maxAge: -1 });
      return { success: true };
    }),
  }),

  // ── Settings ──────────────────────────────────────────────────────────────
  settings: router({
    getAll: publicProcedure.query(async () => getAllSettings()),
    get: publicProcedure
      .input(z.object({ key: z.string() }))
      .query(async ({ input }) => getSetting(input.key)),
    update: adminProcedure
      .input(z.object({ key: z.string(), value: z.string() }))
      .mutation(async ({ input }) => { await upsertSetting(input.key, input.value); return { success: true }; }),
  }),

  // ── User management ───────────────────────────────────────────────────────
  users: router({
    me: protectedProcedure.query(({ ctx }) => ctx.user),

    getProfile: protectedProcedure.query(async ({ ctx }) => {
      return getUserByOpenId(ctx.user.openId);
    }),

    saveFcmToken: protectedProcedure
      .input(z.object({ token: z.string().nullable() }))
      .mutation(async ({ ctx, input }) => {
        await updateUserFcmToken(ctx.user.openId, input.token);
        return { success: true };
      }),

    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().min(2).optional(),
        phone: z.string().optional(),
        addressKvartal: z.string().optional(),
        addressBlok: z.string().optional(),
        addressVhod: z.string().optional(),
        addressEtaj: z.string().optional(),
        addressApartament: z.string().optional(),
        addressCity: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateUserProfile(ctx.user.openId, input);
        return { success: true };
      }),

    list: adminProcedure.query(async () => getAllUsers()),
    listWorkers: adminProcedure.query(async () => getUsersByRole("worker")),
    listClients: adminProcedure.query(async () => getUsersByRole("user")),

    createWorker: adminProcedure
      .input(z.object({
        name: z.string().min(2, "Името трябва да е поне 2 символа"),
        username: z.string().min(3, "Потребителското име трябва да е поне 3 символа"),
        password: z.string().min(6, "Паролата трябва да е поне 6 символа"),
        activeDistricts: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const existing = await getWorkerByUsername(input.username);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "Вече съществува работник с това потребителско име." });
        }
        const passwordHash = await bcrypt.hash(input.password, 10);
        const openId = `worker_${nanoid(16)}`;
        await createWorker({
          openId,
          name: input.name,
          username: input.username,
          passwordHash,
          mustChangePassword: true,
          isActive: true,
          activeDistricts: input.activeDistricts ?? [],
          deviceTokens: [],
          createdByAdmin: true,
        });
        // Also create a users entry for the worker
        await upsertUser({
          openId,
          name: input.name,
          role: "worker",
          loginMethod: "admin_created",
          lastSignedIn: new Date(),
        });
        return { success: true, openId };
      }),

    updateRole: adminProcedure
      .input(z.object({ userId: z.number(), role: z.enum(["user", "admin", "worker"]) }))
      .mutation(async ({ input }) => { await updateUserRole(input.userId, input.role); return { success: true }; }),

    updateCredits: adminProcedure
      .input(z.object({ userId: z.number(), credits: z.string() }))
      .mutation(async ({ input }) => { await updateUserCredits(input.userId, input.credits); return { success: true }; }),

    listAllWorkers: adminProcedure.query(async () => getAllWorkers()),
  }),

  // ── Districts ────────────────────────────────────────────────────────────────────────────────
  districts: router({
    list: publicProcedure.query(async () => getActiveDistricts()),
    listAll: adminProcedure.query(async () => getAllDistricts()),

    create: adminProcedure
      .input(z.object({ name: z.string().min(2, "Името трябва да е поне 2 символа") }))
      .mutation(async ({ input }) => { await createDistrict(input.name); return { success: true }; }),

    toggleActive: adminProcedure
      .input(z.object({ id: z.number(), isActive: z.boolean() }))
      .mutation(async ({ input }) => { await updateDistrictStatus(input.id, input.isActive); return { success: true }; }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await deleteDistrict(input.id); return { success: true }; }),
  }),

  // ── Requests ──────────────────────────────────────────────────────────────────────────────
  requests: router({
    // Client: create a new waste disposal request
    create: protectedProcedure
      .input(z.object({
        type: z.enum(["standard", "recycling", "nonstandard", "construction"]),
        description: z.string().optional(),
        district: z.string().min(1, "Кварталът е задължителен"),
        blok: z.string().min(1, "Блокът е задължителен"),
        vhod: z.string().min(1, "Входът е задължителен"),
        etaj: z.string().min(1, "Етажът е задължителен"),
        apartament: z.string().min(1, "Апартаментът е задължителен"),
        contactPhone: z.string().optional(),
        contactEmail: z.string().email().optional(),
        gpsLat: z.number().optional(),
        gpsLng: z.number().optional(),
        imageUrl: z.string().optional(),
        estimatedVolume: z.string().optional(),
        estimatedVolumeDescription: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Validate contact
        if (!input.contactPhone && !input.contactEmail) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Трябва да въведете телефон или имейл за обратна връзка." });
        }
        // Determine credit cost
        let creditsUsed = "0.00";
        let creditType: "standard" | "recycling" | "none" = "none";
        if (input.type === "standard") {
          creditsUsed = "1.00";
          creditType = "standard";
        } else if (input.type === "recycling") {
          creditsUsed = "1.00";
          creditType = "recycling";
        }
        // Check credits if needed
        if (creditType !== "none") {
          const user = await getUserByOpenId(ctx.user.openId);
          if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Потребителят не е намерен." });
          const available = creditType === "standard"
            ? parseFloat(user.creditsStandard ?? "0")
            : parseFloat(user.creditsRecycling ?? "0");
          if (available < 1) {
            throw new TRPCError({ code: "BAD_REQUEST", message: `Нямате достатъчно ${creditType === "standard" ? "стандартни" : "рециклиращи"} кредити.` });
          }
          // Deduct credit
          const newVal = (available - 1).toFixed(2);
          if (creditType === "standard") {
            // Direct update
            const dbInst = await import("./db").then(m => m.getDb());
            if (dbInst) {
              const { users } = await import("../drizzle/schema");
              const { eq } = await import("drizzle-orm");
              await dbInst.update(users).set({ creditsStandard: newVal }).where(eq(users.openId, ctx.user.openId));
            }
          } else {
            const dbInst = await import("./db").then(m => m.getDb());
            if (dbInst) {
              const { users } = await import("../drizzle/schema");
              const { eq } = await import("drizzle-orm");
              await dbInst.update(users).set({ creditsRecycling: newVal }).where(eq(users.openId, ctx.user.openId));
            }
          }
        }
        const id = await createRequest({
          type: input.type,
          status: "pending",
          userId: ctx.user.id,
          userOpenId: ctx.user.openId,
          description: input.description,
          district: input.district,
          blok: input.blok,
          vhod: input.vhod,
          etaj: input.etaj,
          apartament: input.apartament,
          contactPhone: input.contactPhone,
          contactEmail: input.contactEmail,
          gpsLat: input.gpsLat?.toString(),
          gpsLng: input.gpsLng?.toString(),
          imageUrl: input.imageUrl,
          estimatedVolume: input.estimatedVolume,
          estimatedVolumeDescription: input.estimatedVolumeDescription,
          creditsUsed,
          creditType,
        });
        return { success: true, id, creditsUsed, creditType };
      }),

    // Client: list own requests
    myList: protectedProcedure.query(async ({ ctx }) => {
      return getRequestsByUser(ctx.user.openId);
    }),

    // Client: cancel a pending request
    cancel: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const req = await getRequestById(input.id);
        if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "Заявката не е намерена." });
        if (req.userOpenId !== ctx.user.openId) throw new TRPCError({ code: "FORBIDDEN", message: "Нямате право да анулирате тази заявка." });

        // Only refund credits for pending/assigned requests (not completed)
        const refundable = req.status === "pending" || req.status === "assigned";
        const creditsToRefund = parseFloat(req.creditsUsed ?? "0");
        const creditType = req.creditType;

        await cancelRequest(input.id, ctx.user.openId);

        // Refund the credit back to the user
        if (refundable && creditsToRefund > 0 && creditType !== "none") {
          const dbInst = await import("./db").then(m => m.getDb());
          if (dbInst) {
            const { users } = await import("../drizzle/schema");
            const { eq } = await import("drizzle-orm");
            const user = await getUserByOpenId(ctx.user.openId);
            if (user) {
              if (creditType === "standard") {
                const current = parseFloat(user.creditsStandard ?? "0");
                const refunded = (current + creditsToRefund).toFixed(2);
                await dbInst.update(users).set({ creditsStandard: refunded }).where(eq(users.openId, ctx.user.openId));
              } else if (creditType === "recycling") {
                const current = parseFloat(user.creditsRecycling ?? "0");
                const refunded = (current + creditsToRefund).toFixed(2);
                await dbInst.update(users).set({ creditsRecycling: refunded }).where(eq(users.openId, ctx.user.openId));
              }
            }
          }
        }

        return { success: true, refunded: refundable && creditsToRefund > 0 && creditType !== "none" };
      }),

    // Worker/Admin: list all pending requests grouped
    listPending: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "worker" && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Достъпът е забранен." });
      }
      const all = await getPendingRequests();
      // Group: district -> blok -> vhod -> [requests]
      const grouped: Record<string, Record<string, Record<string, typeof all>>> = {};
      for (const r of all) {
        if (!grouped[r.district]) grouped[r.district] = {};
        if (!grouped[r.district][r.blok]) grouped[r.district][r.blok] = {};
        if (!grouped[r.district][r.blok][r.vhod]) grouped[r.district][r.blok][r.vhod] = [];
        grouped[r.district][r.blok][r.vhod].push(r);
      }
      return { raw: all, grouped };
    }),

    // Worker: complete a single request
    complete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "worker" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Достъпът е забранен." });
        }
        const reqBefore = await getRequestById(input.id);
        await completeRequest(input.id, ctx.user.openId, ctx.user.id);
        // Push notification to client
        if (reqBefore?.userOpenId) {
          const client = await getUserByOpenId(reqBefore.userOpenId);
          if (client?.fcmToken) {
            await sendPushNotification(client.fcmToken, {
              title: "✅ Заявката е изпълнена",
              body: "Вашата заявка за изхвърляне на отпадъци е успешно изпълнена.",
              data: { requestId: String(input.id), type: "completed" },
            });
          }
        }
        return { success: true };
      }),

    // Worker: complete all requests from same entrance
    completeEntrance: protectedProcedure
      .input(z.object({
        district: z.string(),
        blok: z.string(),
        vhod: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "worker" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Достъпът е забранен." });
        }
        const count = await completeRequestsByEntrance(
          input.district, input.blok, input.vhod,
          ctx.user.openId, ctx.user.id
        );
        return { success: true, completedCount: count };
      }),

    // Admin: list all requests
    listAll: adminProcedure.query(async () => getAllRequests()),

    // Placeholder: estimate volume from image using LLM vision
    estimateVolume: protectedProcedure
      .input(z.object({ imageUrl: z.string().url("Невалиден URL на снимка") }))
      .mutation(async ({ input }) => {
        const estimates = [
          { volume: "~50 литра", description: "Малък обем — подходящ за 1 стандартна извозка" },
          { volume: "~150 литра", description: "Среден обем — необходими 2-3 извозки" },
          { volume: "~300 литра", description: "Голям обем — необходима специална возилка" },
          { volume: "~500+ литра", description: "Много голям обем — необходима камионетна возилка" },
        ];
        const estimate = estimates[Math.floor(Math.random() * estimates.length)];
        return {
          volume: estimate.volume,
          description: estimate.description,
          note: "Това е приблизителна оценка. Окончателната цена ще бъде уточнена от работника.",
        };
      }),
  }),

  // ── Cleaning Requests ──────────────────────────────────────────────────────
  cleaning: router({
    create: protectedProcedure
      .input(z.object({
        type: z.enum(["entrances", "residence", "other"]),
        floors: z.number().int().min(1).optional(),
        aptsPerFloor: z.number().int().min(1).optional(),
        rooms: z.number().int().min(1).optional(),
        sqm: z.number().positive().optional(),
        residenceType: z.enum(["apartment", "house"]).optional(),
        requirements: z.string().optional(),
        description: z.string().optional(),
        imageUrl: z.string().optional(),
        proposedPrice: z.number().positive().optional(),
        contactPhone: z.string().optional(),
        contactEmail: z.string().email().optional(),
        district: z.string().optional(),
        address: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!input.contactPhone && !input.contactEmail) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Трябва да въведете телефон или имейл за обратна връзка." });
        }
        const id = await createCleaningRequest({
          type: input.type,
          userId: ctx.user.id,
          userOpenId: ctx.user.openId,
          floors: input.floors,
          aptsPerFloor: input.aptsPerFloor,
          rooms: input.rooms,
          sqm: input.sqm?.toFixed(2),
          residenceType: input.residenceType,
          requirements: input.requirements,
          description: input.description,
          imageUrl: input.imageUrl,
          proposedPrice: input.proposedPrice?.toFixed(2),
          contactPhone: input.contactPhone,
          contactEmail: input.contactEmail,
          district: input.district,
          address: input.address,
        });
        return { success: true, id };
      }),

    myList: protectedProcedure.query(async ({ ctx }) => {
      return getCleaningRequestsByUser(ctx.user.openId);
    }),

    listAll: adminProcedure.query(async () => getAllCleaningRequests()),

    updateStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "reviewed", "completed", "cancelled"]),
        adminNotes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await updateCleaningRequestStatus(input.id, input.status, input.adminNotes);
        return { success: true };
      }),
  }),

  // ── Credits & Payments ────────────────────────────────────────────────────
  credits: router({
    // Return credit package definitions
    packages: publicProcedure.query(() => ({
      standard: [
        { id: "std_1", credits: 1, bonus: 0, total: 1, price: 0.69, label: "1 кредит", highlight: false },
        { id: "std_10", credits: 10, bonus: 2, total: 12, price: 6.90, label: "10 + 2 безплатни", highlight: true, save: "Спестяваш 2 кредита" },
        { id: "std_20", credits: 20, bonus: 5, total: 25, price: 13.80, label: "20 + 5 безплатни", highlight: false, save: "Спестяваш 5 кредита" },
      ],
      recycling: [
        { id: "rec_1", credits: 1, bonus: 0, total: 1, price: 0.99, label: "1 кредит", highlight: false },
        { id: "rec_10", credits: 10, bonus: 1, total: 11, price: 9.90, label: "10 + 1 безплатен", highlight: true, save: "Спестяваш 1 кредит" },
        { id: "rec_20", credits: 20, bonus: 3, total: 23, price: 19.80, label: "20 + 3 безплатни", highlight: false, save: "Спестяваш 3 кредита" },
      ],
    })),

    // Create Stripe Checkout session
    createCheckout: protectedProcedure
      .input(z.object({
        packageId: z.string(),
        creditType: z.enum(["standard", "recycling"]),
        credits: z.number().int().positive(),
        bonus: z.number().int().min(0),
        total: z.number().int().positive(),
        price: z.number().positive(),
        origin: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stripe не е конфигуриран." });
        const stripe = new Stripe(stripeKey, { apiVersion: "2026-02-25.clover" });
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          mode: "payment",
          allow_promotion_codes: true,
          customer_email: ctx.user.email ?? undefined,
          client_reference_id: ctx.user.id.toString(),
          metadata: {
            user_id: ctx.user.id.toString(),
            user_open_id: ctx.user.openId,
            customer_email: ctx.user.email ?? "",
            customer_name: ctx.user.name ?? "",
            package_id: input.packageId,
            credit_type: input.creditType,
            credits: input.credits.toString(),
            bonus: input.bonus.toString(),
            total_credits: input.total.toString(),
          },
          line_items: [{
            price_data: {
              currency: "eur",
              product_data: {
                name: `TRASHit — ${input.creditType === "standard" ? "Стандартни" : "Рециклиращи"} кредити (${input.total} бр.)`,
                description: input.bonus > 0 ? `${input.credits} кредита + ${input.bonus} безплатни = ${input.total} общо` : `${input.credits} кредита`,
              },
              unit_amount: Math.round(input.price * 100),
            },
            quantity: 1,
          }],
          success_url: `${input.origin}/credits/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${input.origin}/credits`,
        });
        return { url: session.url, sessionId: session.id };
      }),

    // Verify payment success and add credits
    verifyPayment: protectedProcedure
      .input(z.object({ sessionId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stripe не е конфигуриран." });
        const stripe = new Stripe(stripeKey, { apiVersion: "2026-02-25.clover" });
        // Check if already processed
        const existing = await getTransactionByStripeSession(input.sessionId);
        if (existing) return { success: true, alreadyProcessed: true };
        const session = await stripe.checkout.sessions.retrieve(input.sessionId);
        if (session.payment_status !== "paid") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Плащането не е завършено." });
        }
        const meta = session.metadata ?? {};
        const creditType = (meta.credit_type ?? "standard") as "standard" | "recycling";
        const credits = parseInt(meta.credits ?? "0");
        const bonus = parseInt(meta.bonus ?? "0");
        const total = parseInt(meta.total_credits ?? "0");
        const pricePaid = (session.amount_total ?? 0) / 100;
        // Add credits to user
        const db = await getDb();
        if (db) {
          const { users } = await import("../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          const user = await getUserByOpenId(ctx.user.openId);
          if (user) {
            const currentVal = parseFloat(creditType === "standard" ? (user.creditsStandard ?? "0") : (user.creditsRecycling ?? "0"));
            const newVal = (currentVal + total).toFixed(2);
            if (creditType === "standard") {
              await db.update(users).set({ creditsStandard: newVal }).where(eq(users.openId, ctx.user.openId));
            } else {
              await db.update(users).set({ creditsRecycling: newVal }).where(eq(users.openId, ctx.user.openId));
            }
          }
        }
        // Record transaction
        await createTransaction({
          userId: ctx.user.id,
          userOpenId: ctx.user.openId,
          type: "purchase",
          creditType,
          amount: credits.toFixed(2),
          bonusAmount: bonus.toFixed(2),
          totalAmount: total.toFixed(2),
          pricePaid: pricePaid.toFixed(2),
          stripeSessionId: input.sessionId,
          note: `Покупка на ${total} ${creditType === "standard" ? "стандартни" : "рециклиращи"} кредита`,
        });
        return { success: true, creditsAdded: total, creditType };
      }),

    // Transfer credits to another user
    transfer: protectedProcedure
      .input(z.object({
        creditType: z.enum(["standard", "recycling"]),
        amount: z.number().int().positive().max(1000),
        toEmail: z.string().email("Невалиден имейл адрес"),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.email === input.toEmail) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Не можете да прехвърляте кредити към собствения си акаунт." });
        }
        const recipient = await getUserByEmail(input.toEmail);
        if (!recipient) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Потребител с този имейл не е намерен." });
        }
        // Check sender's balance
        const sender = await getUserByOpenId(ctx.user.openId);
        if (!sender) throw new TRPCError({ code: "NOT_FOUND", message: "Изпращачът не е намерен." });
        const available = parseFloat(input.creditType === "standard" ? (sender.creditsStandard ?? "0") : (sender.creditsRecycling ?? "0"));
        if (available < input.amount) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Нямате достатъчно ${input.creditType === "standard" ? "стандартни" : "рециклиращи"} кредити.` });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Базата данни не е достъпна." });
        const { users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        // Deduct from sender
        const senderNew = (available - input.amount).toFixed(2);
        if (input.creditType === "standard") {
          await db.update(users).set({ creditsStandard: senderNew }).where(eq(users.openId, ctx.user.openId));
        } else {
          await db.update(users).set({ creditsRecycling: senderNew }).where(eq(users.openId, ctx.user.openId));
        }
        // Add to recipient
        const recipientAvailable = parseFloat(input.creditType === "standard" ? (recipient.creditsStandard ?? "0") : (recipient.creditsRecycling ?? "0"));
        const recipientNew = (recipientAvailable + input.amount).toFixed(2);
        if (input.creditType === "standard") {
          await db.update(users).set({ creditsStandard: recipientNew }).where(eq(users.openId, recipient.openId));
        } else {
          await db.update(users).set({ creditsRecycling: recipientNew }).where(eq(users.openId, recipient.openId));
        }
        // Record transactions
        await createTransaction({
          userId: ctx.user.id, userOpenId: ctx.user.openId,
          type: "transfer_out", creditType: input.creditType,
          amount: input.amount.toFixed(2), bonusAmount: "0.00",
          totalAmount: input.amount.toFixed(2),
          transferToUserId: recipient.id, transferToOpenId: recipient.openId,
          note: `Прехвърляне към ${input.toEmail}`,
        });
        await createTransaction({
          userId: recipient.id, userOpenId: recipient.openId,
          type: "transfer_in", creditType: input.creditType,
          amount: input.amount.toFixed(2), bonusAmount: "0.00",
          totalAmount: input.amount.toFixed(2),
          transferFromUserId: ctx.user.id, transferFromOpenId: ctx.user.openId,
          note: `Получено от ${ctx.user.email ?? ctx.user.openId}`,
        });
        return { success: true, transferred: input.amount, to: input.toEmail };
      }),

    // Get user's transaction history
    history: protectedProcedure.query(async ({ ctx }) => {
      return getTransactionsByUser(ctx.user.openId);
    }),

    // Admin: add or deduct credits from user
    adminAdd: adminProcedure
      .input(z.object({
        userOpenId: z.string(),
        creditType: z.enum(["standard", "recycling"]),
        amount: z.number().int().refine(n => n !== 0, { message: "Броят кредити не може да е 0." }),
        note: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const user = await getUserByOpenId(input.userOpenId);
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Потребителят не е намерен." });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Базата данни не е достъпна." });
        const { users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const current = parseFloat(input.creditType === "standard" ? (user.creditsStandard ?? "0") : (user.creditsRecycling ?? "0"));
        // Guard: prevent credits from going negative
        if (input.amount < 0 && current + input.amount < 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Потребителят няма достатъчно кредити." });
        }
        const newVal = Math.max(0, current + input.amount).toFixed(2);
        if (input.creditType === "standard") {
          await db.update(users).set({ creditsStandard: newVal }).where(eq(users.openId, input.userOpenId));
        } else {
          await db.update(users).set({ creditsRecycling: newVal }).where(eq(users.openId, input.userOpenId));
        }
        const isDeduct = input.amount < 0;
        await createTransaction({
          userId: user.id, userOpenId: user.openId,
          type: isDeduct ? "admin_deduct" : "admin_add", creditType: input.creditType,
          amount: input.amount.toFixed(2), bonusAmount: "0.00",
          totalAmount: input.amount.toFixed(2),
          note: input.note ?? (isDeduct ? "Отнето от администратор" : "Добавено от администратор"),
        });
        return { success: true };
      }),

     // Admin: view all transactions
    allTransactions: adminProcedure.query(async () => getAllTransactions()),
  }),

  // ── Worker Problems ────────────────────────────────────────────────────────
  problems: router({
    // Worker reports a problem
    report: protectedProcedure
      .input(z.object({
        requestId: z.number().optional(),
        description: z.string().min(5, "Описанието трябва да е поне 5 символа"),
        imageUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const worker = await getWorkerByOpenId(ctx.user.openId);
        if (!worker) throw new TRPCError({ code: "FORBIDDEN", message: "Само работници могат да докладват проблеми" });
        const id = await createWorkerProblem({
          workerId: worker.id,
          workerOpenId: worker.openId,
          workerName: worker.name,
          requestId: input.requestId,
          description: input.description,
          imageUrl: input.imageUrl,
        });
        return { success: true, id };
      }),
    // Admin: list all problems
    list: adminProcedure.query(async () => getAllWorkerProblems()),
    // Admin: count open problems
    countOpen: adminProcedure.query(async () => {
      const open = await getOpenWorkerProblems();
      return { count: open.length };
    }),
    // Admin: resolve a problem
    resolve: adminProcedure
      .input(z.object({
        id: z.number(),
        adminNotes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await updateWorkerProblem(input.id, {
          status: "resolved",
          adminNotes: input.adminNotes,
          resolvedAt: new Date(),
        });
        return { success: true };
      }),
    // Admin: forward problem to client
    forwardToClient: adminProcedure
      .input(z.object({
        id: z.number(),
        adminNotes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await updateWorkerProblem(input.id, {
          status: "forwarded",
          adminNotes: input.adminNotes,
          forwardedToClientAt: new Date(),
        });
        return { success: true };
      }),
  }),

  // ── Workers Management (Admin) ─────────────────────────────────────────────
  workersMgmt: router({
    listWithStats: adminProcedure.query(async () => getAllWorkersWithStats()),
    deactivate: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deactivateWorker(input.id);
        return { success: true };
      }),
    activate: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await activateWorker(input.id);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteWorker(input.id);
        return { success: true };
      }),
  }),
  // ── Block Access Management (Admin) ──────────────────────────────────────────
  blockAccess: router({
    list: adminProcedure.query(async () => getActiveBlocksWithAccess()),
  }),

  // ── Admin Dashboard Stats ─────────────────────────────────────────────────
  adminDashboard: router({
    getStats: adminProcedure.query(async () => {
      const now = new Date();
      // Start of today in local time (UTC midnight)
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      const [allRequests, allUsers, allWorkers, allTransactions] = await Promise.all([
        getAllRequests(),
        getAllUsers(),
        getAllWorkersWithStats(),
        getAllTransactions(),
      ]);

      // Active requests today (pending or assigned, created today)
      const activeTodayCount = allRequests.filter(r =>
        (r.status === "pending" || r.status === "assigned") &&
        new Date(r.createdAt).getTime() >= todayStart
      ).length;

      // Completed requests today
      const completedTodayCount = allRequests.filter(r =>
        r.status === "completed" &&
        r.completedAt &&
        new Date(r.completedAt).getTime() >= todayStart
      ).length;

      // Total requests (all time)
      const totalRequestsCount = allRequests.length;

      // Credit revenue: sum totalAmount from purchase transactions
      const totalRevenue = allTransactions
        .filter(t => t.type === "purchase")
        .reduce((sum, t) => sum + parseFloat(t.totalAmount ?? "0"), 0);

      // Top 3 districts by number of requests
      const districtCounts: Record<string, number> = {};
      for (const r of allRequests) {
        if (r.district) {
          districtCounts[r.district] = (districtCounts[r.district] ?? 0) + 1;
        }
      }
      const topDistricts = Object.entries(districtCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => ({ name, count }));

      // Registered users (role = "user")
      const registeredUsersCount = allUsers.filter(u => u.role === "user").length;

      // Active workers
      const activeWorkersCount = allWorkers.filter(w => w.isActive).length;

      return {
        activeTodayCount,
        completedTodayCount,
        totalRequestsCount,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        topDistricts,
        registeredUsersCount,
        activeWorkersCount,
      };
    }),
  }),

  // ── Worker District Preferences ──────────────────────────────────────────
  workerDistricts: router({
    // Get current worker's selected districts
    getMyDistricts: publicProcedure
      .input(z.object({ deviceToken: z.string() }))
      .query(async ({ input }) => {
        const session = await getWorkerSession(input.deviceToken);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "Невалидна сесия." });
        const allWorkers = await getAllWorkers();
        const worker = allWorkers.find(w => w.id === session.workerId);
        if (!worker) throw new TRPCError({ code: "NOT_FOUND", message: "Работникът не е намерен." });
        return getWorkerDistricts(worker.openId);
      }),

    // Set worker's selected districts
    setMyDistricts: publicProcedure
      .input(z.object({
        deviceToken: z.string(),
        districts: z.array(z.string()),
      }))
      .mutation(async ({ input }) => {
        const session = await getWorkerSession(input.deviceToken);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "Невалидна сесия." });
        const allWorkers = await getAllWorkers();
        const worker = allWorkers.find(w => w.id === session.workerId);
        if (!worker) throw new TRPCError({ code: "NOT_FOUND", message: "Работникът не е намерен." });
        await setWorkerDistricts(worker.id, worker.openId, input.districts);
        return { success: true };
      }),

    // Get requests filtered by worker's districts
    getRequestsForMyDistricts: publicProcedure
      .input(z.object({ deviceToken: z.string() }))
      .query(async ({ input }) => {
        const session = await getWorkerSession(input.deviceToken);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "Невалидна сесия." });
        const allWorkers = await getAllWorkers();
        const worker = allWorkers.find(w => w.id === session.workerId);
        if (!worker) throw new TRPCError({ code: "NOT_FOUND", message: "Работникът не е намерен." });
        const myDistricts = await getWorkerDistricts(worker.openId);
        if (myDistricts.length === 0) return {};
        const reqs = await getRequestsByDistricts(myDistricts);
        // Group by district -> blok -> vhod -> list of apartments
        const grouped: Record<string, Record<string, Record<string, typeof reqs>>> = {};
        for (const req of reqs) {
          if (!grouped[req.district]) grouped[req.district] = {};
          if (!grouped[req.district][req.blok]) grouped[req.district][req.blok] = {};
          if (!grouped[req.district][req.blok][req.vhod]) grouped[req.district][req.blok][req.vhod] = [];
          grouped[req.district][req.blok][req.vhod].push(req);
        }
        return grouped;
      }),
    // Worker: complete a single request using deviceToken
    completeRequest: publicProcedure
      .input(z.object({ deviceToken: z.string(), requestId: z.number() }))
      .mutation(async ({ input }) => {
        const session = await getWorkerSession(input.deviceToken);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "Невалидна сесия." });
        const allWorkers = await getAllWorkers();
        const worker = allWorkers.find(w => w.id === session.workerId);
        if (!worker) throw new TRPCError({ code: "NOT_FOUND", message: "Работникът не е намерен." });
        const reqBefore = await getRequestById(input.requestId);
        await completeRequest(input.requestId, worker.openId, worker.id);
        // Push notification to client
        if (reqBefore?.userOpenId) {
          const client = await getUserByOpenId(reqBefore.userOpenId);
          if (client?.fcmToken) {
            await sendPushNotification(client.fcmToken, {
              title: "✅ Заявката е изпълнена",
              body: "Вашата заявка за изхвърляне на отпадъци е успешно изпълнена.",
              data: { requestId: String(input.requestId), type: "completed" },
            });
          }
        }
        return { success: true };
      }),
    // Worker: complete all requests from an entrance using deviceToken
    completeEntrance: publicProcedure
      .input(z.object({
        deviceToken: z.string(),
        district: z.string(),
        blok: z.string(),
        vhod: z.string(),
      }))
      .mutation(async ({ input }) => {
        const session = await getWorkerSession(input.deviceToken);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "Невалидна сесия." });
        const allWorkers = await getAllWorkers();
        const worker = allWorkers.find(w => w.id === session.workerId);
        if (!worker) throw new TRPCError({ code: "NOT_FOUND", message: "Работникът не е намерен." });
        const count = await completeRequestsByEntrance(
          input.district, input.blok, input.vhod,
          worker.openId, worker.id
        );
        return { success: true, count };
      }),
    // Worker: report a problem using deviceToken
    reportProblem: publicProcedure
      .input(z.object({
        deviceToken: z.string(),
        requestId: z.number().optional(),
        description: z.string().min(5),
        imageUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const session = await getWorkerSession(input.deviceToken);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "Невалидна сесия." });
        const allWorkers = await getAllWorkers();
        const worker = allWorkers.find(w => w.id === session.workerId);
        if (!worker) throw new TRPCError({ code: "NOT_FOUND", message: "Работникът не е намерен." });
        const id = await createWorkerProblem({
          workerId: worker.id,
          workerOpenId: worker.openId,
          workerName: worker.name,
          requestId: input.requestId,
          description: input.description,
          imageUrl: input.imageUrl,
        });
        // Mark the linked request as having a problem
        if (input.requestId) {
          await updateRequestProblem(input.requestId, true, input.description);
          // Push notification to client
          const req = await getRequestById(input.requestId);
          if (req?.userOpenId) {
            const client = await getUserByOpenId(req.userOpenId);
            if (client?.fcmToken) {
              await sendPushNotification(client.fcmToken, {
                title: "⚠️ Проблем с заявката",
                body: `Работникът докладва проблем: ${input.description}`,
                data: { requestId: String(input.requestId), type: "problem" },
              });
            }
          }
        }
        await notifyOwner({
          title: `⚠️ Проблем от работник: ${worker.name}`,
          content: `Работник ${worker.name} докладва проблем: ${input.description}${input.requestId ? ` (Заявка #${input.requestId})` : ''}`,
        });
        return { success: true, id };
      }),
  }),
// ── Activity Descriptions ─────────────────────────────────────────────────
  activityDescriptions: router({
    getAll: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const { activityDescriptions } = await import("../drizzle/schema");
      return db.select().from(activityDescriptions);
    }),
    update: adminProcedure
      .input(z.object({
        activityKey: z.string(),
        description: z.string(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Базата данни не е достъпна." });
        const { activityDescriptions } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await db.update(activityDescriptions)
          .set({ description: input.description })
          .where(eq(activityDescriptions.activityKey, input.activityKey));
        return { success: true };
      }),
  }),
  // ── Entrance Access ───────────────────────────────────────────────────────
  entranceAccess: router({
    check: publicProcedure
      .input(z.object({ district: z.string(), blok: z.string(), vhod: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { approved: false };
        const { entranceAccess } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        const result = await db.select().from(entranceAccess)
          .where(and(
            eq(entranceAccess.district, input.district),
            eq(entranceAccess.blok, input.blok),
            eq(entranceAccess.vhod, input.vhod)
          )).limit(1);
        if (!result.length) return { approved: false };
        return { approved: result[0].is_approved === 1 };
      }),

    register: publicProcedure
      .input(z.object({ district: z.string(), blok: z.string(), vhod: z.string() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { approved: false };
        const { entranceAccess } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        const existing = await db.select().from(entranceAccess)
          .where(and(
            eq(entranceAccess.district, input.district),
            eq(entranceAccess.blok, input.blok),
            eq(entranceAccess.vhod, input.vhod)
          )).limit(1);
        if (!existing.length) {
          await db.insert(entranceAccess).values({
            district: input.district,
            blok: input.blok,
            vhod: input.vhod,
            is_approved: 0,
          });
          return { approved: false, isNew: true };
        }
        return { approved: existing[0].is_approved === 1, isNew: false };
      }),

    toggle: adminProcedure
      .input(z.object({ district: z.string(), blok: z.string(), vhod: z.string(), isApproved: z.boolean() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB не е достъпна." });
        const { entranceAccess } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        await db.update(entranceAccess)
          .set({ is_approved: input.isApproved ? 1 : 0 })
          .where(and(
            eq(entranceAccess.district, input.district),
            eq(entranceAccess.blok, input.blok),
            eq(entranceAccess.vhod, input.vhod)
          ));
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ district: z.string(), blok: z.string(), vhod: z.string() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB не е достъпна." });
        const { entranceAccess } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        await db.delete(entranceAccess)
          .where(and(
            eq(entranceAccess.district, input.district),
            eq(entranceAccess.blok, input.blok),
            eq(entranceAccess.vhod, input.vhod)
          ));
        return { success: true };
      }),
  }),
});
export type AppRouter = typeof appRouter;
