/**
 * useNativePush — registers the device for native push notifications
 * (FCM on Android, APNs on iOS) via Capacitor and saves the token to the backend.
 */
import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { trpc } from "@/lib/trpc";

export function useNativePush() {
  const saveFcmToken = trpc.users.saveFcmToken.useMutation();
  const registered = useRef(false);

  useEffect(() => {
    if (registered.current) return;
    if (!Capacitor.isNativePlatform()) return;

    const setup = async () => {
      try {
        const permStatus = await PushNotifications.requestPermissions();
        if (permStatus.receive !== "granted") return;

        await PushNotifications.register();

        PushNotifications.addListener("registration", async (token) => {
          console.log("[NativePush] Registration success, token:", token.value.substring(0, 20) + "...");
          await saveFcmToken.mutateAsync({ token: token.value });
          registered.current = true;
        });

        PushNotifications.addListener("registrationError", (err) => {
          console.warn("[NativePush] Registration error:", err.error);
        });
      } catch (err) {
        console.warn("[NativePush] Setup failed:", err);
      }
    };

    const timer = setTimeout(setup, 1500);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}