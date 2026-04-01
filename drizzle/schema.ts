import {
  boolean,
  decimal,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Core users (Manus OAuth + email/password clients) ───────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier or generated uid for email-registered users */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "worker"]).default("user").notNull(),

  /** Credits */
  credits: decimal("credits", { precision: 10, scale: 2 }).default("0.00").notNull(),
  creditsStandard: decimal("creditsStandard", { precision: 10, scale: 2 }).default("0.00").notNull(),
  creditsRecycling: decimal("creditsRecycling", { precision: 10, scale: 2 }).default("0.00").notNull(),

  /** Address fields */
  addressKvartal: varchar("addressKvartal", { length: 128 }),
  addressBlok: varchar("addressBlok", { length: 64 }),
  addressVhod: varchar("addressVhod", { length: 32 }),
  addressEtaj: varchar("addressEtaj", { length: 16 }),
  addressApartament: varchar("addressApartament", { length: 16 }),
  addressCity: varchar("addressCity", { length: 128 }),

  /** Auth extras */
  passwordHash: varchar("passwordHash", { length: 256 }),
  isFirstLogin: boolean("isFirstLogin").default(true).notNull(),
  bonusGranted: boolean("bonusGranted").default(false).notNull(),

  /** Firebase Cloud Messaging token for push notifications */
  fcmToken: varchar("fcmToken", { length: 512 }),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Workers (created by admin only) ─────────────────────────────────────────
export const workers = mysqlTable("workers", {
  id: int("id").autoincrement().primaryKey(),
  /** Reference to users.openId */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name").notNull(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 256 }).notNull(),
  /** Must change password on first login */
  mustChangePassword: boolean("mustChangePassword").default(true).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  /** JSON array of district strings */
  activeDistricts: json("activeDistricts").$type<string[]>().default([]),
  /** JSON array of device token strings (max 4) */
  deviceTokens: json("deviceTokens").$type<string[]>().default([]),
  createdByAdmin: boolean("createdByAdmin").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn"),
});

export type Worker = typeof workers.$inferSelect;
export type InsertWorker = typeof workers.$inferInsert;

// ─── Admin config (single row) ────────────────────────────────────────────────
export const adminConfig = mysqlTable("admin_config", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 64 }).notNull().default("admin"),
  passwordHash: varchar("passwordHash", { length: 256 }).notNull(),
  /** Once credentials are changed, default admin/admin is blocked */
  defaultBlocked: boolean("defaultBlocked").default(false).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AdminConfig = typeof adminConfig.$inferSelect;
export type InsertAdminConfig = typeof adminConfig.$inferInsert;

