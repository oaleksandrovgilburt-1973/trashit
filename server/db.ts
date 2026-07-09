import { eq, and, asc, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  settings,
  workers, InsertWorker,
  adminConfig,
  workerSessions,
  districts, InsertDistrict,
  requests, InsertRequest,
  cleaningRequests, InsertCleaningRequest,
  transactions, InsertTransaction,
  workerProblems, InsertWorkerProblem,
  workerDistricts,
  workerQuotes, InsertWorkerQuote, WorkerQuote,
  activityDescriptions,
  entranceAccess, EntranceAccess,
  subAdmins, SubAdmin, InsertSubAdmin,
  subscriptions, subscriptionVisits, workerSubscriptionPrefs,
  Subscription, InsertSubscription, SubscriptionVisit,
  pushSubscriptions, PushSubscriptionRow,
  workerAssignments, WorkerAssignment,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod", "phone"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
  if (user.passwordHash !== undefined) { values.passwordHash = user.passwordHash; updateSet.passwordHash = user.passwordHash; }
  if (user.bonusGranted !== undefined) { values.bonusGranted = user.bonusGranted; updateSet.bonusGranted = user.bonusGranted; }
  if (user.creditsStandard !== undefined) { values.creditsStandard = user.creditsStandard; updateSet.creditsStandard = user.creditsStandard; }
  if (user.creditsRecycling !== undefined) { values.creditsRecycling = user.creditsRecycling; updateSet.creditsRecycling = user.creditsRecycling; }
  if (user.credits !== undefined) { values.credits = user.credits; updateSet.credits = user.credits; }
  if (user.isFirstLogin !== undefined) { values.isFirstLogin = user.isFirstLogin; updateSet.isFirstLogin = user.isFirstLogin; }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users);
}

export async function getUsersByRole(role: "user" | "admin" | "worker") {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.role, role));
}

export async function updateUserRole(userId: number, role: "user" | "admin" | "worker") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function updateUserCredits(userId: number, credits: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ credits }).where(eq(users.id, userId));
}

export async function updateUserFcmToken(openId: string, fcmToken: string | null) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ fcmToken }).where(eq(users.openId, openId));
}

export async function updateUserProfile(openId: string, data: Partial<{
  name: string; phone: string;
  addressKvartal: string; addressBlok: string; addressVhod: string;
  addressEtaj: string; addressApartament: string; addressCity: string;
}>) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.openId, openId));
}

// ─── Workers ──────────────────────────────────────────────────────────────────

export async function createWorker(data: InsertWorker) {
  const db = await getDb();
  if (!db) return;
  await db.insert(workers).values(data);
}

export async function getWorkerByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(workers).where(eq(workers.username, username)).limit(1);
  return result[0];
}

export async function getWorkerByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(workers).where(eq(workers.openId, openId)).limit(1);
  return result[0];
}

export async function getAllWorkers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workers);
}

export async function updateWorkerPassword(workerId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(workers).set({ passwordHash, mustChangePassword: false }).where(eq(workers.id, workerId));
}

export async function updateWorkerLastSignedIn(workerId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(workers).set({ lastSignedIn: new Date() }).where(eq(workers.id, workerId));
}

// ─── Worker Sessions (device tokens) ─────────────────────────────────────────

export async function getWorkerSessionCount(workerId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select().from(workerSessions).where(eq(workerSessions.workerId, workerId));
  return result.length;
}

export async function addWorkerSession(workerId: number, deviceToken: string, deviceName?: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(workerSessions).values({ workerId, deviceToken, deviceName });
}

export async function removeOldestWorkerSession(workerId: number) {
  const db = await getDb();
  if (!db) return;
  const sessions = await db.select().from(workerSessions)
    .where(eq(workerSessions.workerId, workerId));
  if (sessions.length === 0) return;
  const oldest = sessions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
  await db.delete(workerSessions).where(eq(workerSessions.id, oldest.id));
}

export async function getWorkerSession(deviceToken: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(workerSessions).where(eq(workerSessions.deviceToken, deviceToken)).limit(1);
  return result[0];
}

// ─── Admin Config ─────────────────────────────────────────────────────────────

export async function getAdminConfig() {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(adminConfig).limit(1);
  return result[0];
}

