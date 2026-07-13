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
import { sendWebPush, sendWebPushToMany } from "./webpush";
import { sendTelegramMessage, TELEGRAM_CHATS } from "./telegram";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc"; // protectedProcedure used for worker/user procedures
import Stripe from "stripe";
import {
  getAllSettings, getAllUsers, getAllWorkers,
  getAdminConfig, getUserByEmail, getUserByOpenId,
  getUsersByRole, getSetting, getWorkerByOpenId,
  getWorkerByUsername, getWorkerSession, getWorkerSessionCount,
  addWorkerSession, removeOldestWorkerSession,
  initAdminConfig, updateAdminConfig, updateAdminTokenHash,
  updateUserCredits, updateUserFcmToken, updateUserProfile, updateUserRole,
  updateWorkerLastSignedIn, updateWorkerPassword,
  upsertSetting, upsertUser, createWorker,
  // Districts
  getAllDistricts, getActiveDistricts, createDistrict,
  updateDistrictStatus, deleteDistrict,
  // Requests
  createRequest, getRequestsByUser, getAllRequests,
  getPendingRequests, getRequestById,
  completeRequest, completeRequestPendingPayment, completeRequestsByEntrance, cancelRequest, updateRequestProblem, updateRequestStatus,
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
  // Worker Quotes
  createWorkerQuote, getQuotesByRequest, getQuoteById, updateQuoteStatus, getAcceptedQuoteForRequest,
  getPendingQuoteForRequest, updateWorkerPhoto,
  // Activity Descriptions
  getAllActivityDescriptions, upsertActivityDescription,
  // Entrance Access
  getAllEntranceAccess, upsertEntranceAccess, checkEntranceApproved, deleteEntranceAccess, getEntranceAccess,
  // FCM Diagnostics
  getFirstUserWithFcmToken,
  // Worker FCM
  updateWorkerFcmToken,
  // Sub-Admins
  createSubAdmin, getAllSubAdmins, getSubAdminByUsername, getSubAdminById,
  updateSubAdminPermissions, toggleSubAdminActive, deleteSubAdmin,
  // Subscriptions
  createSubscription, getSubscriptionsByUser, getActiveSubscriptionByUser,
  getAllSubscriptions, updateSubscriptionStripe, cancelSubscription,
  getSubscriptionByStripeId, getTodayVisitsBySlot, markVisitCompleted,
  createDailyVisitsForSubscription, getWorkerSubscriptionPref, setWorkerSubscriptionPref,
  getSubscriptionById,
  // Request Messages
  getMessagesByRequestId, addRequestMessage,
  // Web Push
  // Web Push
  savePushSubscription, getPushSubscriptionsByOwner, getPushSubscriptionsByOwnerType,
  deletePushSubscription, getFirstPushSubscriptionByType,
  // Admin Quote Edit
  adminEditQuote,
  // Worker Assignments
  claimEntrance, unclaimEntrance, getWorkerAssignments, getAllAssignments, getAssignmentByEntrance,
  getWorkerCompletedCount, getWorkerDailyStats,
} from "./db";

const BONUS_CREDITS = "2.00";
const MAX_WORKER_DEVICES = 4;
const WORKER_SESSION_COOKIE = "trashit_worker_session";
const ADMIN_SESSION_COOKIE = "trashit_admin_session";

// ─── In-memory rate limiters ──────────────────────────────────────────────────
/** requests.create: max 15 per IP per hour */
const createRequestRateLimit = new Map<string, { count: number; windowStart: number }>();
const CREATE_REQUEST_MAX    = 15;
const CREATE_REQUEST_WINDOW = 60 * 60 * 1000; // 1 hour in ms

/** requests.estimateVolume: max 10 per user per 24 h */
const estimateVolumeRateLimit = new Map<string, { count: number; windowStart: number }>();
const ESTIMATE_MAX    = 10;
const ESTIMATE_WINDOW = 24 * 60 * 60 * 1000; // 24 hours in ms

function checkRateLimit(
  store: Map<string, { count: number; windowStart: number }>,
  key: string,
  max: number,
  windowMs: number,
  errorMessage: string,
): void {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now - entry.windowStart > windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return;
  }
  entry.count += 1;
  if (entry.count > max) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: errorMessage });
  }
}