// ─── App settings ─────────────────────────────────────────────────────────────
export const settings = mysqlTable("settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 128 }).notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;

// ─── Worker sessions (device token tracking) ─────────────────────────────────
export const workerSessions = mysqlTable("worker_sessions", {
  id: int("id").autoincrement().primaryKey(),
  workerId: int("workerId").notNull(),
  deviceToken: varchar("deviceToken", { length: 256 }).notNull().unique(),
  deviceName: varchar("deviceName", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastUsed: timestamp("lastUsed").defaultNow().onUpdateNow().notNull(),
});

export type WorkerSession = typeof workerSessions.$inferSelect;

// ─── Districts (admin-managed) ────────────────────────────────────────────────
export const districts = mysqlTable("districts", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull().unique(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type District = typeof districts.$inferSelect;
export type InsertDistrict = typeof districts.$inferInsert;

// ─── Waste Disposal Requests ──────────────────────────────────────────────────
export const requests = mysqlTable("requests", {
  id: int("id").autoincrement().primaryKey(),
  /** Type of waste */
  type: mysqlEnum("type", ["standard", "recycling", "nonstandard", "construction"]).notNull(),
  /** Status of request */
  status: mysqlEnum("status", ["pending", "assigned", "completed", "cancelled"]).default("pending").notNull(),
  /** User who created the request */
  userId: int("userId").notNull(),
  userOpenId: varchar("userOpenId", { length: 64 }).notNull(),
  /** Optional description */
  description: text("description"),
  /** Location fields */
  district: varchar("district", { length: 128 }).notNull(),
  blok: varchar("blok", { length: 64 }).notNull(),
  vhod: varchar("vhod", { length: 32 }).notNull(),
  etaj: varchar("etaj", { length: 16 }).notNull(),
  apartament: varchar("apartament", { length: 16 }).notNull(),
  /** Contact — at least one required */
  contactPhone: varchar("contactPhone", { length: 32 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  /** GPS coordinates (optional, visible only to worker/admin) */
  gpsLat: decimal("gpsLat", { precision: 10, scale: 7 }),
  gpsLng: decimal("gpsLng", { precision: 10, scale: 7 }),
  /** Image for non-standard/construction waste */
  imageUrl: text("imageUrl"),
  /** Estimated volume from AI vision (placeholder) */
  estimatedVolume: varchar("estimatedVolume", { length: 64 }),
  estimatedVolumeDescription: text("estimatedVolumeDescription"),
  /** Credits deducted */
  creditsUsed: decimal("creditsUsed", { precision: 10, scale: 2 }).default("0.00").notNull(),
  creditType: mysqlEnum("creditType", ["standard", "recycling", "none"]).default("none").notNull(),
  /** Worker assigned */
  workerId: int("workerId"),
  workerOpenId: varchar("workerOpenId", { length: 64 }),
  /** Problem flag — set when worker reports a problem on this request */
  hasProblem: boolean("hasProblem").default(false).notNull(),
  problemDescription: text("problemDescription"),
  /** Timestamps */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type Request = typeof requests.$inferSelect;
export type InsertRequest = typeof requests.$inferInsert;

// ─── Cleaning Requests ────────────────────────────────────────────────────────
export const cleaningRequests = mysqlTable("cleaning_requests", {
  id: int("id").autoincrement().primaryKey(),
  /** Type: entrances / residence / other */
  type: mysqlEnum("type", ["entrances", "residence", "other"]).notNull(),
  status: mysqlEnum("status", ["pending", "reviewed", "completed", "cancelled"]).default("pending").notNull(),
  userId: int("userId").notNull(),
  userOpenId: varchar("userOpenId", { length: 64 }).notNull(),
  /** Entrances type fields */
  floors: int("floors"),
  aptsPerFloor: int("aptsPerFloor"),
  /** Residence type fields */
  rooms: int("rooms"),
  sqm: decimal("sqm", { precision: 8, scale: 2 }),
  residenceType: mysqlEnum("residenceType", ["apartment", "house"]),
  requirements: text("requirements"),
  /** Other type fields */
  description: text("description"),
  imageUrl: text("imageUrl"),
  proposedPrice: decimal("proposedPrice", { precision: 10, scale: 2 }),
  estimatedVolume: varchar("estimatedVolume", { length: 64 }),
  /** Contact */
  contactPhone: varchar("contactPhone", { length: 32 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  /** Address */
  district: varchar("district", { length: 128 }),
  address: text("address"),
  /** Admin notes */
  adminNotes: text("adminNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CleaningRequest = typeof cleaningRequests.$inferSelect;
export type InsertCleaningRequest = typeof cleaningRequests.$inferInsert;

// ─── Transactions (credits purchase, transfer, deduction) ────────────────────
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  userOpenId: varchar("userOpenId", { length: 64 }).notNull(),
  /** Type of transaction */
  type: mysqlEnum("type", ["purchase", "transfer_in", "transfer_out", "deduction", "bonus", "admin_add", "admin_deduct"]).notNull(),
  /** Which credit type is affected */
  creditType: mysqlEnum("creditType", ["standard", "recycling"]).notNull(),
  /** Base amount purchased/transferred (without bonus) */
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  /** Bonus credits added (for package purchases) */
  bonusAmount: decimal("bonusAmount", { precision: 10, scale: 2 }).default("0.00").notNull(),
  /** Total credits added/removed */
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),
  /** Price paid in EUR (for purchases) */
  pricePaid: decimal("pricePaid", { precision: 10, scale: 2 }),
  /** Stripe session ID for purchases */
  stripeSessionId: varchar("stripeSessionId", { length: 256 }),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 256 }),
  /** For transfers: the other user */
  transferToUserId: int("transferToUserId"),
  transferToOpenId: varchar("transferToOpenId", { length: 64 }),
  transferFromUserId: int("transferFromUserId"),
  transferFromOpenId: varchar("transferFromOpenId", { length: 64 }),
  /** Related request ID (for deductions) */
  requestId: int("requestId"),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

// ─── Worker Problem Reports ───────────────────────────────────────────────────
export const workerProblems = mysqlTable("worker_problems", {
  id: int("id").autoincrement().primaryKey(),
  workerId: int("workerId").notNull(),
  workerOpenId: varchar("workerOpenId", { length: 64 }).notNull(),
  workerName: varchar("workerName", { length: 128 }),
  requestId: int("requestId"),
  imageUrl: text("imageUrl"),
  description: text("description").notNull(),
  status: mysqlEnum("status", ["open", "resolved", "forwarded"]).default("open").notNull(),
  adminNotes: text("adminNotes"),
  forwardedToClientAt: timestamp("forwardedToClientAt"),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WorkerProblem = typeof workerProblems.$inferSelect;
export type InsertWorkerProblem = typeof workerProblems.$inferInsert;

// ─── Worker District Preferences ─────────────────────────────────────────────
export const workerDistricts = mysqlTable("worker_districts", {
  id: int("id").autoincrement().primaryKey(),
  workerId: int("workerId").notNull(),
  workerOpenId: varchar("workerOpenId", { length: 64 }).notNull(),
  districtName: varchar("districtName", { length: 128 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorkerDistrict = typeof workerDistricts.$inferSelect;
export type InsertWorkerDistrict = typeof workerDistricts.$inferInsert;