export async function initAdminConfig(passwordHash: string) {
  const db = await getDb();
  if (!db) return;
  const existing = await getAdminConfig();
  if (!existing) {
    await db.insert(adminConfig).values({ username: "admin", passwordHash, defaultBlocked: false });
  }
}

export async function updateAdminConfig(username: string, passwordHash: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(adminConfig).set({ username, passwordHash, defaultBlocked: true });
}

export async function updateAdminTokenHash(tokenHash: string | null) {
  const db = await getDb();
  if (!db) return;
  await db.update(adminConfig).set({ activeTokenHash: tokenHash });
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return result[0]?.value ?? null;
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const db = await getDb();
  if (!db) return {};
  const rows = await db.select().from(settings);
  return Object.fromEntries(rows.map(r => [r.key, r.value ?? ""]));
}

export async function upsertSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(settings).values({ key, value }).onDuplicateKeyUpdate({ set: { value } });
}

// ─── Districts ────────────────────────────────────────────────────────────────

export async function getAllDistricts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(districts).orderBy(asc(districts.name));
}

export async function getActiveDistricts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(districts).where(eq(districts.isActive, true)).orderBy(asc(districts.name));
}

export async function createDistrict(name: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(districts).values({ name, isActive: true });
}

export async function updateDistrictStatus(id: number, isActive: boolean): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(districts).set({ isActive }).where(eq(districts.id, id));
}

export async function deleteDistrict(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(districts).where(eq(districts.id, id));
}

// ─── Requests ─────────────────────────────────────────────────────────────────

export async function createRequest(data: InsertRequest): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(requests).values(data);
  return (result as any)[0]?.insertId ?? 0;
}

export async function getRequestsByUser(userOpenId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(requests)
    .where(eq(requests.userOpenId, userOpenId))
    .orderBy(asc(requests.createdAt));
}

export async function getAllRequests() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(requests).orderBy(asc(requests.createdAt));
}

export async function getPendingRequests() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(requests)
    .where(eq(requests.status, "pending"))
    .orderBy(asc(requests.district), asc(requests.blok), asc(requests.vhod), asc(requests.apartament));
}

export async function getRequestById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(requests).where(eq(requests.id, id)).limit(1);
  return result[0];
}

export async function updateRequestStatus(id: number, status: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(requests).set({ status } as any).where(eq(requests.id, id));
}

export async function updateRequestProblem(id: number, hasProblem: boolean, problemDescription?: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(requests).set({ hasProblem, problemDescription: problemDescription ?? null }).where(eq(requests.id, id));
}

export async function completeRequest(id: number, workerOpenId: string, workerId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(requests).set({
    status: "completed",
    workerOpenId,
    workerId,
    completedAt: new Date(),
  }).where(eq(requests.id, id));
}

export async function completeRequestPendingPayment(id: number, workerOpenId: string, workerId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(requests).set({
    status: "pending_payment",
    workerOpenId,
    workerId,
    completedAt: new Date(),
  }).where(eq(requests.id, id));
}

export async function completeRequestsByEntrance(
  district: string, blok: string, vhod: string,
  workerOpenId: string, workerId: number
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const { or } = await import("drizzle-orm");
  // Get all pending + assigned requests for this entrance
  const active = await db.select().from(requests).where(
    and(
      eq(requests.district, district),
      eq(requests.blok, blok),
      eq(requests.vhod, vhod),
      or(eq(requests.status, "pending"), eq(requests.status, "assigned"))
    )
  );
  if (active.length === 0) return 0;
  await db.update(requests).set({
    status: "completed",
    workerOpenId,
    workerId,
    completedAt: new Date(),
  }).where(
    and(
      eq(requests.district, district),
      eq(requests.blok, blok),
      eq(requests.vhod, vhod),
      or(eq(requests.status, "pending"), eq(requests.status, "assigned"))
    )
  );
  return active.length;
}

export async function cancelRequest(id: number, userOpenId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(requests).set({ status: "cancelled" })
    .where(and(eq(requests.id, id), eq(requests.userOpenId, userOpenId)));
}

// ─── Cleaning Requests ────────────────────────────────────────────────────────

export async function createCleaningRequest(data: InsertCleaningRequest): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(cleaningRequests).values(data);
  return (result as any)[0]?.insertId ?? 0;
}

