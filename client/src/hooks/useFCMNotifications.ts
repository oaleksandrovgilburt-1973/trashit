import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { requestFCMToken, onForegroundMessage } from "@/lib/firebase";
import { toast } from "sonner";

/**
 * Hook that:
 * 1. Requests notification permission and gets an FCM token
 * 2. Saves the token to the backend via trpc.users.saveFcmToken
 * 3. Listens for foreground messages and shows a toast
 *
 * Must be called only when the user is logged in.
 */
export function useFCMNotifications() {
  const saveFcmToken = trpc.users.saveFcmToken.useMutation();
  const tokenSaved = useRef(false);

  useEffect(() => {
    if (tokenSaved.current) return;

    // Only request after a short delay so it doesn't interrupt page load
    const timer = setTimeout(async () => {
      try {
        const token = await requestFCMToken();
        if (token) {
          await saveFcmToken.mutateAsync({ token });
          tokenSaved.current = true;
        }
      } catch (err) {
        // Silently ignore — notifications are optional
        console.warn("[FCM] Could not register token:", err);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for foreground messages
  useEffect(() => {
    const unsubscribe = onForegroundMessage((payload) => {
      const title = payload.notification?.title ?? "TRASHit";
      const body = payload.notification?.body ?? "";
      toast(title, { description: body });
    });
    return unsubscribe;
  }, []);
}
