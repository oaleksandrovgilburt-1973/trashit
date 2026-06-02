/**
 * useWebPush — subscribes the current user to Web Push (VAPID) notifications
 * and saves the subscription to the backend via tRPC.
 *
 * Replaces useFCMNotifications for logged-in users.
 * Must be called only when the user is logged in.
 */
import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";

export function useWebPush() {
  const { data: keyData } = trpc.webPush.getPublicKey.useQuery(undefined, {
    staleTime: Infinity,
  });
  const subscribeUser = trpc.webPush.subscribeUser.useMutation();
  const unsubscribe = trpc.webPush.unsubscribe.useMutation();
  const subscribed = useRef(false);

  useEffect(() => {
    if (subscribed.current) return;
    if (!keyData?.publicKey) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const publicKey = keyData.publicKey;

    const register = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const reg = await navigator.serviceWorker.ready;

        // Check if already subscribed
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          await existing.unsubscribe();
        }

        // Create new subscription
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
        });

        const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
        await subscribeUser.mutateAsync({
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
        });
        subscribed.current = true;
        console.log("[WebPush] Subscribed successfully");
      } catch (err) {
        console.warn("[WebPush] Subscription failed:", err);
      }
    };

    // Delay slightly so it doesn't interrupt page load
    const timer = setTimeout(register, 3000);
    return () => clearTimeout(timer);
  }, [keyData?.publicKey]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Convert a base64url VAPID public key to Uint8Array for pushManager.subscribe */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}