export async function getCleaningRequestsByUser(userOpenId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cleaningRequests)
    .where(eq(cleaningRequests.userOpenId, userOpenId))
    .orderBy(asc(cleaningRequests.createdAt));
}

export async function getAllCleaningRequests() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cleaningRequests).orderBy(asc(cleaningRequests.createdAt));
}

export async function updateCleaningRequestStatus(id: number, status: "pending" | "reviewed" | "completed" | "cancelled", adminNotes?: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const updateData: Record<string, unknown> = { status };
  if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
  await db.update(cleaningRequests).set(updateData as any).where(eq(cleaningRequests.id, id));
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function createTransaction(data: InsertTransaction): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(transactions).values(data);
  return (result as any)[0]?.insertId ?? 0;
}

export async function getTransactionsByUser(userOpenId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(transactions)
    .where(eq(transactions.userOpenId, userOpenId))
    .orderBy(asc(transactions.createdAt));
}

export async function getAllTransactions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(transactions).orderBy(asc(transactions.createdAt));
}

export async function getTransactionByStripeSession(sessionId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(transactions)
    .where(eq(transactions.stripeSessionId, sessionId)).limit(1);
  return result[0];
}

// ─── Worker Problems ──────────────────────────────────────────────────────────

export async function createWorkerProblem(data: InsertWorkerProblem): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(workerProblems).values(data);
  return (result as any)[0]?.insertId ?? 0;
}

export async function getAllWorkerProblems() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    id: workerProblems.id,
    workerId: workerProblems.workerId,
    workerOpenId: workerProblems.workerOpenId,
    workerName: workerProblems.workerName,
    requestId: workerProblems.requestId,
    description: workerProblems.description,
    imageUrl: workerProblems.imageUrl,
    status: workerProblems.status,
    adminNotes: workerProblems.adminNotes,
    resolvedAt: workerProblems.resolvedAt,
    forwardedToClientAt: workerProblems.forwardedToClientAt,
    createdAt: workerProblems.createdAt,
    // Address from the linked request
    reqDistrict: requests.district,
    reqBlok: requests.blok,
    reqVhod: requests.vhod,
    reqEtaj: requests.etaj,
    reqApartament: requests.apartament,
  })
  .from(workerProblems)
  .leftJoin(requests, eq(workerProblems.requestId, requests.id))
  .orderBy(desc(workerProblems.createdAt));
  return rows;
}

export async function getOpenWorkerProblems() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workerProblems)
    .where(eq(workerProblems.status, "open"))
    .orderBy(desc(workerProblems.createdAt));
}

export async function updateWorkerProblem(id: number, data: Partial<{ status: "open" | "resolved" | "forwarded" | "rejected"; adminNotes: string; resolvedAt: Date; forwardedToClientAt: Date; rejectedAt: Date }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(workerProblems).set(data).where(eq(workerProblems.id, id));
}

// ─── Worker Stats ─────────────────────────────────────────────────────────────

export async function getWorkerCompletedCount(workerOpenId: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select().from(requests)
    .where(and(eq(requests.workerOpenId, workerOpenId), eq(requests.status, "completed")));
  return result.length;
}

export async function getWorkerDailyStats(workerOpenId: string, days: number = 30): Promise<{
  todayCount: number;
  history: Array<{ date: string; count: number }>;
}> {
  const db = await getDb();
  if (!db) return { todayCount: 0, history: [] };
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const result = await db.select().from(requests)
    .where(and(
      eq(requests.workerOpenId, workerOpenId),
      eq(requests.status, "completed"),
    ));
  const todayStr = new Date().toISOString().split("T")[0];
  const counts: Record<string, number> = {};
  for (const r of result) {
    if (!r.completedAt) continue;
    const d = new Date(r.completedAt);
    if (d < cutoff) continue;
    const dateStr = d.toISOString().split("T")[0];
    counts[dateStr] = (counts[dateStr] ?? 0) + 1;
  }
  const history = Object.entries(counts)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, count]) => ({ date, count }));
  return { todayCount: counts[todayStr] ?? 0, history };
}