// ─── Admin-only middleware ────────────────────────────────────────────────────
// Admin uses custom username/password auth (not Manus OAuth).
// We verify the admin session cookie against the bcrypt hash stored in the DB.
const adminProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const cookies = parseCookies(ctx.req.headers.cookie ?? "");
  const adminToken = cookies[ADMIN_SESSION_COOKIE];
  if (!adminToken || adminToken.length < 10) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Необходим е администраторски вход." });
  }
  // Validate token against DB-stored bcrypt hash
  const config = await getAdminConfig();
  if (!config?.activeTokenHash) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Необходим е администраторски вход." });
  }
  const valid = await bcrypt.compare(adminToken, config.activeTokenHash);
  if (!valid) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Невалидна или изтекла сесия." });
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

    

    saveFcmToken: publicProcedure
      .input(z.object({
        deviceToken: z.string().min(1),
        fcmToken: z.string().min(10),
      }))
      .mutation(async ({ input }) => {
        const session = await getWorkerSession(input.deviceToken);
        if (!session) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Невалидна сесия." });
        }
        await updateWorkerFcmToken(session.workerId, input.fcmToken);
        console.log("[FCM] Worker token saved for workerId:", session.workerId, input.fcmToken.substring(0, 20) + "...");
        return { success: true };
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
          const tokenHash = await bcrypt.hash(token, 10);
          await updateAdminTokenHash(tokenHash);
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
        const tokenHash = await bcrypt.hash(token, 10);
        await updateAdminTokenHash(tokenHash);
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
        if (!input.token || input.token.length < 10) return null;
        const config = await getAdminConfig();
        if (!config?.activeTokenHash) return null;
        // Verify the provided token against the stored bcrypt hash
        const valid = await bcrypt.compare(input.token, config.activeTokenHash);
        if (!valid) return null;
        return { isAdmin: true, username: config.username };
      }),

    logout: publicProcedure.mutation(async ({ ctx }) => {
      const opts = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(ADMIN_SESSION_COOKIE, { ...opts, maxAge: -1 });
      // Invalidate the stored token hash so the session cannot be reused
      await updateAdminTokenHash(null);
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
       resetClientPassword: adminProcedure
  .input(z.object({ userOpenId: z.string(), newPassword: z.string().min(6, "Паролата трябва да е поне 6 символа") }))
  .mutation(async ({ input }) => {
    const user = await getUserByOpenId(input.userOpenId);
    if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Потребителят не е намерен." });
    const passwordHash = await bcrypt.hash(input.newPassword, 10);
    await upsertUser({ openId: input.userOpenId, passwordHash });
    return { success: true };
  }),


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
        // Rate limit: max 15 requests per IP per hour
        const ip = (ctx.req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0].trim()
          ?? ctx.req.socket?.remoteAddress
          ?? "unknown";
        checkRateLimit(
          createRequestRateLimit,
          ip,
          CREATE_REQUEST_MAX,
          CREATE_REQUEST_WINDOW,
          "Твърде много заявки. Опитайте след малко.",
        );
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
        // Telegram: notify new request channel
        sendTelegramMessage(TELEGRAM_CHATS.requests,
          `📦 <b>Нова заявка #${id}</b>\nТип: ${input.type}\nАдрес: ${input.district}, Бл. ${input.blok}, Вх. ${input.vhod}${input.description ? `\nОписание: ${input.description}` : ""}`
        ).catch(() => {});
         // Notify workers in the same district
        try {
          const allWorkers = await getAllWorkers();
          for (const worker of allWorkers) {
            if (!worker.isActive || !worker.fcmToken) continue;
            const workerDists = await getWorkerDistricts(worker.openId);
            if (workerDists.includes(input.district)) {
              await sendPushNotification(worker.fcmToken, {
                title: "📦 Нова заявка",
                body: `Нова заявка в ${input.district}, Бл. ${input.blok}, Вх. ${input.vhod}`,
                data: { type: "new_request", requestId: String(id), district: input.district },
              }).catch(() => {});
            }
          }
        } catch { /* ignore FCM errors */ }
        // Web Push при нова заявка
        try {
          const allWorkersWP = await getAllWorkers();
          for (const worker of allWorkersWP) {
            if (!worker.isActive) continue;
            const workerDists = await getWorkerDistricts(worker.openId);
            if (workerDists.includes(input.district)) {
              const workerSubs = await getPushSubscriptionsByOwner(String(worker.id));
              for (const sub of workerSubs) {
                sendWebPush(
                  { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                  { title: "📦 Нова заявка", body: `Нова заявка в ${input.district}`, url: "/worker" }
                ).catch(() => {});
              }
            }
          }
        } catch { /* ignore WebPush errors */ }
        return { success: true, id, creditsUsed, creditType };
      }),
    // Client: list own requests
    myList: protectedProcedure.query(async ({ ctx }) => {
      const reqs = await getRequestsByUser(ctx.user.openId);
      // Attach worker photo/name for assigned requests
      const allWorkers = await getAllWorkers();
      // Attach accepted quote proposed date for assigned requests
      const enriched = await Promise.all(reqs.map(async r => {
        const worker = r.workerOpenId ? allWorkers.find(w => w.openId === r.workerOpenId) : null;
        let acceptedQuoteProposedDate: string | null = null;
        let acceptedQuotePrice: string | null = null;
        if (r.status === "assigned" || r.status === "pending_payment" || r.status === "paid") {
          const acceptedQuote = await getAcceptedQuoteForRequest(r.id);
          acceptedQuoteProposedDate = acceptedQuote?.proposedDate ?? null;
          acceptedQuotePrice = acceptedQuote?.price ?? null;
        }
        return { ...r, workerPhotoUrl: worker?.photoUrl ?? null, assignedWorkerName: worker?.name ?? null, acceptedQuoteProposedDate, acceptedQuotePrice };
      }));
      return enriched;
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
  const all = await getAllRequests();
  const filtered = all.filter(r => r.status === "pending" || r.status === "assigned");
      // Group: district -> blok -> vhod -> [requests]
      const grouped: Record<string, Record<string, Record<string, typeof filtered>>> = {};
  for (const r of filtered) {
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
    listAll: adminProcedure.query(async () => {
      const reqs = await getAllRequests();
      const enriched = await Promise.all(reqs.map(async r => {
        let acceptedQuotePrice: string | null = null;
        if (r.status === "pending_payment" || r.status === "assigned") {
          const quote = await getAcceptedQuoteForRequest(r.id);
          acceptedQuotePrice = quote?.price ?? null;
        }
        return { ...r, acceptedQuotePrice };
      }));
      return enriched;
    }),
    adminCancel: adminProcedure
      .input(z.object({ requestId: z.number() }))
      .mutation(async ({ input }) => {
        const req = await getRequestById(input.requestId);
        if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "Заявката не е намерена." });
        await updateRequestStatus(input.requestId, "cancelled");
        return { success: true };
      }),
    estimateVolume: protectedProcedure
      .input(z.object({ imageUrl: z.string().url("Невалиден URL на снимка") }))
      .mutation(async ({ ctx, input }) => {
        // Rate limit: max 10 image analyses per user per 24 h
        checkRateLimit(
          estimateVolumeRateLimit,
          ctx.user.openId,
          ESTIMATE_MAX,
          ESTIMATE_WINDOW,
          "Достигнахте дневния лимит за анализ на снимки.",
        );
        const fallback = {
      volume: "~150 литра",
      description: "Не можахме да анализираме снимката автоматично.",
      note: "Окончателната цена ще бъде уточнена от работника.",
      object: "Неизвестен обект",
      serviceType: "nonstandard" as const,
    };
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.warn("[estimateVolume] ANTHROPIC_API_KEY not set, returning fallback");
      return fallback;
    }
    console.log("[estimateVolume] imageUrl type:", input.imageUrl.startsWith("data:") ? "base64" : "url", "length:", input.imageUrl.length);
    try {
      const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 512,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: input.imageUrl.startsWith("data:")
  ? { type: "base64", media_type: "image/jpeg", data: input.imageUrl.split(",")[1] }
  : { type: "url", url: input.imageUrl },
                },
                {
                  type: "text",
                  text: "CRITICAL SAFETY CHECK - THIS IS MANDATORY AND MUST BE DONE FIRST:\n\nCarefully examine EVERY part of this image, including background, edges and corners. Check if there are ANY of the following visible ANYWHERE in the image:\n- Human body parts (hands, fingers, arms, legs, feet, face, skin, etc.)\n- Human bodies or remains\n- Animals (alive, dead, or any remains)\n- Blood, wounds, gore\n- Internal organs\n- Any disturbing medical content\n\nEven if a hand is just holding an object, or an animal is in the background - this counts as YES.\n\nIf ANY of the above are present ANYWHERE in the image - respond ONLY with this exact JSON and nothing else:\n{\"rejected\": true, \"reason\": \"Неподходящо съдържание. Моля качете снимка само на отпадъка без хора или животни.\"}\n\nOnly if the image contains ZERO human/animal presence - analyze the waste object and return ONLY this JSON:\n{\n  \"object\": \"what the item is\",\n  \"volume\": \"volume in liters as string, e.g. '~50 litres'\",\n  \"description\": \"brief description in Bulgarian (1-2 sentences)\",\n  \"serviceType\": \"standard or nonstandard or construction\"\n}",
                },
              ],
            },
          ],
        }),
      });
      if (!anthropicRes.ok) {
        const errText = await anthropicRes.text();
        console.error("[estimateVolume] Anthropic API error:", anthropicRes.status, errText);
        return fallback;
      }
      const anthropicData = await anthropicRes.json() as {
        content?: Array<{ type: string; text?: string }>;
      };
      const raw = anthropicData?.content?.find(c => c.type === "text")?.text;
      if (!raw) return fallback;
      // Strip markdown code fences if present
      const cleaned = (typeof raw === "string" ? raw : JSON.stringify(raw))
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/gi, "")
        .trim();
      const parsed = JSON.parse(cleaned) as {
        object?: string;
        volume?: string;
        description?: string;
        serviceType?: string;
        rejected?: boolean;
        reason?: string;
      };
      if (parsed.rejected) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: parsed.reason ?? "Неподходящо съдържание. Моля качете снимка на отпадъка.",
        });
      }
      return {
        volume: parsed.volume ?? fallback.volume,
        description: parsed.description ?? fallback.description,
        note: "Това е AI оценка. Окончателната цена ще бъде уточнена от работника.",
        object: parsed.object ?? fallback.object,
        serviceType: (parsed.serviceType as "standard" | "nonstandard" | "construction") ?? fallback.serviceType,
      };
    } catch (err) {
      if (err instanceof TRPCError) {
        throw err;
      }
      console.error("[estimateVolume] Claude Vision error:", err);
      return fallback;
    }
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
    packages: publicProcedure.query(async () => {
      const s = await getAllSettings();
      const std1 = parseFloat(s["price_std_1"] ?? "0.69");
      const std10 = parseFloat(s["price_std_10"] ?? "6.90");
      const std20 = parseFloat(s["price_std_20"] ?? "13.80");
      const std1Old = parseFloat(s["price_std_1_old"] ?? "0.90");
      const std10Old = parseFloat(s["price_std_10_old"] ?? "8.60");
      const std20Old = parseFloat(s["price_std_20_old"] ?? "17.20");
      const rec1 = parseFloat(s["price_rec_1"] ?? "0.99");
      const rec10 = parseFloat(s["price_rec_10"] ?? "9.90");
      const rec20 = parseFloat(s["price_rec_20"] ?? "19.80");
      const rec1Old = parseFloat(s["price_rec_1_old"] ?? "1.30");
      const rec10Old = parseFloat(s["price_rec_10_old"] ?? "12.40");
      const rec20Old = parseFloat(s["price_rec_20_old"] ?? "24.70");
      return {
        standard: [
          { id: "std_1", credits: 1, bonus: 0, total: 1, price: std1, oldPrice: std1Old, label: "1 кредит", highlight: false },
          { id: "std_10", credits: 10, bonus: 2, total: 12, price: std10, oldPrice: std10Old, label: "10 + 2 безплатни", highlight: true, save: "Спестяваш 2 кредита" },
          { id: "std_20", credits: 20, bonus: 5, total: 25, price: std20, oldPrice: std20Old, label: "20 + 5 безплатни", highlight: false, save: "Спестяваш 5 кредита" },
        ],
        recycling: [
          { id: "rec_1", credits: 1, bonus: 0, total: 1, price: rec1, oldPrice: rec1Old, label: "1 кредит", highlight: false },
          { id: "rec_10", credits: 10, bonus: 1, total: 11, price: rec10, oldPrice: rec10Old, label: "10 + 1 безплатен", highlight: true, save: "Спестяваш 1 кредит" },
          { id: "rec_20", credits: 20, bonus: 3, total: 23, price: rec20, oldPrice: rec20Old, label: "20 + 3 безплатни", highlight: false, save: "Спестяваш 3 кредита" },
        ],
      };
    }),

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
        // Validate price from settings
        const s = await getAllSettings();
        const priceKey = `price_${input.packageId}`;
        const expectedPrice = parseFloat(s[priceKey] ?? "0");
        if (expectedPrice > 0 && Math.abs(input.price - expectedPrice) > 0.01) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Невалидна цена. Моля опреснете страницата." });
        }
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
              unit_amount: Math.round(input.price * 100), // price validated below
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

    // Create Stripe checkout for a nonstandard/construction completed request
    createRequestCheckout: protectedProcedure
      .input(z.object({ requestId: z.number(), origin: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stripe не е конфигуриран." });
        const req = await getRequestById(input.requestId);
        if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "Заявката не е намерена." });
        if (req.userOpenId !== ctx.user.openId) throw new TRPCError({ code: "FORBIDDEN", message: "Нямате достъп до тази заявка." });
        if (req.status !== "pending_payment") throw new TRPCError({ code: "BAD_REQUEST", message: "Заявката не е в статус за плащане." });
        const acceptedQuote = await getAcceptedQuoteForRequest(input.requestId);
        if (!acceptedQuote) throw new TRPCError({ code: "NOT_FOUND", message: "Не е намерена приета оферта за тази заявка." });
        const priceEur = parseFloat(acceptedQuote.price);
        if (priceEur < 0.5) throw new TRPCError({ code: "BAD_REQUEST", message: "Сумата е под минималния праг за плащане (0.50 EUR)." });
        const stripe = new Stripe(stripeKey, { apiVersion: "2026-02-25.clover" });
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          mode: "payment",
          customer_email: ctx.user.email ?? undefined,
          client_reference_id: ctx.user.id.toString(),
          metadata: {
            user_id: ctx.user.id.toString(),
            user_open_id: ctx.user.openId,
            request_id: input.requestId.toString(),
            payment_type: "request",
          },
          line_items: [{
            price_data: {
              currency: "eur",
              product_data: {
                name: `TRASHit — Плащане за заявка #${input.requestId}`,
                description: `${req.type === "nonstandard" ? "Нестандартен" : "Строителен"} отпадък — ${req.district}, Бл. ${req.blok}`,
              },
              unit_amount: Math.round(priceEur * 100),
            },
            quantity: 1,
          }],
          success_url: `${input.origin}/my-requests?payment=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${input.origin}/my-requests`,
        });
        return { url: session.url, sessionId: session.id };
      }),

    // Verify payment for a request and mark it as paid
    verifyRequestPayment: protectedProcedure
      .input(z.object({ sessionId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stripe не е конфигуриран." });
        const stripe = new Stripe(stripeKey, { apiVersion: "2026-02-25.clover" });
        const existing = await getTransactionByStripeSession(input.sessionId);
        if (existing) return { success: true, alreadyProcessed: true };
        const session = await stripe.checkout.sessions.retrieve(input.sessionId);
        if (session.payment_status !== "paid") throw new TRPCError({ code: "BAD_REQUEST", message: "Плащането не е завършено." });
        const meta = session.metadata ?? {};
        const requestId = parseInt(meta.request_id ?? "0");
        if (!requestId) throw new TRPCError({ code: "BAD_REQUEST", message: "Невалидна сесия." });
        const db = await getDb();
        if (db) {
          const { requests } = await import("../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          await db.update(requests).set({ status: "paid" }).where(eq(requests.id, requestId));
        }
        const pricePaid = (session.amount_total ?? 0) / 100;
        await createTransaction({
          userId: ctx.user.id,
          userOpenId: ctx.user.openId,
          type: "purchase",
          creditType: "standard",
          amount: pricePaid.toFixed(2),
          bonusAmount: "0.00",
          totalAmount: pricePaid.toFixed(2),
          pricePaid: pricePaid.toFixed(2),
          stripeSessionId: input.sessionId,
          requestId,
          note: `Плащане за заявка #${requestId}`,
        });
        // Telegram: notify payments channel
        sendTelegramMessage(TELEGRAM_CHATS.payments,
          `💳 <b>Успешно плащане</b>\nЗаявка: #${requestId}\nПотребител: ${ctx.user.name ?? ctx.user.email ?? ctx.user.openId}\nСума: €${pricePaid.toFixed(2)}`
        ).catch(() => {});
        return { success: true, requestId };
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

    // Admin: view transaction history for a specific user
    userTransactions: adminProcedure
      .input(z.object({ userOpenId: z.string() }))
      .query(async ({ input }) => {
        return getTransactionsByUser(input.userOpenId);
      }),
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

    // Admin: reject a problem (dispute)
    reject: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await updateWorkerProblem(input.id, {
          status: "rejected",
          rejectedAt: new Date(),
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
  // ── Entrance Access Control (Admin) ──────────────────────────────────────────
  entranceAccess: router({
    // List all entrance access records (admin)
    list: adminProcedure.query(async () => getAllEntranceAccess()),
    // Toggle approval for a specific entrance (admin)
    toggle: adminProcedure
      .input(z.object({
        district: z.string().min(1),
        blok: z.string().min(1),
        vhod: z.string().min(1),
        isApproved: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        await upsertEntranceAccess(input.district, input.blok, input.vhod, input.isApproved);
        return { success: true };
      }),
    // Delete a specific entrance record (admin)
    delete: adminProcedure
      .input(z.object({
        district: z.string().min(1),
        blok: z.string().min(1),
        vhod: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        await deleteEntranceAccess(input.district, input.blok, input.vhod);
        return { success: true };
      }),
    // Check if a specific entrance is approved (public — used during request creation, READ ONLY)
    check: publicProcedure
      .input(z.object({
        district: z.string().min(1),
        blok: z.string().min(1),
        vhod: z.string().min(1),
      }))
      .query(async ({ input }) => {
        const approved = await checkEntranceApproved(input.district, input.blok, input.vhod);
        return { approved };
      }),
    // Register an unknown entrance (called only on final form submit)
    register: publicProcedure
      .input(z.object({
        district: z.string().min(1),
        blok: z.string().min(1),
        vhod: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const existing = await getEntranceAccess(input.district, input.blok, input.vhod);
        const isNewEntrance = !existing;
        // Only auto-register if not already in the system
        if (!existing?.isApproved) {
          await upsertEntranceAccess(input.district, input.blok, input.vhod, false);
        }
        // Notify admin only when a brand-new entrance is registered
        if (isNewEntrance) {
          const label = `${input.district}, Бл. ${input.blok}, Вх. ${input.vhod}`;
          // Manus platform notification (always works)
          await notifyOwner({
            title: `🏢 Нов вход изчаква одобрение`,
            content: `Нов вход изчаква одобрение: ${label}`,
          }).catch(() => {});
          // Telegram notification for new entrance awaiting approval
          sendTelegramMessage(TELEGRAM_CHATS.requests,
            `🏢 <b>Нов вход изчаква одобрение</b>\nКвартал: ${input.district}\nБлок: ${input.blok}\nВход: ${input.vhod}`
          ).catch(() => {});
          // FCM push to all admin users
          const adminUsers = await getUsersByRole("admin");
          for (const adminUser of adminUsers) {
            if (adminUser.fcmToken) {
              await sendPushNotification(adminUser.fcmToken, {
                title: "🏢 Нов вход изчаква одобрение",
                body: `Нов вход изчаква одобрение: ${label}`,
                data: { type: "new_entrance", district: input.district, blok: input.blok, vhod: input.vhod },
              }).catch(() => {});
            }
          }
        }
        return { approved: existing?.isApproved === true };
      }),
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
        const needsPayment = reqBefore?.type === "nonstandard" || reqBefore?.type === "construction";
        // Guard: check if the entrance of this request is claimed by another worker
        if (reqBefore?.district && reqBefore?.blok && reqBefore?.vhod) {
          const existingAssignment = await getAssignmentByEntrance(reqBefore.district, reqBefore.blok, reqBefore.vhod);
          if (existingAssignment && existingAssignment.workerOpenId !== worker.openId) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Входът е приет от друг работник и не можете да го приключите." });
          }
        }
        if (needsPayment) {
          await completeRequestPendingPayment(input.requestId, worker.openId, worker.id);
        } else {
          await completeRequest(input.requestId, worker.openId, worker.id);
        }
        // Push notification to client
        if (reqBefore?.userOpenId) {
          const client = await getUserByOpenId(reqBefore.userOpenId);
          if (client?.fcmToken) {
            await sendPushNotification(client.fcmToken, {
              title: needsPayment ? "💳 Заявката е изпълнена — необходимо е плащане" : "✅ Заявката е изпълнена",
              body: needsPayment ? "Вашата заявка е изпълнена. Моля, платете за да приключите." : "Вашата заявка за изхвърляне на отпадъци е успешно изпълнена.",
              data: { requestId: String(input.requestId), type: needsPayment ? "pending_payment" : "completed" },
            });
          }
          const clientSubs = await getPushSubscriptionsByOwner(reqBefore.userOpenId);
          for (const sub of clientSubs) {
            sendWebPush(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              { title: needsPayment ? "💳 Заявката е изпълнена" : "✅ Заявката е изпълнена", body: "Вашата заявка е успешно изпълнена.", url: "/" }
            ).catch(() => {});
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
        // Guard: check if entrance is claimed by another worker
        const existingAssignment = await getAssignmentByEntrance(input.district, input.blok, input.vhod);
        if (existingAssignment && existingAssignment.workerOpenId !== worker.openId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Входът е приет от друг работник и не можете да го приключите." });
        }
        const count = await completeRequestsByEntrance(
          input.district, input.blok, input.vhod,
          worker.openId, worker.id
        );
        // Auto-release the claim after completing the entrance
        await unclaimEntrance(worker.openId, input.district, input.blok, input.vhod);
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
        // Telegram: notify problems channel
        sendTelegramMessage(TELEGRAM_CHATS.problems,
          `⚠️ <b>Нов проблем #${id}</b>\nРаботник: ${worker.name}${input.requestId ? `\nЗаявка: #${input.requestId}` : ""}\nОписание: ${input.description}`
        ).catch(() => {});
        return { success: true, id };
      }),
  }),
  // ── Worker Quotes (nonstandard/construction only) ─────────────────────────
  workerQuotes: router({
    /** Worker sends a quote for a nonstandard/construction request */
    send: publicProcedure
      .input(z.object({
        deviceToken: z.string(),
        requestId: z.number(),
        price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Невалидна цена"),
        proposedDate: z.string().optional(),
        note: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const session = await getWorkerSession(input.deviceToken);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "Невалидна сесия." });
        const allWorkers = await getAllWorkers();
        const worker = allWorkers.find(w => w.id === session.workerId);
        if (!worker) throw new TRPCError({ code: "NOT_FOUND", message: "Работникът не е намерен." });
        const req = await getRequestById(input.requestId);
        if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "Заявката не е намерена." });
        if (req.type !== "nonstandard" && req.type !== "construction") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Офертите са само за нестандартен/строителен отпадък." });
        }
        // Cancel any existing pending quote for this request
        const existing = await getPendingQuoteForRequest(input.requestId);
        if (existing) await updateQuoteStatus(existing.id, "rejected");
        const id = await createWorkerQuote({
          requestId: input.requestId,
          workerOpenId: worker.openId,
          workerName: worker.name,
          price: input.price,
          proposedDate: input.proposedDate,
          note: input.note,
        });
        // Notify client
        const client = await getUserByOpenId(req.userOpenId);
        if (client?.fcmToken) {
          await sendPushNotification(client.fcmToken, {
            title: "💰 Получихте оферта",
            body: `Получихте оферта за вашата заявка. Влезте в приложението за да я прегледате.`,
            data: { requestId: String(input.requestId), type: "quote", url: "/" },
          });
        }
        return { success: true, id };
      }),

    /** Client gets quotes for their request */
    getForRequest: protectedProcedure
      .input(z.object({ requestId: z.number() }))
      .query(async ({ ctx, input }) => {
        const req = await getRequestById(input.requestId);
        if (!req) throw new TRPCError({ code: "NOT_FOUND" });
        if (req.userOpenId !== ctx.user.openId) throw new TRPCError({ code: "FORBIDDEN" });
        return getQuotesByRequest(input.requestId);
      }),

    /** Client accepts a quote */
    accept: protectedProcedure
      .input(z.object({ quoteId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const quote = await getQuoteById(input.quoteId);
        if (!quote) throw new TRPCError({ code: "NOT_FOUND" });
        const req = await getRequestById(quote.requestId);
        if (!req) throw new TRPCError({ code: "NOT_FOUND" });
        if (req.userOpenId !== ctx.user.openId) throw new TRPCError({ code: "FORBIDDEN" });
        await updateQuoteStatus(input.quoteId, "accepted");
        // Mark request as assigned
        const db = await getDb();
        if (db) {
          const { requests: reqTable } = await import("../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          await db.update(reqTable).set({ status: "assigned", workerOpenId: quote.workerOpenId }).where(eq(reqTable.id, quote.requestId));
        }
        return { success: true };
      }),

    /** Client rejects a quote — refund credits */
    reject: protectedProcedure
      .input(z.object({ quoteId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const quote = await getQuoteById(input.quoteId);
        if (!quote) throw new TRPCError({ code: "NOT_FOUND" });
        const req = await getRequestById(quote.requestId);
        if (!req) throw new TRPCError({ code: "NOT_FOUND" });
        if (req.userOpenId !== ctx.user.openId) throw new TRPCError({ code: "FORBIDDEN" });
        await updateQuoteStatus(input.quoteId, "rejected");
        // Cancel the request and refund credits if any were deducted
        const db = await getDb();
        if (db) {
          const { requests: reqTable } = await import("../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          await db.update(reqTable).set({ status: "cancelled" }).where(eq(reqTable.id, quote.requestId));
          if (req.creditsUsed && parseFloat(req.creditsUsed) > 0) {
            const user = await getUserByOpenId(ctx.user.openId);
            if (user) {
              const refund = parseFloat(req.creditsUsed);
              const isRecycling = req.creditType === "recycling";
              const currentStandard = parseFloat(user.creditsStandard ?? "0");
              const currentRecycling = parseFloat(user.creditsRecycling ?? "0");
              // Refund to the correct credit type column
              const updateData = isRecycling
                ? { creditsRecycling: String(currentRecycling + refund) }
                : { creditsStandard: String(currentStandard + refund) };
              const { users: usersTable } = await import("../drizzle/schema");
              await db.update(usersTable).set(updateData).where(eq(usersTable.id, user.id));
            }
          }
        }
        return { success: true };
      }),

    /** Admin: edit an existing quote (price, note, proposedDate) */
    adminEdit: adminProcedure
      .input(z.object({
        quoteId: z.number(),
        price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Невалидна цена"),
        note: z.string().optional(),
        proposedDate: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const quote = await getQuoteById(input.quoteId);
        if (!quote) throw new TRPCError({ code: "NOT_FOUND", message: "Офертата не е намерена." });
        const adminName = ctx.user?.name ?? ctx.user?.email ?? "Администратор";
        await adminEditQuote(
          input.quoteId,
          input.price,
          input.note ?? null,
          input.proposedDate ?? null,
          adminName,
        );
        // Notify client about updated quote
        const req = await getRequestById(quote.requestId);
        if (req) {
          const client = await getUserByOpenId(req.userOpenId);
          if (client?.fcmToken) {
            await sendPushNotification(client.fcmToken, {
              title: "💰 Офертата е актуализирана",
              body: `Администраторът е актуализирал офертата за вашата заявка. Нова цена: ${input.price} лв.`,
              data: { requestId: String(quote.requestId), type: "quote", url: "/" },
            });
          }
        }
        return { success: true };
      }),
  }),

  // ── Request Messages (bidirectional chat) ─────────────────────────────────
  requestMessages: router({
    /** Get all messages for a request (client, worker, admin) */
    getForRequest: publicProcedure
      .input(z.object({
        requestId: z.number(),
        // Worker auth
        deviceToken: z.string().optional(),
        // Admin auth
        adminToken: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const req = await getRequestById(input.requestId);
        if (!req) throw new TRPCError({ code: "NOT_FOUND" });
        // Auth: client (must own request), worker (valid session), admin (valid token)
        const isClient = ctx.user && req.userOpenId === ctx.user.openId;
        const workerSession = input.deviceToken ? await getWorkerSession(input.deviceToken) : null;
        const isWorker = !!workerSession;
        const adminConfig = await import("./db").then(m => m.getAdminConfig());
        const isAdmin = input.adminToken && adminConfig?.activeTokenHash
          ? await bcrypt.compare(input.adminToken, adminConfig.activeTokenHash)
          : false;
        if (!isClient && !isWorker && !isAdmin) throw new TRPCError({ code: "FORBIDDEN" });
        return getMessagesByRequestId(input.requestId);
      }),

    /** Client sends a message */
    sendAsClient: protectedProcedure
      .input(z.object({ requestId: z.number(), message: z.string().min(1).max(1000) }))
      .mutation(async ({ ctx, input }) => {
        const req = await getRequestById(input.requestId);
        if (!req) throw new TRPCError({ code: "NOT_FOUND" });
        if (req.userOpenId !== ctx.user.openId) throw new TRPCError({ code: "FORBIDDEN" });
        const id = await addRequestMessage({
          requestId: input.requestId,
          senderRole: "client",
          senderName: ctx.user.name ?? ctx.user.email ?? "Клиент",
          senderOpenId: ctx.user.openId,
          message: input.message,
        });
        // Notify worker if assigned
        if (req.workerOpenId) {
          const allWorkers = await getAllWorkers();
          const worker = allWorkers.find(w => w.openId === req.workerOpenId);
          if (worker?.fcmToken) {
            await sendPushNotification(worker.fcmToken, {
              title: "💬 Съобщение от клиент",
              body: input.message.slice(0, 100),
              data: { requestId: String(input.requestId), type: "message" },
            });
          }
          if (worker) {
            const workerSubs = await getPushSubscriptionsByOwner(String(worker.id));
            for (const sub of workerSubs) {
              sendWebPush(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                { title: "💬 Съобщение от клиент", body: input.message.slice(0, 100), url: "/worker" }
              ).catch(() => {});
            }
          }
        }
        // Notify all admins
        try {
          const adminUsers = await getUsersByRole("admin");
          for (const adminUser of adminUsers) {
            if (adminUser.fcmToken) {
              await sendPushNotification(adminUser.fcmToken, {
                title: "💬 Съобщение от клиент",
                body: `Заявка #${input.requestId}: ${input.message.slice(0, 80)}`,
                data: { requestId: String(input.requestId), type: "message", url: "/" },
              });
            }
            const adminSubs2 = await getPushSubscriptionsByOwner(adminUser.openId);
            for (const sub of adminSubs2) {
              sendWebPush(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                { title: "💬 Съобщение от клиент", body: input.message.slice(0, 100), url: "/admin" }
              ).catch(() => {});
            }
          }
        } catch { /* ignore FCM errors */ }
        return { success: true, id };
      }),

    /** Worker sends a message */
    sendAsWorker: publicProcedure
      .input(z.object({
        deviceToken: z.string(),
        requestId: z.number(),
        message: z.string().min(1).max(1000),
      }))
      .mutation(async ({ input }) => {
        const session = await getWorkerSession(input.deviceToken);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });
        const allWorkers = await getAllWorkers();
        const worker = allWorkers.find(w => w.id === session.workerId);
        if (!worker) throw new TRPCError({ code: "NOT_FOUND" });
        const req = await getRequestById(input.requestId);
        if (!req) throw new TRPCError({ code: "NOT_FOUND" });
        const id = await addRequestMessage({
          requestId: input.requestId,
          senderRole: "worker",
          senderName: worker.name,
          senderOpenId: worker.openId ?? undefined,
          message: input.message,
        });
        // Notify client
        const client = await getUserByOpenId(req.userOpenId);
        if (client?.fcmToken) {
          await sendPushNotification(client.fcmToken, {
            title: "💬 Съобщение от работник",
            body: input.message.slice(0, 100),
            data: { requestId: String(input.requestId), type: "message", url: "/" },
          });
        }
        const clientSubs2 = await getPushSubscriptionsByOwner(req.userOpenId);
        for (const sub of clientSubs2) {
          sendWebPush(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            { title: "💬 Съобщение от работник", body: input.message.slice(0, 100), url: "/" }
          ).catch(() => {});
        }
        return { success: true, id };
      }),

    /** Admin sends a message */
    sendAsAdmin: adminProcedure
      .input(z.object({ requestId: z.number(), message: z.string().min(1).max(1000) }))
      .mutation(async ({ ctx, input }) => {
        const req = await getRequestById(input.requestId);
        if (!req) throw new TRPCError({ code: "NOT_FOUND" });
        const id = await addRequestMessage({
          requestId: input.requestId,
          senderRole: "admin",
          senderName: ctx.user?.name ?? "Администратор",
          senderOpenId: ctx.user?.openId,
          message: input.message,
        });
        // Notify client
        const client = await getUserByOpenId(req.userOpenId);
        if (client?.fcmToken) {
          await sendPushNotification(client.fcmToken, {
            title: "💬 Съобщение от TRASHit",
            body: input.message.slice(0, 100),
            data: { requestId: String(input.requestId), type: "message", url: "/" },
          });
        }
        return { success: true, id };
      }),
  }),

  // ── Diagnostics (temporary — remove after FCM is verified) ─────────────────
  test: router({
    sendTestNotification: adminProcedure
      .mutation(async () => {
        const user = await getFirstUserWithFcmToken();
        if (!user) {
          console.warn("[FCM-TEST] No user with FCM token found in DB");
          return { success: false, tokenPreview: null, result: "Няма потребители с FCM токен в базата" };
        }
        const tokenPreview = user.fcmToken.slice(0, 20) + "...";
        console.log("[FCM-TEST] Sending to user:", user.id, user.name, "token:", tokenPreview);
        const success = await sendPushNotification(user.fcmToken, {
          title: "Тест TRASHit",
          body: "FCM работи!",
          data: { type: "test" },
        });
        const result = success ? "Изпратено успешно" : "Неуспешно — виж server logs";
        console.log("[FCM-TEST] Result:", result);
        return { success, tokenPreview, result };
      }),
  }),

  webPush: router({
    getPublicKey: publicProcedure.query(() => {
      return { publicKey: process.env.VAPID_PUBLIC_KEY ?? null };
    }),

    subscribeUser: protectedProcedure
      .input(z.object({
        endpoint: z.string().url(),
        p256dh: z.string(),
        auth: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        await savePushSubscription(ctx.user.openId, "user", input.endpoint, input.p256dh, input.auth);
        return { success: true };
      }),

    subscribeWorker: publicProcedure
      .input(z.object({
        deviceToken: z.string(),
        endpoint: z.string().url(),
        p256dh: z.string(),
        auth: z.string(),
      }))
      .mutation(async ({ input }) => {
        const session = await getWorkerSession(input.deviceToken);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "Невалидна сесия." });
        await savePushSubscription(String(session.workerId), "worker", input.endpoint, input.p256dh, input.auth);
        return { success: true };
      }),

    unsubscribe: publicProcedure
      .input(z.object({ endpoint: z.string() }))
      .mutation(async ({ input }) => {
        await deletePushSubscription(input.endpoint);
        return { success: true };
      }),
  }),

  // ── Worker Assignments (Claim система) ────────────────────────────────────
  workerAssignments: router({
    // Worker claims an entrance
    claim: publicProcedure
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
        if (!worker) throw new TRPCError({ code: "NOT_FOUND" });
        const result = await claimEntrance(worker.id, worker.openId, input.district, input.blok, input.vhod);
        if (result.alreadyClaimed) throw new TRPCError({ code: "CONFLICT", message: "Входът вече е приет от друг работник." });
        return { success: result.success };
      }),

    // Worker releases an entrance
    unclaim: publicProcedure
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
        if (!worker) throw new TRPCError({ code: "NOT_FOUND" });
        await unclaimEntrance(worker.openId, input.district, input.blok, input.vhod);
        return { success: true };
      }),

    // Get this worker's claimed entrances (enriched with pending/assigned requests)
    myAssignments: publicProcedure
      .input(z.object({ deviceToken: z.string() }))
      .query(async ({ input }) => {
        const session = await getWorkerSession(input.deviceToken);
        if (!session) return [];
        const allWorkers = await getAllWorkers();
        const worker = allWorkers.find(w => w.id === session.workerId);
        if (!worker) return [];
        const assignments = await getWorkerAssignments(worker.openId);
        // Enrich each assignment with active requests (pending OR assigned)
        const allActive = await getAllRequests();
        const standardFiltered = allActive.filter(
          r => (r.status === "pending" || r.status === "assigned") &&
               r.type !== "nonstandard" && r.type !== "construction"
        );
        const nonstandardFiltered = allActive.filter(
          r => (r.status === "pending" || r.status === "assigned") &&
               (r.type === "nonstandard" || r.type === "construction")
        );
        return assignments.map(a => ({
          ...a,
          requests: standardFiltered.filter(
            r => r.district === a.district && r.blok === a.blok && r.vhod === a.vhod
          ),
          nonstandardRequests: nonstandardFiltered.filter(
            r => r.district === a.district && r.blok === a.blok && r.vhod === a.vhod
          ),
        }));
      }),

    // Get all assignments (admin/sub-admin view)
    all: protectedProcedure.query(async () => {
      return getAllAssignments();
    }),

    // Get stats for the current worker
    myStats: publicProcedure
      .input(z.object({ deviceToken: z.string() }))
      .query(async ({ input }) => {
        const session = await getWorkerSession(input.deviceToken);
        if (!session) return { completedCount: 0, todayCount: 0, history: [] };
        const allWorkers = await getAllWorkers();
        const worker = allWorkers.find(w => w.id === session.workerId);
        if (!worker) return { completedCount: 0, todayCount: 0, history: [] };
        const completedCount = await getWorkerCompletedCount(worker.openId);
        const { todayCount, history } = await getWorkerDailyStats(worker.openId, 30);
        return { completedCount, todayCount, history };
      }),

    // Batch claim status for multiple entrances (used by GroupedRequestsView to filter)
    getForEntrances: publicProcedure
      .input(z.object({
        deviceToken: z.string(),
        entrances: z.array(z.object({
          district: z.string(),
          blok: z.string(),
          vhod: z.string(),
        })),
      }))
      .query(async ({ input }) => {
        const session = await getWorkerSession(input.deviceToken);
        if (!session) return {};
        const allWorkers = await getAllWorkers();
        const worker = allWorkers.find(w => w.id === session.workerId);
        if (!worker) return {};
        const allAssignments = await getAllAssignments();
        const result: Record<string, { claimedByMe: boolean; claimedByOther: boolean }> = {};
        for (const { district, blok, vhod } of input.entrances) {
          const key = `${district}|${blok}|${vhod}`;
          const assignment = allAssignments.find(
            a => a.district === district && a.blok === blok && a.vhod === vhod
          );
          if (!assignment) {
            result[key] = { claimedByMe: false, claimedByOther: false };
          } else if (assignment.workerOpenId === worker.openId) {
            result[key] = { claimedByMe: true, claimedByOther: false };
          } else {
            result[key] = { claimedByMe: false, claimedByOther: true };
          }
        }
        return result;
      }),
  }),

    

  // ── Activity Descriptions ─────────────────────────────────────────────────
  activityDescriptions: router({
    getAll: publicProcedure.query(async () => getAllActivityDescriptions()),
    upsert: adminProcedure
      .input(z.object({ activityKey: z.string(), description: z.string() }))
      .mutation(async ({ input }) => {
        await upsertActivityDescription(input.activityKey, input.description);
        return { success: true };
      }),
  }),

  // ── Sub-Admins ────────────────────────────────────────────────────────────
  subAdmins: router({
    // Create a new sub-admin (admin only)
    create: adminProcedure
      .input(z.object({
        username: z.string().min(3, "Потребителското име трябва да е поне 3 символа"),
        password: z.string().min(6, "Паролата трябва да е поне 6 символа"),
        name: z.string().min(2, "Името трябва да е поне 2 символа"),
        permissions: z.array(z.string()).default([]),
      }))
      .mutation(async ({ input }) => {
        const existing = await getSubAdminByUsername(input.username);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "Вече съществува подадмин с това потребителско име." });
        }
        const passwordHash = await bcrypt.hash(input.password, 10);
        const now = Math.floor(Date.now() / 1000);
        await createSubAdmin({
          username: input.username,
          passwordHash,
          name: input.name,
          permissions: input.permissions,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        return { success: true };
      }),

    // List all sub-admins (admin only)
    list: adminProcedure.query(async () => {
      const list = await getAllSubAdmins();
      return list.map(sa => ({
        id: sa.id,
        username: sa.username,
        name: sa.name,
        permissions: sa.permissions,
        isActive: sa.isActive,
        createdAt: sa.createdAt,
      }));
    }),

    // Update permissions (admin only)
    updatePermissions: adminProcedure
      .input(z.object({
        id: z.number(),
        permissions: z.array(z.string()),
      }))
      .mutation(async ({ input }) => {
        await updateSubAdminPermissions(input.id, input.permissions);
        return { success: true };
      }),

    // Toggle active status (admin only)
    toggleActive: adminProcedure
      .input(z.object({ id: z.number(), isActive: z.boolean() }))
      .mutation(async ({ input }) => {
        await toggleSubAdminActive(input.id, input.isActive);
        return { success: true };
      }),

    // Delete sub-admin (admin only)
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteSubAdmin(input.id);
        return { success: true };
      }),

    // Sub-admin login (public)
    login: publicProcedure
      .input(z.object({
        username: z.string().min(1, "Въведете потребителско име"),
        password: z.string().min(1, "Въведете парола"),
      }))
      .mutation(async ({ input }) => {
        const sa = await getSubAdminByUsername(input.username);
        if (!sa || !sa.isActive) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Грешно потребителско име или парола." });
        }
        const valid = await bcrypt.compare(input.password, sa.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Грешно потребителско име или парола." });
        }
        // Generate a simple session token
        const token = nanoid(48);
        // Store token in DB for verification (update updatedAt as a lightweight session marker)
        // We store the token hash in the DB so we can verify it later
        const tokenHash = await bcrypt.hash(token, 8);
        await updateSubAdminPermissions(sa.id, sa.permissions); // just to update updatedAt
        // Return token + metadata; client stores in localStorage as "subadmin_session"
        return {
          success: true,
          token,
          tokenHash,
          id: sa.id,
          name: sa.name,
          username: sa.username,
          permissions: sa.permissions,
        };
      }),

    // Verify sub-admin session by id + username (public)
    verifySession: publicProcedure
      .input(z.object({ id: z.number(), username: z.string() }))
      .query(async ({ input }) => {
        const sa = await getSubAdminById(input.id);
        if (!sa || !sa.isActive || sa.username !== input.username) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Невалидна сесия." });
        }
        return {
          id: sa.id,
          name: sa.name,
          username: sa.username,
          permissions: sa.permissions,
        };
      }),
      changePassword: publicProcedure
    .input(z.object({
      id: z.number(),
      currentPassword: z.string().min(1),
      newPassword: z.string().min(6),
    }))
    .mutation(async ({ input }) => {
      const sa = await getSubAdminById(input.id);
      if (!sa) throw new TRPCError({ code: "NOT_FOUND", message: "Подадминът не е намерен." });
      const valid = await bcrypt.compare(input.currentPassword, sa.passwordHash);
      if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Грешна текуща парола." });
      const passwordHash = await bcrypt.hash(input.newPassword, 10);
      const now = Math.floor(Date.now() / 1000);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB не е достъпна." });
      const { subAdmins } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await db.update(subAdmins).set({ passwordHash, updatedAt: now }).where(eq(subAdmins.id, input.id));
      return { success: true };
    }),
