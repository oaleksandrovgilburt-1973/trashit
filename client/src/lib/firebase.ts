export async function requestFCMToken(): Promise<string | null> {
  return null;
}

export function onForegroundMessage(handler: (payload: any) => void): () => void {
  return () => {};
}