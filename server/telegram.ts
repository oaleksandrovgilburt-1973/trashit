const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export const TELEGRAM_CHATS = {
  requests:      process.env.TELEGRAM_CHAT_REQUESTS,
  problems:      process.env.TELEGRAM_CHAT_PROBLEMS,
  subscriptions: process.env.TELEGRAM_CHAT_SUBSCRIPTIONS,
  payments:      process.env.TELEGRAM_CHAT_PAYMENTS,
} as const;

export async function sendTelegramMessage(chatId: string | undefined, message: string): Promise<void> {
  if (!BOT_TOKEN || !chatId) return;
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.warn(`[Telegram] sendMessage failed (${res.status}): ${body}`);
    }
  } catch (err) {
    console.warn("[Telegram] sendMessage error:", err);
  }
}