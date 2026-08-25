/**
 * Apple Push Notification service (APNs) — server-side push notification helper.
 * Uses the @parse/node-apn library with credentials from Railway env vars.
 */
import apn from "@parse/node-apn";

let provider: apn.Provider | null = null;
let initAttempted = false;

function getProvider(): apn.Provider | null {
  if (provider) return provider;
  if (initAttempted) return null;
  initAttempted = true;

  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const privateKey = process.env.APNS_PRIVATE_KEY;

  if (!keyId || !teamId || !privateKey) {
    console.warn("[APNs] Missing APNS_KEY_ID / APNS_TEAM_ID / APNS_PRIVATE_KEY — iOS push disabled");
    return null;
  }

  try {
    provider = new apn.Provider({
      token: {
        key: privateKey,
        keyId,
        teamId,
      },
      production: true,
    });
    console.log("[APNs] Provider initialized successfully");
    return provider;
  } catch (err) {
    console.error("[APNs] Failed to initialize provider:", err);
    return null;
  }
}

export interface ApnsPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Send a push notification to a single APNs device token.
 * Silently swallows invalid-token errors.
 */
export async function sendApnsNotification(
  deviceToken: string,
  payload: ApnsPayload
): Promise<boolean> {
  const p = getProvider();
  if (!p) return false;

  const bundleId = process.env.APNS_BUNDLE_ID ?? "bg.trashit.app";
  const note = new apn.Notification();
  note.alert = { title: payload.title, body: payload.body };
  note.topic = bundleId;
  note.payload = payload.data ?? {};
  note.sound = "default";

  try {
    const result = await p.send(note, deviceToken);
    if (result.failed.length > 0) {
      console.warn("[APNs] Send failed:", result.failed[0]?.response?.reason);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[APNs] Send error:", err);
    return false;
  }
}