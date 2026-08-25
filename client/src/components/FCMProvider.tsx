import { useAuth } from "@/_core/hooks/useAuth";
import { useWebPush } from "@/hooks/useWebPush";
import { useNativePush } from "@/hooks/useNativePush";
import { Capacitor } from "@capacitor/core";

/**
 * Activates push notifications when the user is logged in —
 * native FCM/APNs push inside the Capacitor app, Web Push (VAPID) in the browser.
 * Must be rendered inside the tRPC provider tree.
 */
function WebPushInner() {
  useWebPush();
  return null;
}

function NativePushInner() {
  useNativePush();
  return null;
}

export function FCMProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const isNative = Capacitor.isNativePlatform();
  return (
    <>
      {!loading && user && (isNative ? <NativePushInner /> : <WebPushInner />)}
      {children}
    </>
  );
}
