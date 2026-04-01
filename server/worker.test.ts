import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getWorkerSession: vi.fn(),
    getAllWorkers: vi.fn(),
    getWorkerDistricts: vi.fn(),
    setWorkerDistricts: vi.fn(),
    getRequestsByDistricts: vi.fn(),
    completeRequest: vi.fn(),
    completeRequestsByEntrance: vi.fn(),
    createWorkerProblem: vi.fn(),
  };
});

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

import {
  getWorkerSession, getAllWorkers, getWorkerDistricts,
  setWorkerDistricts, getRequestsByDistricts,
  completeRequest, completeRequestsByEntrance, createWorkerProblem,
} from "./db";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DEVICE_TOKEN = "test-device-token-abc123";
const WORKER = {
  id: 1, openId: "worker-open-id", name: "Иван Работника",
  username: "ivan", passwordHash: "hash", mustChangePassword: false,
  isActive: true, createdByAdmin: true, activeDistricts: [],
  deviceTokens: [], createdAt: new Date(), updatedAt: new Date(),
};

function makePublicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("workerDistricts.getMyDistricts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns districts for valid session", async () => {
    vi.mocked(getWorkerSession).mockResolvedValue({ id: 1, workerId: 1, deviceToken: DEVICE_TOKEN, deviceName: "Phone", createdAt: new Date() });
    vi.mocked(getAllWorkers).mockResolvedValue([WORKER]);
    vi.mocked(getWorkerDistricts).mockResolvedValue(["Младост", "Люлин"]);

    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.workerDistricts.getMyDistricts({ deviceToken: DEVICE_TOKEN });

    expect(result).toEqual(["Младост", "Люлин"]);
  });

  it("throws UNAUTHORIZED for invalid session", async () => {
    vi.mocked(getWorkerSession).mockResolvedValue(null);

    const caller = appRouter.createCaller(makePublicCtx());
    await expect(
      caller.workerDistricts.getMyDistricts({ deviceToken: "bad-token" })
    ).rejects.toThrow("Невалидна сесия");
  });
});

describe("workerDistricts.setMyDistricts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("saves districts for valid session", async () => {
    vi.mocked(getWorkerSession).mockResolvedValue({ id: 1, workerId: 1, deviceToken: DEVICE_TOKEN, deviceName: "Phone", createdAt: new Date() });
    vi.mocked(getAllWorkers).mockResolvedValue([WORKER]);
    vi.mocked(setWorkerDistricts).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.workerDistricts.setMyDistricts({
      deviceToken: DEVICE_TOKEN,
      districts: ["Младост", "Люлин", "Надежда"],
    });

    expect(result).toEqual({ success: true });
    expect(setWorkerDistricts).toHaveBeenCalledWith(1, "worker-open-id", ["Младост", "Люлин", "Надежда"]);
  });
});

describe("workerDistricts.getRequestsForMyDistricts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty object when worker has no districts", async () => {
    vi.mocked(getWorkerSession).mockResolvedValue({ id: 1, workerId: 1, deviceToken: DEVICE_TOKEN, deviceName: "Phone", createdAt: new Date() });
    vi.mocked(getAllWorkers).mockResolvedValue([WORKER]);
    vi.mocked(getWorkerDistricts).mockResolvedValue([]);

    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.workerDistricts.getRequestsForMyDistricts({ deviceToken: DEVICE_TOKEN });
    expect(result).toEqual({});
  });

  it("returns grouped requests when worker has districts", async () => {
    vi.mocked(getWorkerSession).mockResolvedValue({ id: 1, workerId: 1, deviceToken: DEVICE_TOKEN, deviceName: "Phone", createdAt: new Date() });
    vi.mocked(getAllWorkers).mockResolvedValue([WORKER]);
    vi.mocked(getWorkerDistricts).mockResolvedValue(["Младост"]);
    vi.mocked(getRequestsByDistricts).mockResolvedValue([
      {
        id: 1, type: "standard", status: "pending", district: "Младост",
        blok: "358", vhod: "В", etaj: "3", apartament: "23",
        contactPhone: "0888123456", contactEmail: null,
        gpsLat: null, gpsLng: null, imageUrl: null, estimatedVolume: null,
        description: null, createdAt: new Date(), userId: 1,
        userOpenId: "user-1", creditsUsed: 1, creditType: "standard",
        completedBy: null, completedAt: null, cancelledAt: null,
      } as any,
    ]);

    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.workerDistricts.getRequestsForMyDistricts({ deviceToken: DEVICE_TOKEN });

    expect(result).toHaveProperty("Младост");
    expect((result as any)["Младост"]).toHaveProperty("358");
    expect((result as any)["Младост"]["358"]).toHaveProperty("В");
    expect((result as any)["Младост"]["358"]["В"]).toHaveLength(1);
  });
});

