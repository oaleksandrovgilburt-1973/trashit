import { describe, it, expect } from "vitest";

describe("Firebase environment variables", () => {
  it("should have VITE_FIREBASE_PROJECT_ID set", () => {
    expect(process.env.VITE_FIREBASE_PROJECT_ID).toBeTruthy();
    expect(process.env.VITE_FIREBASE_PROJECT_ID).toBe("trashit-c02a2");
  });

  it("should have VITE_FIREBASE_API_KEY set", () => {
    expect(process.env.VITE_FIREBASE_API_KEY).toBeTruthy();
  });

  it("should have VITE_FIREBASE_APP_ID set", () => {
    expect(process.env.VITE_FIREBASE_APP_ID).toBeTruthy();
  });

  it("should have VITE_FIREBASE_MESSAGING_SENDER_ID set", () => {
    expect(process.env.VITE_FIREBASE_MESSAGING_SENDER_ID).toBeTruthy();
  });

  it("should have VITE_FIREBASE_VAPID_KEY set", () => {
    expect(process.env.VITE_FIREBASE_VAPID_KEY).toBeTruthy();
  });

  it("should have FCM_SERVICE_ACCOUNT_JSON set and parseable", () => {
    const json = process.env.FCM_SERVICE_ACCOUNT_JSON;
    expect(json).toBeTruthy();
    const parsed = JSON.parse(json!);
    expect(parsed.project_id).toBe("trashit-c02a2");
    expect(parsed.client_email).toContain("firebase-adminsdk");
  });
});
