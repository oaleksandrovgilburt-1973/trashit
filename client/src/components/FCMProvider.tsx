import { useAuth } from "@/_core/hooks/useAuth";
import { useFCMNotifications } from "@/hooks/useFCMNotifications";

/**
 * Activates FCM push notifications when the user is logged in.
 * Must be rendered inside the tRPC provider tree.
 */
function FCMInner() {
  useFCMNotifications();
  return null;
}

export function FCMProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  return (
    <>
      {!loading && user && <FCMInner />}
      {children}
    </>
  );
}