export async function getAllWorkersWithStats() {
  const db = await getDb();
  if (!db) return [];
  const allWorkers = await db.select().from(workers).orderBy(asc(workers.createdAt));
  const completedRequests = await db.select().from(requests).where(eq(requests.status, "completed"));
  return allWorkers.map(w => ({
    ...w,
    completedCount: completedRequests.filter(r => r.workerOpenId === w.openId).length,
  }));
}

export async function deactivateWorker(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(workers).set({ isActive: false }).where(eq(workers.id, id));
}

export async function deleteWorker(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(workers).where(eq(workers.id, id));
}

export async function activateWorker(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(workers).set({ isActive: true }).where(eq(workers.id, id));
}

// ─── Block Access (derived from requests) ────────────────────────────────────

export async function getActiveBlocksWithAccess() {
  const db = await getDb();
  if (!db) return [];
  // Get unique district+blok+vhod combos from ALL submitted requests (not just pending)
  const pendingReqs = await db.select().from(requests)
    .orderBy(asc(requests.district), asc(requests.blok), asc(requests.vhod));

  // Group unique combinations
  const seen = new Set<string>();
  const blocks: Array<{ district: string; blok: string; vhod: string; requestCount: number; contactPhone: string | null; contactEmail: string | null; userOpenId: string }> = [];
  for (const r of pendingReqs) {
    const key = `${r.district}|${r.blok}|${r.vhod}`;
    if (!seen.has(key)) {
      seen.add(key);
      blocks.push({
        district: r.district,
        blok: r.blok,
        vhod: r.vhod,
        requestCount: pendingReqs.filter(x => x.district === r.district && x.blok === r.blok && x.vhod === r.vhod).length,
        contactPhone: r.contactPhone ?? null,
        contactEmail: r.contactEmail ?? null,
        userOpenId: r.userOpenId,
      });
    }
  }
  return blocks;
}

// ─── Worker District Preferences ─────────────────────────────────────────────
export async function getWorkerDistricts(workerOpenId: string): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(workerDistricts).where(eq(workerDistricts.workerOpenId, workerOpenId));
  return rows.map(r => r.districtName);
}

export async function setWorkerDistricts(workerId: number, workerOpenId: string, districtNames: string[]): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Delete existing preferences
  await db.delete(workerDistricts).where(eq(workerDistricts.workerOpenId, workerOpenId));
  // Insert new ones
  if (districtNames.length > 0) {
    await db.insert(workerDistricts).values(
      districtNames.map(name => ({ workerId, workerOpenId, districtName: name }))
    );
  }
}

export async function getRequestsByDistricts(districtNames: string[]): Promise<typeof requests.$inferSelect[]> {
  const db = await getDb();
  if (!db) return [];
  if (districtNames.length === 0) return [];
  const { or } = await import("drizzle-orm");
  const activeReqs = await db.select().from(requests)
    .where(or(eq(requests.status, "pending"), eq(requests.status, "assigned")))
    .orderBy(requests.district, requests.blok, requests.vhod, requests.etaj, requests.apartament);
  return activeReqs.filter(r => districtNames.includes(r.district));
}

// ─── Worker Quotes ────────────────────────────────────────────────────────────

export async function createWorkerQuote(data: InsertWorkerQuote): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(workerQuotes).values(data);
  return (result as any)[0]?.insertId ?? 0;
}

export async function getQuotesByRequest(requestId: number): Promise<WorkerQuote[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workerQuotes).where(eq(workerQuotes.requestId, requestId));
}

export async function getQuoteById(id: number): Promise<WorkerQuote | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(workerQuotes).where(eq(workerQuotes.id, id)).limit(1);
  return result[0];
}

export async function updateQuoteStatus(id: number, status: "pending" | "accepted" | "rejected"): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(workerQuotes).set({ status }).where(eq(workerQuotes.id, id));
}

export async function getPendingQuoteForRequest(requestId: number): Promise<WorkerQuote | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(workerQuotes)
    .where(and(eq(workerQuotes.requestId, requestId), eq(workerQuotes.status, "pending")))
    .limit(1);
  return result[0];
}

export async function getAcceptedQuoteForRequest(requestId: number): Promise<WorkerQuote | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(workerQuotes)
    .where(and(eq(workerQuotes.requestId, requestId), eq(workerQuotes.status, "accepted")))
    .limit(1);
  return result[0];
}