describe("workerDistricts.completeRequest", () => {
  beforeEach(() => vi.clearAllMocks());

  it("completes a request for valid worker session", async () => {
    vi.mocked(getWorkerSession).mockResolvedValue({ id: 1, workerId: 1, deviceToken: DEVICE_TOKEN, deviceName: "Phone", createdAt: new Date() });
    vi.mocked(getAllWorkers).mockResolvedValue([WORKER]);
    vi.mocked(completeRequest).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.workerDistricts.completeRequest({ deviceToken: DEVICE_TOKEN, requestId: 42 });

    expect(result).toEqual({ success: true });
    expect(completeRequest).toHaveBeenCalledWith(42, "worker-open-id", 1);
  });
});

describe("workerDistricts.completeEntrance", () => {
  beforeEach(() => vi.clearAllMocks());

  it("completes all requests from an entrance", async () => {
    vi.mocked(getWorkerSession).mockResolvedValue({ id: 1, workerId: 1, deviceToken: DEVICE_TOKEN, deviceName: "Phone", createdAt: new Date() });
    vi.mocked(getAllWorkers).mockResolvedValue([WORKER]);
    vi.mocked(completeRequestsByEntrance).mockResolvedValue(3);

    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.workerDistricts.completeEntrance({
      deviceToken: DEVICE_TOKEN,
      district: "Младост",
      blok: "358",
      vhod: "В",
    });

    expect(result).toEqual({ success: true, count: 3 });
    expect(completeRequestsByEntrance).toHaveBeenCalledWith("Младост", "358", "В", "worker-open-id", 1);
  });
});

describe("workerDistricts.reportProblem", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reports a problem and notifies admin", async () => {
    vi.mocked(getWorkerSession).mockResolvedValue({ id: 1, workerId: 1, deviceToken: DEVICE_TOKEN, deviceName: "Phone", createdAt: new Date() });
    vi.mocked(getAllWorkers).mockResolvedValue([WORKER]);
    vi.mocked(createWorkerProblem).mockResolvedValue(7);

    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.workerDistricts.reportProblem({
      deviceToken: DEVICE_TOKEN,
      requestId: 10,
      description: "Пликът е разкъсан и съдържанието е разпиляно.",
    });

    expect(result).toEqual({ success: true, id: 7 });
    expect(createWorkerProblem).toHaveBeenCalledWith(
      expect.objectContaining({ description: "Пликът е разкъсан и съдържанието е разпиляно." })
    );
  });

  it("rejects short descriptions", async () => {
    vi.mocked(getWorkerSession).mockResolvedValue({ id: 1, workerId: 1, deviceToken: DEVICE_TOKEN, deviceName: "Phone", createdAt: new Date() });
    vi.mocked(getAllWorkers).mockResolvedValue([WORKER]);

    const caller = appRouter.createCaller(makePublicCtx());
    await expect(
      caller.workerDistricts.reportProblem({ deviceToken: DEVICE_TOKEN, description: "bad" })
    ).rejects.toThrow();
  });
});
