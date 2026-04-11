/**
 * Firebase Cloud Messaging — server-side push notification helper.
 * Uses firebase-admin initialized with the service account from FCM_SERVICE_ACCOUNT_JSON env var.
 */
import * as admin from "firebase-admin";

let initialized = false;

function getApp(): admin.app.App | null {
  if (initialized) return admin.app();
  const raw = process.env.FCM_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    console.warn("[FCM] FCM_SERVICE_ACCOUNT_JSON not set — push notifications disabled");
    return null;
  }
  try {
    const serviceAccount = JSON.parse(raw);
    console.log("[FCM] Initializing Firebase Admin SDK...");
    console.log("[FCM] project_id:", serviceAccount.project_id);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    initialized = true;
    console.log("[FCM] Firebase Admin SDK initialized successfully");
    return admin.app();
  } catch (err) {
    console.error("[FCM] Failed to initialize firebase-admin:", err);
    return null;
  }
}

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Send a push notification to a single FCM token.
 * Silently swips invalid-token errors (token will be cleared by the caller if needed).
 */
export async function sendPushNotification(
  fcmToken: string,
  payload: PushPayload
): Promise<boolean> {
  const app = getApp();
  console.log("[FCM] initialized:", initialized);
  console.log("[FCM] token received:", fcmToken ? fcmToken.substring(0, 20) + "..." : "EMPTY");
  if (!app) return false;
  try {
    await admin.messaging(app).send({
      token: fcmToken,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data,
      webpush: {
        notification: {
          title: payload.title,
          body: payload.body,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
        },
      },
    });
      console.log("[FCM] result: success");
      return true;
  } catch (err: any) {
    // Token expired / unregistered — not a hard error
    if (
      err?.errorInfo?.code === "messaging/registration-token-not-registered" ||
      err?.errorInfo?.code === "messaging/invalid-registration-token"
    ) {
      console.warn("[FCM] Invalid token, skipping:", fcmToken.slice(0, 20));
    } else {
      console.error("[FCM] Send error:", err?.errorInfo?.code ?? err);
    }
    return false;
  }
}
