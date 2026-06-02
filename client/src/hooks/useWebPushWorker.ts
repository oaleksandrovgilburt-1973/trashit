/**
 * useWebPushWorker — subscribes a worker device to Web Push (VAPID) notifications.
 * Must be called after worker login with a valid deviceToken.
 *
 * If an existing subscription is found (e.g. old FCM one), it is unsubscribed
 * first so a fresh VAPID subscription is always created.
 */
import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";

export function useWebPushWorker(deviceToken: string | null) {
  const { data: keyData } = trpc.webPush.getPublicKey.useQuery(undefined, {
    staleTime: Infinity,
    enabled: !!deviceToken,
  });
  const subscribeWorker = trpc.webPush.subscribeWorker.useMutation();
  const subscribed = useRef(false);

  useEffect(() => {
    if (subscribed.current) return;
    if (!deviceToken) return;
    if (!keyData?.publicKey) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const publicKey = keyData.publicKey;

    const register = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const reg = await navigator.serviceWorker.ready;

        // Always unsubscribe any existing subscription (could be old FCM one)
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          await existing.unsubscribe();
        }

        // Create fresh VAPID subscription
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
        });

        const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
        await subscribeWorker.mutateAsync({
          deviceToken,
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
        });
        subscribed.current = true;
        console.log("[WebPush] Worker subscribed successfully");
      } catch (err) {
        console.warn("[WebPush] Worker subscription failed:", err);
      }
    };

    const timer = setTimeout(register, 3000);
    return () => clearTimeout(timer);
  }, [deviceToken, keyData?.publicKey]); // eslint-disable-line react-hooks/exhaustive-deps
}

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