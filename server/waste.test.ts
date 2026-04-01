import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function makeCtx(role: "user" | "worker" | "admin" = "user"): TrpcContext {
  const headers: Record<string, string> = {};
  if (role === "admin") {
    headers.cookie = "trashit_admin_session=test-admin-session-token-for-tests";
  }
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
    req: { protocol: "https", headers } as TrpcContext["req"],
    res: { clearCookie: () => {}, cookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("districts router", () => {
  it("list returns array (public procedure)", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.districts.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("requests router", () => {
  it("myList returns array for authenticated user", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    const result = await caller.requests.myList();
    expect(Array.isArray(result)).toBe(true);
  });

  it("create throws when no contact provided", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(
      caller.requests.create({
        type: "nonstandard",
        district: "Младост",
        blok: "358",
        vhod: "В",
        etaj: "3",
        apartament: "23",
        // no contactPhone or contactEmail
      })
    ).rejects.toThrow("телефон или имейл");
  });

  it("listPending throws FORBIDDEN for regular user", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(caller.requests.listPending()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("listPending returns grouped structure for worker", async () => {
    const caller = appRouter.createCaller(makeCtx("worker"));
    const result = await caller.requests.listPending();
    expect(result).toHaveProperty("raw");
    expect(result).toHaveProperty("grouped");
    expect(Array.isArray(result.raw)).toBe(true);
    expect(typeof result.grouped).toBe("object");
  });

  it("listAll throws UNAUTHORIZED for non-admin", async () => {
    const caller = appRouter.createCaller(makeCtx("worker"));
    await expect(caller.requests.listAll()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("estimateVolume returns volume and description", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    const result = await caller.requests.estimateVolume({
      imageUrl: "https://example.com/image.jpg",
    });
    expect(result).toHaveProperty("volume");
    expect(result).toHaveProperty("description");
    expect(result).toHaveProperty("note");
    expect(typeof result.volume).toBe("string");
  });

  it("cancel throws NOT_FOUND for non-existent request", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(caller.requests.cancel({ id: 999999 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("cancel returns success and refunded flag", async () => {
    // Create a nonstandard request (no credit cost) so we can cancel it safely
    const caller = appRouter.createCaller(makeCtx("user"));
    const created = await caller.requests.create({
      type: "nonstandard",
      district: "Младост",
      blok: "358",
      vhod: "В",
      etaj: "3",
      apartament: "23",
      contactPhone: "+359888000000",
    });
    expect(created).toHaveProperty("id");
    const result = await caller.requests.cancel({ id: created.id });
    expect(result.success).toBe(true);
    // nonstandard has no credit cost so refunded should be false
    expect(result.refunded).toBe(false);
  });
});