export async function updateWorkerPhoto(workerOpenId: string, photoUrl: string | null): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(workers).set({ photoUrl }).where(eq(workers.openId, workerOpenId));
}

// ─── Activity Descriptions ────────────────────────────────────────────────────

export async function getAllActivityDescriptions(): Promise<Record<string, string>> {
  const db = await getDb();
  if (!db) return {};
  const rows = await db.select().from(activityDescriptions);
  return Object.fromEntries(rows.map(r => [r.activityKey, r.description ?? ""]));
}

export async function upsertActivityDescription(activityKey: string, description: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(activityDescriptions).values({ activityKey, description })
    .onDuplicateKeyUpdate({ set: { description } });
}

// ─── Entrance Access ──────────────────────────────────────────────────────────

export async function getAllEntranceAccess(): Promise<EntranceAccess[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(entranceAccess)
    .orderBy(asc(entranceAccess.district), asc(entranceAccess.blok), asc(entranceAccess.vhod));
}

export async function getEntranceAccess(district: string, blok: string, vhod: string): Promise<EntranceAccess | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(entranceAccess)
    .where(and(
      eq(entranceAccess.district, district),
      eq(entranceAccess.blok, blok),
      eq(entranceAccess.vhod, vhod)
    ))
    .limit(1);
  return result[0];
}

export async function upsertEntranceAccess(district: string, blok: string, vhod: string, isApproved: boolean): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Check if record already exists
  const existing = await getEntranceAccess(district, blok, vhod);
  if (existing) {
    // Update the existing record's isApproved value
    await db.update(entranceAccess)
      .set({ isApproved })
      .where(and(
        eq(entranceAccess.district, district),
        eq(entranceAccess.blok, blok),
        eq(entranceAccess.vhod, vhod)
      ));
  } else {
    // Insert new record (unique index prevents duplicates)
    await db.insert(entranceAccess)
      .values({ district, blok, vhod, isApproved })
      .onDuplicateKeyUpdate({ set: { isApproved } });
  }
}

export async function checkEntranceApproved(district: string, blok: string, vhod: string): Promise<boolean> {
  const record = await getEntranceAccess(district, blok, vhod);
  // If no record exists, entrance is NOT approved by default
  return record?.isApproved === true;
}

export async function deleteEntranceAccess(district: string, blok: string, vhod: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(entranceAccess)
    .where(and(
      eq(entranceAccess.district, district),
      eq(entranceAccess.blok, blok),
      eq(entranceAccess.vhod, vhod)
    ));
}

/** Returns the first user (role='user') that has a non-null FCM token — used for FCM diagnostics */
export async function getFirstUserWithFcmToken(): Promise<{ id: number; name: string | null; fcmToken: string } | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({ id: users.id, name: users.name, fcmToken: users.fcmToken })
    .from(users)
    .where(eq(users.role, "user"))
    .limit(50);
  // Filter in JS to find first with non-null/non-empty token
  const found = rows.find((r) => r.fcmToken && r.fcmToken.length > 10);
  if (!found || !found.fcmToken) return null;
  return { id: found.id, name: found.name ?? null, fcmToken: found.fcmToken };
}

/** Updates the FCM token for a worker by workerId */
export async function updateWorkerFcmToken(workerId: number, fcmToken: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(workers).set({ fcmToken }).where(eq(workers.id, workerId));
}

// ─── Sub-Admins ───────────────────────────────────────────────────────────────

export async function createSubAdmin(data: InsertSubAdmin): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(subAdmins).values(data);
}

export async function getAllSubAdmins(): Promise<SubAdmin[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subAdmins).orderBy(asc(subAdmins.createdAt));
}

export async function getSubAdminByUsername(username: string): Promise<SubAdmin | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(subAdmins).where(eq(subAdmins.username, username)).limit(1);
  return result[0];
}

export async function getSubAdminById(id: number): Promise<SubAdmin | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(subAdmins).where(eq(subAdmins.id, id)).limit(1);
  return result[0];
}

export async function updateSubAdminPermissions(id: number, permissions: string[]): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const now = Math.floor(Date.now() / 1000);
  await db.update(subAdmins).set({ permissions, updatedAt: now }).where(eq(subAdmins.id, id));
}

