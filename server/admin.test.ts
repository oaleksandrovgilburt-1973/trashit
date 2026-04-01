import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Mock DB helpers ──────────────────────────────────────────────────────────
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getAllWorkersWithStats: vi.fn(async () => [
      { id: 1, openId: "w1", name: "Работник 1", username: "worker1", isActive: true, completedCount: 5, createdAt: new Date() },
    ]),
    getAllDistricts: vi.fn(async () => [
      { id: 1, name: "Младост", isActive: true, createdAt: new Date() },
      { id: 2, name: "Люлин", isActive: false, createdAt: new Date() },
    ]),
    getActiveBlocksWithAccess: vi.fn(async () => [
      { district: "Младост", blok: "358", vhod: "В", requestCount: 3, contactPhone: "+359888123456", contactEmail: null },
    ]),
    getAllTransactions: vi.fn(async () => [
      { id: 1, userOpenId: "u1", type: "purchase", creditType: "standard", totalAmount: "10.00", note: null, createdAt: new Date() },
    ]),
    getAllWorkerProblems: vi.fn(async () => [
      { id: 1, workerOpenId: "w1", workerName: "Работник 1", requestId: 42, description: "Не мога да вляза в блока", imageUrl: null, status: "open", adminNotes: null, createdAt: new Date() },
    ]),
    countOpenProblems: vi.fn(async () => 1),
    resolveWorkerProblem: vi.fn(async () => {}),
    forwardProblemToClient: vi.fn(async () => {}),
    deactivateWorker: vi.fn(async () => {}),
    activateWorker: vi.fn(async () => {}),
    deleteWorkerAccount: vi.fn(async () => {}),
    getAllSettings: vi.fn(async () => ({ contact_phone: "+359 88 888 8888", contact_email: "trashit.bg@gmail.com" })),
    upsertSetting: vi.fn(async () => {}),
    getAllRequests: vi.fn(async () => []),
    getUsersByRole: vi.fn(async () => []),
    getAllUsers: vi.fn(async () => []),
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeAdminCtx(): TrpcContext {
  return {
    user: {
      id: 1, openId: "admin-open-id", name: "Admin", email: "admin@trashit.bg",
      loginMethod: "admin", role: "admin",
      createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: { cookie: "trashit_admin_session=test-admin-session-token-for-tests" } } as TrpcContext["req"],
    res: { clearCookie: vi.fn(), cookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeWorkerCtx(): TrpcContext {
  return {
    user: {
      id: 2, openId: "worker-open-id", name: "Работник", email: null,
      loginMethod: "worker", role: "worker",
      createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn(), cookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("Admin Panel — Workers Management", () => {
  it("lists workers with stats for admin", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const workers = await caller.workersMgmt.listWithStats();
    expect(Array.isArray(workers)).toBe(true);
    expect(workers[0]).toMatchObject({ name: "Работник 1", username: "worker1", isActive: true });
  });

  it("forbids non-admin from listing workers", async () => {
    const caller = appRouter.createCaller(makeWorkerCtx());
    await expect(caller.workersMgmt.listWithStats()).rejects.toThrow();
  });

  it("deactivates a worker", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.workersMgmt.deactivate({ id: 1 });
    expect(result).toMatchObject({ success: true });
  });

  it("activates a worker", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.workersMgmt.activate({ id: 1 });
    expect(result).toMatchObject({ success: true });
  });
});

describe("Admin Panel — Districts", () => {
  it("lists all districts including inactive", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const districts = await caller.districts.listAll();
    expect(districts).toHaveLength(2);
    expect(districts.find(d => d.name === "Люлин")?.isActive).toBe(false);
  });

  it("forbids non-admin from listing all districts", async () => {
    const caller = appRouter.createCaller(makeWorkerCtx());
    await expect(caller.districts.listAll()).rejects.toThrow();
  });
});

describe("Admin Panel — Block Access", () => {
  it("lists active blocks with contact info", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const blocks = await caller.blockAccess.list();
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ district: "Младост", blok: "358", vhod: "В", requestCount: 3 });
  });
});

describe("Admin Panel — Credits", () => {
  it("lists all transactions for admin", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const txs = await caller.credits.allTransactions();
    expect(txs).toHaveLength(1);
    expect(txs[0].type).toBe("purchase");
  });
});

describe("Admin Panel — Problems", () => {
  it("lists all worker problems for admin", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const problems = await caller.problems.list();
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({ description: "Не мога да вляза в блока", status: "open" });
  });

  it("counts open problems", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.problems.countOpen();
    expect(result).toMatchObject({ count: expect.any(Number) });
  });

  it("resolves a problem", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.problems.resolve({ id: 1, adminNotes: "Разрешено" });
    expect(result).toMatchObject({ success: true });
  });

  it("forwards a problem to client", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.problems.forwardToClient({ id: 1, adminNotes: "Проблем с достъп" });
    expect(result).toMatchObject({ success: true });
  });

  it("forbids non-admin from listing problems", async () => {
    const caller = appRouter.createCaller(makeWorkerCtx());
    await expect(caller.problems.list()).rejects.toThrow();
  });
});

describe("Admin Panel — Settings", () => {
  it("returns all settings for admin", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const settings = await caller.settings.getAll();
    expect(settings).toMatchObject({ contact_phone: "+359 88 888 8888" });
  });
});

describe("Admin Panel — Dashboard Stats", () => {
  it("returns dashboard stats for admin", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const stats = await caller.adminDashboard.getStats();
    expect(stats).toMatchObject({
      activeTodayCount: expect.any(Number),
      completedTodayCount: expect.any(Number),
      totalRequestsCount: expect.any(Number),
      totalRevenue: expect.any(Number),
      topDistricts: expect.any(Array),
      registeredUsersCount: expect.any(Number),
      activeWorkersCount: expect.any(Number),
    });
  });

  it("calculates totalRevenue from purchase transactions only", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const stats = await caller.adminDashboard.getStats();
    // Mock has 1 purchase transaction with totalAmount "10.00"
    expect(stats.totalRevenue).toBe(10);
  });

  it("counts active workers correctly", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const stats = await caller.adminDashboard.getStats();
    // Mock has 1 active worker
    expect(stats.activeWorkersCount).toBe(1);
  });

  it("forbids non-admin from accessing dashboard stats", async () => {
    const caller = appRouter.createCaller(makeWorkerCtx());
    await expect(caller.adminDashboard.getStats()).rejects.toThrow();
  });
});
