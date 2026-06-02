import { useAuth } from "@/_core/hooks/useAuth";
import { useWebPush } from "@/hooks/useWebPush";

/**
 * Activates Web Push (VAPID) notifications when the user is logged in.
 * Must be rendered inside the tRPC provider tree.
 */
function WebPushInner() {
  useWebPush();
  return null;
}

export function FCMProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  return (
    <>
      {!loading && user && <WebPushInner />}
      {children}
    </>
  );
}
