import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", () => ({
  getDb: vi.fn(),
  getUserByOpenId: vi.fn(),
  getUserByEmail: vi.fn(),
  getAdminConfig: vi.fn(),
  getWorkerByUsername: vi.fn(),
  getWorkerByToken: vi.fn(),
  createTransaction: vi.fn(),
  getTransactionsByUser: vi.fn(),
  getAllTransactions: vi.fn(),
  getTransactionByStripeSession: vi.fn(),
  createCleaningRequest: vi.fn(),
  getCleaningRequestsByUser: vi.fn(),
  getAllCleaningRequests: vi.fn(),
  upsertUser: vi.fn(),
  updateUserCredits: vi.fn(),
  createRequest: vi.fn(),
  getRequestsByUser: vi.fn(),
  getPendingRequests: vi.fn(),
  completeRequest: vi.fn(),
  cancelRequest: vi.fn(),
  getAllRequests: vi.fn(),
  getActiveDistricts: vi.fn(),
  getAllDistricts: vi.fn(),
  createDistrict: vi.fn(),
  toggleDistrictActive: vi.fn(),
  deleteDistrict: vi.fn(),
  getSettings: vi.fn(),
  updateSetting: vi.fn(),
  getAllSettings: vi.fn(),
}));

import * as db from "./db";

function createUserContext(role: "user" | "admin" | "worker" = "user"): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user-openid",
      name: "Test User",
      email: "test@example.com",
      loginMethod: "email",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: { origin: "https://example.com" } } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createGuestContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("credits.packages", () => {
  it("returns standard and recycling packages", async () => {
    const ctx = createGuestContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.credits.packages();
    expect(result.standard).toBeDefined();
    expect(result.recycling).toBeDefined();
    expect(result.standard.length).toBeGreaterThan(0);
    expect(result.recycling.length).toBeGreaterThan(0);
  });

  it("standard packages have correct pricing", async () => {
    const ctx = createGuestContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.credits.packages();
    const pkg10 = result.standard.find((p: any) => p.credits === 10);
    expect(pkg10).toBeDefined();
    expect(pkg10.bonus).toBe(2);
    expect(pkg10.total).toBe(12);
    expect(pkg10.price).toBe(6.90);
  });

  it("recycling packages have correct pricing", async () => {
    const ctx = createGuestContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.credits.packages();
    const pkg20 = result.recycling.find((p: any) => p.credits === 20);
    expect(pkg20).toBeDefined();
    expect(pkg20.bonus).toBe(3);
    expect(pkg20.total).toBe(23);
    expect(pkg20.price).toBe(19.80);
  });
});

describe("credits.history", () => {
  beforeEach(() => {
    vi.mocked(db.getTransactionsByUser).mockResolvedValue([]);
  });

  it("returns empty array for user with no transactions", async () => {
    const ctx = createUserContext("user");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.credits.history();
    expect(result).toEqual([]);
  });

  it("throws UNAUTHORIZED for unauthenticated users", async () => {
    const ctx = createGuestContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.credits.history()).rejects.toThrow();
  });
});

describe("cleaning.create", () => {
  beforeEach(() => {
    vi.mocked(db.createCleaningRequest).mockResolvedValue(undefined);
  });

  it("creates a cleaning request for entrances type", async () => {
    const ctx = createUserContext("user");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.cleaning.create({
      type: "entrances",
      floors: 8,
      aptsPerFloor: 4,
      contactPhone: "+359888888888",
    });
    expect(result.success).toBe(true);
    expect(db.createCleaningRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "entrances",
        floors: 8,
        aptsPerFloor: 4,
      })
    );
  });

  it("creates a cleaning request for residence type", async () => {
    const ctx = createUserContext("user");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.cleaning.create({
      type: "residence",
      rooms: 3,
      sqm: 75,
      residenceType: "apartment",
      contactEmail: "test@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("creates a cleaning request for other type", async () => {
    const ctx = createUserContext("user");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.cleaning.create({
      type: "other",
      description: "Office cleaning needed",
      proposedPrice: 150,
      contactPhone: "+359888888888",
    });
    expect(result.success).toBe(true);
  });

  it("throws UNAUTHORIZED for unauthenticated users", async () => {
    const ctx = createGuestContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.cleaning.create({
      type: "entrances",
      contactPhone: "+359888888888",
    })).rejects.toThrow();
  });
});

describe("cleaning.myList", () => {
  beforeEach(() => {
    vi.mocked(db.getCleaningRequestsByUser).mockResolvedValue([]);
  });

  it("returns empty array for user with no cleaning requests", async () => {
    const ctx = createUserContext("user");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.cleaning.myList();
    expect(result).toEqual([]);
  });
});
