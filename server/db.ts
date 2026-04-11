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
// ─── FCM Diagnostics ──────────────────────────────────────────────────────────
export async function getFirstUserWithFcmToken(): Promise<{ id: number; name: string | null; fcmToken: string } | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({ id: users.id, name: users.name, fcmToken: users.fcmToken })
    .from(users)
    .where(eq(users.role, "user"))
    .limit(50);
  const found = rows.find((r) => r.fcmToken && r.fcmToken.length > 10);
  if (!found || !found.fcmToken) return null;
  return { id: found.id, name: found.name ?? null, fcmToken: found.fcmToken };
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

export async function completeRequestsByEntrance(
  district: string, blok: string, vhod: string,
  workerOpenId: string, workerId: number
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  // Get all pending requests for this entrance
  const pending = await db.select().from(requests).where(
    and(
      eq(requests.district, district),
      eq(requests.blok, blok),
      eq(requests.vhod, vhod),
      eq(requests.status, "pending")
    )
  );
  if (pending.length === 0) return 0;
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
      eq(requests.status, "pending")
    )
  );
  return pending.length;
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

export async function updateWorkerProblem(id: number, data: Partial<{ status: "open" | "resolved" | "forwarded"; adminNotes: string; resolvedAt: Date; forwardedToClientAt: Date }>) {
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
  // Get unique district+blok+vhod combos from pending requests
  const pendingReqs = await db.select().from(requests)
    .where(eq(requests.status, "pending"))
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
  const allPending = await db.select().from(requests)
    .where(eq(requests.status, "pending"))
    .orderBy(requests.district, requests.blok, requests.vhod, requests.etaj, requests.apartament);
  return allPending.filter(r => districtNames.includes(r.district));
}
