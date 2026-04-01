import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", () => ({
  getUserByEmail: vi.fn(),
  getUserByOpenId: vi.fn(),
  getWorkerByUsername: vi.fn(),
  getWorkerByOpenId: vi.fn(),
  getWorkerSession: vi.fn(),
  getWorkerSessionCount: vi.fn(),
  addWorkerSession: vi.fn(),
  removeOldestWorkerSession: vi.fn(),
  updateWorkerLastSignedIn: vi.fn(),
  updateWorkerPassword: vi.fn(),
  getAllWorkers: vi.fn(),
  getAdminConfig: vi.fn(),
  initAdminConfig: vi.fn(),
  updateAdminConfig: vi.fn(),
  upsertUser: vi.fn(),
  createWorker: vi.fn(),
  getAllSettings: vi.fn(),
  getAllUsers: vi.fn(),
  getUsersByRole: vi.fn(),
  getSetting: vi.fn(),
  upsertSetting: vi.fn(),
  updateUserRole: vi.fn(),
  updateUserCredits: vi.fn(),
  updateUserProfile: vi.fn(),
  getDb: vi.fn(),
}));

import * as db from "./db";

function createPublicCtx(): TrpcContext {
  const cookies: Record<string, string> = {};
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string) => { cookies[name] = value; },
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("clientAuth.register", () => {
  beforeEach(() => vi.clearAllMocks());

  it("registers a new user and grants 2 bonus credits", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue(undefined);
    vi.mocked(db.upsertUser).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.clientAuth.register({
      name: "Иван Иванов",
      email: "ivan@example.com",
      password: "password123",
    });

    expect(result.success).toBe(true);
    expect(result.bonusCredits).toBe("2.00");
    expect(db.upsertUser).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Иван Иванов",
        email: "ivan@example.com",
        role: "user",
        creditsStandard: "2.00",
        credits: "2.00",
        bonusGranted: true,
      })
    );
  });

  it("rejects duplicate email registration", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue({
      id: 1, openId: "existing", email: "ivan@example.com",
      name: "Existing", phone: null, loginMethod: "email",
      role: "user", credits: "0.00", creditsStandard: "0.00",
      creditsRecycling: "0.00", addressKvartal: null, addressBlok: null,
      addressVhod: null, addressEtaj: null, addressApartament: null,
      addressCity: null, passwordHash: "hash", isFirstLogin: false,
      bonusGranted: true, createdAt: new Date(), updatedAt: new Date(),
      lastSignedIn: new Date(),
    });

    const caller = appRouter.createCaller(createPublicCtx());
    await expect(
      caller.clientAuth.register({ name: "Test", email: "ivan@example.com", password: "password123" })
    ).rejects.toThrow();
  });

  it("rejects password shorter than 6 characters", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    await expect(
      caller.clientAuth.register({ name: "Test", email: "test@test.com", password: "123" })
    ).rejects.toThrow();
  });
});

describe("clientAuth.login", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects login with wrong password", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue({
      id: 1, openId: "user1", email: "ivan@example.com",
      name: "Ivan", phone: null, loginMethod: "email",
      role: "user", credits: "2.00", creditsStandard: "2.00",
      creditsRecycling: "0.00", addressKvartal: null, addressBlok: null,
      addressVhod: null, addressEtaj: null, addressApartament: null,
      addressCity: null,
      // bcrypt hash of "correctpassword"
      passwordHash: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy",
      isFirstLogin: false, bonusGranted: true,
      createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    });

    const caller = appRouter.createCaller(createPublicCtx());
    await expect(
      caller.clientAuth.login({ email: "ivan@example.com", password: "wrongpassword" })
    ).rejects.toThrow();
  });

  it("rejects login for non-existent user", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(createPublicCtx());
    await expect(
      caller.clientAuth.login({ email: "nobody@example.com", password: "password123" })
    ).rejects.toThrow();
  });
});

describe("workerAuth.login", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects inactive worker login", async () => {
    vi.mocked(db.getWorkerByUsername).mockResolvedValue({
      id: 1, openId: "worker1", name: "Worker", username: "worker1",
      passwordHash: "hash", mustChangePassword: false, isActive: false,
      activeDistricts: [], deviceTokens: [], createdByAdmin: true,
      createdAt: new Date(), updatedAt: new Date(), lastSignedIn: null,
    });

    const caller = appRouter.createCaller(createPublicCtx());
    await expect(
      caller.workerAuth.login({ username: "worker1", password: "pass" })
    ).rejects.toThrow();
  });

  it("rejects non-existent worker", async () => {
    vi.mocked(db.getWorkerByUsername).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(createPublicCtx());
    await expect(
      caller.workerAuth.login({ username: "nobody", password: "pass" })
    ).rejects.toThrow();
  });
});

describe("adminAuth.login", () => {
  beforeEach(() => vi.clearAllMocks());

  it("blocks default admin/admin when defaultBlocked is true", async () => {
    vi.mocked(db.getAdminConfig).mockResolvedValue({
      id: 1, username: "customadmin",
      passwordHash: "$2a$10$somehashedpassword",
      defaultBlocked: true,
      updatedAt: new Date(),
    });

    const caller = appRouter.createCaller(createPublicCtx());
    await expect(
      caller.adminAuth.login({ username: "admin", password: "admin" })
    ).rejects.toThrow();
  });

  it("rejects wrong admin credentials", async () => {
    vi.mocked(db.getAdminConfig).mockResolvedValue({
      id: 1, username: "admin",
      passwordHash: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy",
      defaultBlocked: false,
      updatedAt: new Date(),
    });

    const caller = appRouter.createCaller(createPublicCtx());
    await expect(
      caller.adminAuth.login({ username: "admin", password: "wrongpassword" })
    ).rejects.toThrow();
  });
});

describe("clientAuth.registerPhone", () => {
  beforeEach(() => vi.clearAllMocks());

  it("registers with phone and grants bonus credits", async () => {
    vi.mocked(db.upsertUser).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.clientAuth.registerPhone({
      name: "Мария Петрова",
      phone: "+359888123456",
    });

    expect(result.success).toBe(true);
    expect(result.bonusCredits).toBe("2.00");
    expect(db.upsertUser).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Мария Петрова",
        phone: "+359888123456",
        loginMethod: "phone",
        credits: "2.00",
        bonusGranted: true,
      })
    );
  });

  it("rejects invalid phone number (too short)", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    await expect(
      caller.clientAuth.registerPhone({ name: "Test", phone: "123" })
    ).rejects.toThrow();
  });
});
