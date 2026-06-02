/**
 * Web Push (VAPID) helper — replaces Firebase Cloud Messaging.
 * Reads VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL from env.
 */
import webpush from "web-push";

let initialized = false;

function init() {
  if (initialized) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL ?? "mailto:trashit.bg@gmail.com";

  if (!publicKey || !privateKey) {
    console.warn("[WebPush] VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY not set — push disabled");
    return;
  }

  webpush.setVapidDetails(email, publicKey, privateKey);
  initialized = true;
  console.log("[WebPush] VAPID initialized");
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  data?: Record<string, string>;
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Send a Web Push notification to a single subscription.
 * Returns true on success, false on failure (expired/invalid subs are silently dropped).
 */
export async function sendWebPush(
  subscription: PushSubscription,
  payload: PushPayload
): Promise<boolean> {
  init();
  if (!initialized) return false;

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon ?? "/icon-192.png",
    badge: payload.badge ?? "/icon-192.png",
    url: payload.url ?? "/",
    data: payload.data ?? {},
  });

  try {
    await webpush.sendNotification(subscription as any, body);
    return true;
  } catch (err: any) {
    const status = err?.statusCode ?? err?.status;
    if (status === 404 || status === 410) {
      // Subscription expired / unregistered — caller should delete it
      console.warn("[WebPush] Subscription gone (status", status, "), endpoint:", subscription.endpoint.slice(0, 40));
    } else {
      console.error("[WebPush] Send error:", err?.message ?? err);
    }
    return false;
  }
}

/**
 * Send a Web Push notification to multiple subscriptions in parallel.
 * Returns the count of successful sends.
 */
export async function sendWebPushToMany(
  subscriptions: PushSubscription[],
  payload: PushPayload
): Promise<number> {
  if (subscriptions.length === 0) return 0;
  const results = await Promise.allSettled(
    subscriptions.map((sub) => sendWebPush(sub, payload))
  );
  return results.filter((r) => r.status === "fulfilled" && r.value === true).length;
}