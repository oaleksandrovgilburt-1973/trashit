import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage, type Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// Diagnostic: log which env vars are present
console.log("[Firebase] Config check:", {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ? "SET" : "MISSING",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ? "SET" : "MISSING",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ? "SET" : "MISSING",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ? "SET" : "MISSING",
  vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY ? "SET" : "MISSING",
});

// Initialize Firebase app (singleton)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let messagingInstance: Messaging | null = null;

function getMessagingInstance(): Messaging | null {
  if (typeof window === "undefined") return null;
  if (!messagingInstance) {
    try {
      messagingInstance = getMessaging(app);
    } catch (err) {
      console.error("[FCM] getMessaging failed:", err);
      return null;
    }
  }
  return messagingInstance;
}

/**
 * Wait for a service worker registration to become active.
 */
function waitForSWActive(reg: ServiceWorkerRegistration): Promise<ServiceWorkerRegistration> {
  return new Promise((resolve) => {
    if (reg.active) {
      resolve(reg);
      return;
    }
    const sw = reg.installing || reg.waiting;
    if (!sw) {
      resolve(reg);
      return;
    }
    sw.addEventListener("statechange", function handler() {
      if (sw.state === "activated") {
        sw.removeEventListener("statechange", handler);
        resolve(reg);
      }
    });
  });
}

/**
 * Register the FCM service worker, request notification permission,
 * and return the FCM token. Returns null if permission denied or unsupported.
 */
export async function requestFCMToken(): Promise<string | null> {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    console.warn("[FCM] Notifications or ServiceWorker not supported");
    return null;
  }

  // Request permission first
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    console.warn("[FCM] Notification permission denied");
    return null;
  }

  try {
    // Register SW and wait until it is active
    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
      { scope: "/" }
    );
    const activeReg = await waitForSWActive(registration);

    const messaging = getMessagingInstance();
    if (!messaging) return null;

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: activeReg,
    });

    if (token) {
      console.log("[FCM] Token obtained:", token.slice(0, 20) + "...");
    } else {
      console.warn("[FCM] No token returned");
    }

    return token || null;
  } catch (err) {
    console.error("[FCM] Failed to get token:", err);
    return null;
  }
}

/**
 * Listen for foreground messages and call the provided handler.
 */
export function onForegroundMessage(handler: (payload: any) => void): () => void {
  const messaging = getMessagingInstance();
  if (!messaging) return () => {};
  return onMessage(messaging, handler);
}