export async function toggleSubAdminActive(id: number, isActive: boolean): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const now = Math.floor(Date.now() / 1000);
  await db.update(subAdmins).set({ isActive, updatedAt: now }).where(eq(subAdmins.id, id));
}

export async function deleteSubAdmin(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(subAdmins).where(eq(subAdmins.id, id));
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export async function createSubscription(data: InsertSubscription): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(subscriptions).values(data);
  return (result[0] as any).insertId ?? 0;
}

export async function getSubscriptionsByUser(userOpenId: string): Promise<Subscription[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subscriptions).where(eq(subscriptions.userOpenId, userOpenId)).orderBy(desc(subscriptions.createdAt));
}

export async function getActiveSubscriptionByUser(userOpenId: string): Promise<Subscription | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(subscriptions)
    .where(and(eq(subscriptions.userOpenId, userOpenId), eq(subscriptions.status, "active")))
    .limit(1);
  return result[0];
}

export async function getAllSubscriptions(): Promise<Subscription[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt));
}

export async function getSubscriptionById(id: number): Promise<Subscription | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(subscriptions).where(eq(subscriptions.id, id)).limit(1);
  return result[0];
}
export async function updateSubscriptionStripe(id: number, data: { stripeSubscriptionId?: string; stripeCustomerId?: string; currentPeriodEnd?: Date; status?: "active" | "cancelled" | "expired" }): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(subscriptions).set(data).where(eq(subscriptions.id, id));
}

export async function cancelSubscription(id: number, note?: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(subscriptions).set({ status: "cancelled", cancelledAt: new Date(), cancellationNote: note ?? null }).where(eq(subscriptions.id, id));
}

export async function getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(subscriptions).where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId)).limit(1);
  return result[0];
}

// ─── Subscription Visits ──────────────────────────────────────────────────────

export async function getTodayVisitsBySlot(today: string, timeSlot: "morning" | "evening"): Promise<(SubscriptionVisit & { subscription: Subscription })[]> {
  const db = await getDb();
  if (!db) return [];
  const visits = await db.select().from(subscriptionVisits)
    .where(and(eq(subscriptionVisits.visitDate, today), eq(subscriptionVisits.timeSlot, timeSlot), eq(subscriptionVisits.status, "pending")));
  const result = [];
  for (const v of visits) {
    const sub = await getSubscriptionById(v.subscriptionId);
    if (sub && sub.status === "active") result.push({ ...v, subscription: sub });
  }
  return result;
}

export async function markVisitCompleted(visitId: number, workerId: number, workerOpenId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(subscriptionVisits).set({ status: "completed", workerId, workerOpenId, completedAt: new Date() }).where(eq(subscriptionVisits.id, visitId));
}

export async function createDailyVisitsForSubscription(subscriptionId: number, today: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const sub = await getSubscriptionById(subscriptionId);
  if (!sub || sub.status !== "active") return;
  const existing = await db.select().from(subscriptionVisits)
    .where(and(eq(subscriptionVisits.subscriptionId, subscriptionId), eq(subscriptionVisits.visitDate, today)));
  if (existing.length > 0) return;
  await db.insert(subscriptionVisits).values({ subscriptionId, visitDate: today, timeSlot: sub.timeSlot });
}

// ─── Worker Subscription Preferences ─────────────────────────────────────────

export async function getWorkerSubscriptionPref(workerId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(workerSubscriptionPrefs).where(eq(workerSubscriptionPrefs.workerId, workerId)).limit(1);
  return result[0]?.acceptsSubscriptions ?? false;
}

export async function setWorkerSubscriptionPref(workerId: number, acceptsSubscriptions: boolean): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(workerSubscriptionPrefs).values({ workerId, acceptsSubscriptions })
    .onDuplicateKeyUpdate({ set: { acceptsSubscriptions } });
}
// ─── Request Messages (bidirectional chat thread) ─────────────────────────────

import { requestMessages, InsertRequestMessage, RequestMessage } from "../drizzle/schema";

export async function getMessagesByRequestId(requestId: number): Promise<RequestMessage[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(requestMessages)
    .where(eq(requestMessages.requestId, requestId))
    .orderBy(asc(requestMessages.createdAt));
}