/** Admin: get all quotes for a request */
    adminGetForRequest: adminProcedure
      .input(z.object({ requestId: z.number() }))
      .query(async ({ input }) => {
        return getQuotesByRequest(input.requestId);
      }),

    /** Admin: accept a quote on behalf of the client */
    adminAccept: adminProcedure
      .input(z.object({ quoteId: z.number() }))
      .mutation(async ({ input }) => {
        const quote = await getQuoteById(input.quoteId);
        if (!quote) throw new TRPCError({ code: "NOT_FOUND" });
        await updateQuoteStatus(input.quoteId, "accepted");
        const db = await getDb();
        if (db) {
          const { requests: reqTable } = await import("../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          await db.update(reqTable)
            .set({ status: "assigned", workerOpenId: quote.workerOpenId })
            .where(eq(reqTable.id, quote.requestId));
        }
        return { success: true };
      }),

    /** Admin: reject a quote and refund credits */
    adminReject: adminProcedure
      .input(z.object({ quoteId: z.number() }))
      .mutation(async ({ input }) => {
        const quote = await getQuoteById(input.quoteId);
        if (!quote) throw new TRPCError({ code: "NOT_FOUND" });
        const req = await getRequestById(quote.requestId);
        if (!req) throw new TRPCError({ code: "NOT_FOUND" });
        await updateQuoteStatus(input.quoteId, "rejected");
        const db = await getDb();
        if (db) {
          const { requests: reqTable } = await import("../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          await db.update(reqTable).set({ status: "cancelled" }).where(eq(reqTable.id, quote.requestId));
          if (req.creditsUsed && parseFloat(req.creditsUsed) > 0) {
            const user = await getUserByOpenId(req.userOpenId);
            if (user) {
              const refund = parseFloat(req.creditsUsed);
              const isRecycling = req.creditType === "recycling";
              const currentStandard = parseFloat(user.creditsStandard ?? "0");
              const currentRecycling = parseFloat(user.creditsRecycling ?? "0");
              const updateData = isRecycling
                ? { creditsRecycling: String(currentRecycling + refund) }
                : { creditsStandard: String(currentStandard + refund) };
              const { users: usersTable } = await import("../drizzle/schema");
              await db.update(usersTable).set(updateData).where(eq(usersTable.id, user.id));
            }
          }
        }
        return { success: true };
      }),
  }),

  subscriptions: router({
    prices: publicProcedure.query(async () => {
      const s = await getAllSettings();
      return {
        standard: {
          "15": { price: parseFloat(s["price_sub_std_15"] ?? "8.99"), oldPrice: parseFloat(s["price_sub_std_15_old"] ?? "11.90") },
          "30": { price: parseFloat(s["price_sub_std_30"] ?? "17.99"), oldPrice: parseFloat(s["price_sub_std_30_old"] ?? "23.90") },
        },
        recycling: {
          "15": { price: parseFloat(s["price_sub_rec_15"] ?? "11.99"), oldPrice: parseFloat(s["price_sub_rec_15_old"] ?? "15.90") },
          "30": { price: parseFloat(s["price_sub_rec_30"] ?? "21.99"), oldPrice: parseFloat(s["price_sub_rec_30_old"] ?? "28.90") },
        },
      };
    }),
    myList: protectedProcedure.query(async ({ ctx }) => {
      return getSubscriptionsByUser(ctx.user.openId);
    }),
    myActive: protectedProcedure.query(async ({ ctx }) => {
      return getActiveSubscriptionByUser(ctx.user.openId) ?? null;
    }),
    createCheckout: protectedProcedure
      .input(z.object({
        type: z.enum(["standard", "recycling"]),
        visits: z.enum(["15", "30"]),
        timeSlot: z.enum(["morning", "evening"]),
        visitDays: z.enum(["even", "odd", "all"]).default("all"),
        district: z.string().min(1),
        blok: z.string().min(1),
        vhod: z.string().min(1),
        etaj: z.string().optional(),
        apartament: z.string().optional(),
        origin: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stripe не е конфигуриран." });
        const existing = await getActiveSubscriptionByUser(ctx.user.openId);
        if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "Вече имате активен абонамент." });
        const s = await getAllSettings();
        const priceMap: Record<string, Record<string, number>> = {
          standard: {
            "15": Math.round(parseFloat(s["price_sub_std_15"] ?? "8.99") * 100),
            "30": Math.round(parseFloat(s["price_sub_std_30"] ?? "17.99") * 100),
          },
          recycling: {
            "15": Math.round(parseFloat(s["price_sub_rec_15"] ?? "11.99") * 100),
            "30": Math.round(parseFloat(s["price_sub_rec_30"] ?? "21.99") * 100),
          },
        };
        const unitAmount = priceMap[input.type][input.visits];
        const labelMap: Record<string, Record<string, string>> = {
          standard: { "15": "Стандартен — 15 посещения/месец", "30": "Стандартен — 30 посещения/месец" },
          recycling: { "15": "Рециклиращ — 15 посещения/месец", "30": "Рециклиращ — 30 посещения/месец" },
        };
        const stripe = new Stripe(stripeKey, { apiVersion: "2026-02-25.clover" });
        let customerId: string | undefined;
        const existingSubs = await getSubscriptionsByUser(ctx.user.openId);
        const withCustomer = existingSubs.find(s => s.stripeCustomerId);
        if (withCustomer?.stripeCustomerId) {
          customerId = withCustomer.stripeCustomerId;
        } else {
          const customer = await stripe.customers.create({
            email: ctx.user.email ?? undefined,
            name: ctx.user.name ?? undefined,
            metadata: { user_open_id: ctx.user.openId, user_id: ctx.user.id.toString() },
          });
          customerId = customer.id;
        }
        const subId = await createSubscription({
          userOpenId: ctx.user.openId,
          userId: ctx.user.id,
          type: input.type,
          visits: input.visits,
          timeSlot: input.timeSlot,
          visitDays: input.visitDays,
          district: input.district,
          blok: input.blok,
          vhod: input.vhod,
          etaj: input.etaj,
          apartament: input.apartament,
          status: "active",
          stripeCustomerId: customerId,
        });
        // Telegram: notify subscriptions channel
        sendTelegramMessage(TELEGRAM_CHATS.subscriptions,
          `📅 <b>Нов абонамент #${subId}</b>\nПотребител: ${ctx.user.name ?? ctx.user.email ?? ctx.user.openId}\nТип: ${input.type} — ${input.visits} посещения/мес.\nАдрес: ${input.district}, Бл. ${input.blok}, Вх. ${input.vhod}\nСлот: ${input.timeSlot === "morning" ? "08:00–12:00" : "20:00–00:00"}${input.visits === "15" ? `\nДати: ${input.visitDays === "even" ? "Четни" : "Нечетни"}` : ""}`
        ).catch(() => {});
        const session = await stripe.checkout.sessions.create({
          mode: "subscription",
          customer: customerId,
          line_items: [{
            price_data: {
              currency: "eur",
              product_data: { name: `TRASHit — ${labelMap[input.type][input.visits]}` },
              unit_amount: unitAmount,
              recurring: { interval: "month" },
            },
            quantity: 1,
          }],
          client_reference_id: ctx.user.id.toString(),
          metadata: {
            user_id: ctx.user.id.toString(),
            user_open_id: ctx.user.openId,
            subscription_id: subId.toString(),
            payment_type: "subscription",
          },
          success_url: `${input.origin}/subscription?sub_success=1&sub_id=${subId}`,
          cancel_url: `${input.origin}/subscription`,
          allow_promotion_codes: true,
        });
        await updateSubscriptionStripe(subId, { stripeCustomerId: customerId });
        return { url: session.url, subscriptionId: subId };
      }),
    cancel: protectedProcedure
      .input(z.object({ id: z.number(), note: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const sub = await getSubscriptionById(input.id);
        if (!sub) throw new TRPCError({ code: "NOT_FOUND", message: "Абонаментът не е намерен." });
        if (sub.userOpenId !== ctx.user.openId) throw new TRPCError({ code: "FORBIDDEN", message: "Нямате достъп." });
        if (sub.status !== "active") throw new TRPCError({ code: "BAD_REQUEST", message: "Абонаментът не е активен." });
        if (sub.stripeSubscriptionId) {
          const stripeKey = process.env.STRIPE_SECRET_KEY;
          if (stripeKey) {
            const stripe = new Stripe(stripeKey, { apiVersion: "2026-02-25.clover" });
            await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
          }
        }
        await cancelSubscription(input.id, input.note);
        return { success: true };
      }),
    adminList: adminProcedure.query(async () => {
      const subs = await getAllSubscriptions();
      const users = await getAllUsers();
      return subs.map(s => {
        const user = users.find(u => u.openId === s.userOpenId);
        return {
          ...s,
          clientName: user?.name ?? null,
          clientEmail: user?.email ?? null,
        };
      });
    }),

    adminCreate: adminProcedure
      .input(z.object({
        userOpenId: z.string(),
        type: z.enum(["standard", "recycling"]),
        visits: z.number(),
        district: z.string(),
        blok: z.string(),
        vhod: z.string(),
        etaj: z.string().optional(),
        apartament: z.string().optional(),
        timeSlot: z.enum(["morning", "evening"]),
        visitDays: z.enum(["even", "odd", "all"]).default("all"),
      }))
      .mutation(async ({ input }) => {
        const currentPeriodEnd = new Date();
        currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);
        const user = await getUserByOpenId(input.userOpenId);
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Потребителят не е намерен." });
        await createSubscription({
          userOpenId: input.userOpenId,
          userId: user.id,
          type: input.type,
          visits: String(input.visits) as "15" | "30",
          visitDays: input.visitDays,
          district: input.district,
          blok: input.blok,
          vhod: input.vhod,
          etaj: input.etaj ?? null,
          apartament: input.apartament ?? null,
          timeSlot: input.timeSlot,
          status: "active",
          currentPeriodEnd: currentPeriodEnd,
          stripeSubscriptionId: null,
          stripeCustomerId: null,
        });
        return { success: true };
      }),

    adminCancel: adminProcedure
      .input(z.object({ id: z.number(), note: z.string().optional() }))
      .mutation(async ({ input }) => {
        const sub = await getSubscriptionById(input.id);
        if (!sub) throw new TRPCError({ code: "NOT_FOUND", message: "Абонаментът не е намерен." });
        if (sub.stripeSubscriptionId) {
          const stripeKey = process.env.STRIPE_SECRET_KEY;
          if (stripeKey) {
            const stripe = new Stripe(stripeKey, { apiVersion: "2026-02-25.clover" });
            await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
          }
        }
        await cancelSubscription(input.id, input.note);
        return { success: true };
      }),
    generateTodayVisits: adminProcedure.mutation(async () => {
      const today = new Date().toISOString().slice(0, 10);
      const allSubs = await getAllSubscriptions();
      const activeSubs = allSubs.filter(s => s.status === "active");
      let created = 0;
      for (const sub of activeSubs) {
        const visitDays = (sub as any).visitDays ?? "all";
        const dayOfMonth = new Date(today).getUTCDate();
        const shouldVisit = visitDays === "all" ||
          (visitDays === "even" && dayOfMonth % 2 === 0) ||
          (visitDays === "odd" && dayOfMonth % 2 !== 0);
        if (shouldVisit) {
          await createDailyVisitsForSubscription(sub.id, today);
          created++;
        }
      }
      return { success: true, created, date: today };
    }),
    todayVisits: publicProcedure
      .input(z.object({ deviceToken: z.string() }))
      .query(async ({ input }) => {
        const session = await getWorkerSession(input.deviceToken);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "Невалидна сесия." });
        const today = new Date().toISOString().split("T")[0];
        const morning = await getTodayVisitsBySlot(today, "morning");
        const evening = await getTodayVisitsBySlot(today, "evening");
        return { morning, evening };
      }),
    markVisited: publicProcedure
      .input(z.object({ deviceToken: z.string(), visitId: z.number() }))
      .mutation(async ({ input }) => {
        const session = await getWorkerSession(input.deviceToken);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "Невалидна сесия." });
        const allWorkers = await getAllWorkers();
        const worker = allWorkers.find(w => w.id === session.workerId);
        if (!worker) throw new TRPCError({ code: "NOT_FOUND", message: "Работникът не е намерен." });
        await markVisitCompleted(input.visitId, worker.id, worker.openId);
        return { success: true };
      }),
    getWorkerPref: publicProcedure
      .input(z.object({ deviceToken: z.string() }))
      .query(async ({ input }) => {
        const session = await getWorkerSession(input.deviceToken);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "Невалидна сесия." });
        const prefs = await getWorkerSubscriptionPref(session.workerId);
        return prefs;
      }),
    setWorkerPref: publicProcedure
      .input(z.object({ deviceToken: z.string(), acceptsSubscriptions: z.boolean(), acceptsNonstandard: z.boolean() }))
      .mutation(async ({ input }) => {
        const session = await getWorkerSession(input.deviceToken);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "Невалидна сесия." });
        await setWorkerSubscriptionPref(session.workerId, input.acceptsSubscriptions, input.acceptsNonstandard);
        return { success: true };
      }),
    stripeWebhook: publicProcedure
      .input(z.object({ stripeSubscriptionId: z.string(), status: z.string(), currentPeriodEnd: z.number().optional() }))
      .mutation(async ({ input }) => {
        const sub = await getSubscriptionByStripeId(input.stripeSubscriptionId);
        if (!sub) return { success: false };
        if (input.status === "active") {
          await updateSubscriptionStripe(sub.id, {
            status: "active",
            currentPeriodEnd: input.currentPeriodEnd ? new Date(input.currentPeriodEnd * 1000) : undefined,
          });
        } else if (input.status === "canceled" || input.status === "cancelled") {
          await cancelSubscription(sub.id, "Отказан от Stripe");
        } else if (input.status === "past_due" || input.status === "unpaid") {
          await updateSubscriptionStripe(sub.id, { status: "expired" });
        }
        return { success: true };
      }),
  }),
  settings: router({
    getAll: adminProcedure.query(async () => {
      return getAllSettings();
    }),
    update: adminProcedure
      .input(z.object({ key: z.string(), value: z.string() }))
      .mutation(async ({ input }) => {
        await upsertSetting(input.key, input.value);
        return { success: true };
      }),
  }),
});
export type AppRouter = typeof appRouter;