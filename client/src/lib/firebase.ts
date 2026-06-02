/**
 * Firebase — FCM disabled.
 * Push notifications are now handled via Web Push (VAPID) through sw.js.
 * This file is kept as a stub so existing imports do not break.
 */

/**
 * No-op stub — previously registered the FCM service worker and returned a token.
 * Now returns null immediately; callers should use useWebPush / useWebPushWorker instead.
 */
export async function requestFCMToken(): Promise<string | null> {
  return null;
}

/**
 * No-op stub — previously listened for foreground FCM messages.
 */
export function onForegroundMessage(_handler: (payload: unknown) => void): () => void {
  return () => {};
}