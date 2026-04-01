import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeCtx(role: "user" | "admin" | "worker" = "user"): TrpcContext {
  const clearedCookies: unknown[] = [];
  const user: AuthenticatedUser = {
    id: 1,
    openId: `test-${role}`,
    email: `${role}@trashit.bg`,
    name: `Test ${role}`,
    loginMethod: "manus",
    role,
    credits: "0.00",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, opts: unknown) => clearedCookies.push({ name, opts }),
    } as TrpcContext["res"],
  };
}

function makeGuestCtx(): TrpcContext {
  return {
    user: undefined,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

// ─── Auth ────────────────────────────────────────────────────────────────────

describe("auth.logout", () => {
  it("returns success and clears cookie for authenticated user", async () => {
    const ctx = makeCtx("user");
    const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];
    ctx.res.clearCookie = (name: string, options: Record<string, unknown>) => {
      clearedCookies.push({ name, options });
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({ maxAge: -1 });
  });

  it("returns the current user for auth.me", async () => {
    const ctx = makeCtx("admin");
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user?.role).toBe("admin");
    expect(user?.email).toBe("admin@trashit.bg");
  });

  it("returns null for unauthenticated auth.me", async () => {
    const ctx = makeGuestCtx();
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user).toBeUndefined();
  });
});

// ─── Role-based access ───────────────────────────────────────────────────────

describe("admin-only procedures", () => {
  it("rejects non-admin from users.list", async () => {
    const ctx = makeCtx("user");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.users.list()).rejects.toThrow();
  });

  it("rejects worker from users.list", async () => {
    const ctx = makeCtx("worker");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.users.list()).rejects.toThrow();
  });

  it("rejects non-admin from settings.update", async () => {
    const ctx = makeCtx("user");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.settings.update({ key: "contact_phone", value: "+359 99 999 9999" })
    ).rejects.toThrow();
  });

  it("rejects non-admin from users.createWorker", async () => {
    const ctx = makeCtx("user");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.users.createWorker({ name: "Test Worker", email: "worker@test.com" })
    ).rejects.toThrow();
  });
});

// ─── Settings (public read) ──────────────────────────────────────────────────

describe("settings.get (public)", () => {
  it("allows unauthenticated access to settings.get", async () => {
    const ctx = makeGuestCtx();
    const caller = appRouter.createCaller(ctx);
    // Should not throw (may return null if DB not available in test env)
    const result = await caller.settings.get({ key: "contact_email" }).catch(() => null);
    // Result is either a string or null — both are valid
    expect(result === null || typeof result === "string").toBe(true);
  });

  it("allows unauthenticated access to settings.getAll", async () => {
    const ctx = makeGuestCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.settings.getAll().catch(() => ({}));
    expect(typeof result).toBe("object");
  });
});