export async function addRequestMessage(data: InsertRequestMessage): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(requestMessages).values(data);
  return (result[0] as any).insertId ?? 0;
}

// ─── Worker Quotes (admin edit) ───────────────────────────────────────────────

export async function adminEditQuote(
  quoteId: number,
  price: string,
  note: string | null,
  proposedDate: string | null,
  adminName: string,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(workerQuotes).set({
    price,
    note,
    proposedDate,
    adminEditedBy: adminName,
    adminEditedAt: new Date(),
  }).where(eq(workerQuotes.id, quoteId));
}

// ─── Web Push Subscriptions ───────────────────────────────────────────────────

export async function savePushSubscription(
  ownerKey: string,
  ownerType: "user" | "worker" | "admin",
  endpoint: string,
  p256dh: string,
  auth: string,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  await db.insert(pushSubscriptions).values({ ownerKey, ownerType, endpoint, p256dh, auth });
}

export async function getPushSubscriptionsByOwner(
  ownerKey: string,
): Promise<PushSubscriptionRow[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.ownerKey, ownerKey));
}

export async function getPushSubscriptionsByOwnerType(
  ownerType: "user" | "worker" | "admin",
): Promise<PushSubscriptionRow[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.ownerType, ownerType));
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

export async function getFirstPushSubscriptionByType(
  ownerType: "user" | "worker" | "admin",
): Promise<PushSubscriptionRow | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(pushSubscriptions)
    .where(eq(pushSubscriptions.ownerType, ownerType))
    .limit(1);
  return rows[0] ?? null;
}

// ─── Worker Assignments (Claim) ───────────────────────────────────────────────

export async function claimEntrance(
  workerId: number,
  workerOpenId: string,
  district: string,
  blok: string,
  vhod: string,
): Promise<{ success: boolean; alreadyClaimed: boolean }> {
  const db = await getDb();
  if (!db) return { success: false, alreadyClaimed: false };
  // Check if already claimed by someone else
  const existing = await db.select().from(workerAssignments)
    .where(and(eq(workerAssignments.district, district), eq(workerAssignments.blok, blok), eq(workerAssignments.vhod, vhod)))
    .limit(1);
  if (existing.length > 0 && existing[0].workerOpenId !== workerOpenId) {
    return { success: false, alreadyClaimed: true };
  }
  if (existing.length > 0 && existing[0].workerOpenId === workerOpenId) {
    return { success: true, alreadyClaimed: false }; // already owned by this worker
  }
  await db.insert(workerAssignments).values({ workerId, workerOpenId, district, blok, vhod });
  return { success: true, alreadyClaimed: false };
}

export async function unclaimEntrance(
  workerOpenId: string,
  district: string,
  blok: string,
  vhod: string,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(workerAssignments).where(
    and(
      eq(workerAssignments.workerOpenId, workerOpenId),
      eq(workerAssignments.district, district),
      eq(workerAssignments.blok, blok),
      eq(workerAssignments.vhod, vhod),
    )
  );
}

export async function getWorkerAssignments(workerOpenId: string): Promise<WorkerAssignment[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workerAssignments).where(eq(workerAssignments.workerOpenId, workerOpenId));
}

export async function getAllAssignments(): Promise<WorkerAssignment[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workerAssignments);
}

export async function getAssignmentByEntrance(
  district: string, blok: string, vhod: string,
): Promise<WorkerAssignment | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(workerAssignments)
    .where(and(eq(workerAssignments.district, district), eq(workerAssignments.blok, blok), eq(workerAssignments.vhod, vhod)))
    .limit(1);
  return rows[0] ?? null;
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

export async function deleteOldCompletedRequests(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 6);
  const allCompleted = await db.select({ id: requests.id, updatedAt: requests.updatedAt })
    .from(requests)
    .where(eq(requests.status, "completed"));
  const allCancelled = await db.select({ id: requests.id, updatedAt: requests.updatedAt })
    .from(requests)
    .where(eq(requests.status, "cancelled"));
  const toDelete = [...allCompleted, ...allCancelled].filter(r => r.updatedAt && new Date(r.updatedAt) < cutoff);
  if (toDelete.length === 0) return 0;
  for (const r of toDelete) {
    await db.delete(requests).where(eq(requests.id, r.id));
  }
  return toDelete.length;
}
