import cron from "node-cron";
import { getAllSubscriptions, createDailyVisitsForSubscription, getDb } from "./db";
import { users, requests, subscriptions, transactions, workerProblems } from "../drizzle/schema";

function shouldVisitToday(visitDays: string, todayDate: string): boolean {
  if (visitDays === "all") return true;
  const dayOfMonth = new Date(todayDate).getUTCDate();
  if (visitDays === "even") return dayOfMonth % 2 === 0;
  if (visitDays === "odd") return dayOfMonth % 2 !== 0;
  return true;
}

export function startCronJobs(): void {
  cron.schedule("1 0 * * *", async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      console.log(`[Cron] Creating daily subscription visits for ${today}...`);
      const allSubs = await getAllSubscriptions();
      const activeSubs = allSubs.filter(s => s.status === "active");
      let created = 0;
      let skipped = 0;
      for (const sub of activeSubs) {
        const visitDays = (sub as any).visitDays ?? "all";
        if (!shouldVisitToday(visitDays, today)) {
          skipped++;
          continue;
        }
        await createDailyVisitsForSubscription(sub.id, today);
        created++;
      }
      console.log(`[Cron] Done — created: ${created}, skipped (wrong day): ${skipped} on ${today}`);
    } catch (err) {
      console.error("[Cron] Error creating daily subscription visits:", err);
    }
  });
  console.log("[Cron] Daily subscription visits job scheduled (00:01 every day)");

  // ─── Hourly database backup → Telegram ───────────────────────────────────────
  cron.schedule("0 * * * *", async () => {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID   = process.env.TELEGRAM_CHAT_BACKUPS;
    if (!BOT_TOKEN || !CHAT_ID) {
      console.warn("[Cron/Backup] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_BACKUPS not set — skipping backup");
      return;
    }
    try {
      const db = await getDb();
      if (!db) throw new Error("Database connection unavailable");
      const [usersData, requestsData, subscriptionsData, transactionsData, problemsData] =
        await Promise.all([
          db.select().from(users),
          db.select().from(requests),
          db.select().from(subscriptions),
          db.select().from(transactions),
          db.select().from(workerProblems),
        ]);

      const timestamp = new Date().toISOString();
      const backup = {
        generatedAt: timestamp,
        users: usersData,
        requests: requestsData,
        subscriptions: subscriptionsData,
        transactions: transactionsData,
        workerProblems: problemsData,
      };

      const jsonBuffer = Buffer.from(JSON.stringify(backup, null, 2), "utf-8");
      const filename   = `backup_${timestamp.replace(/[:.]/g, "-")}.json`;

      const formData = new FormData();
      formData.append("chat_id", CHAT_ID);
      formData.append("caption", `🗄️ DB Backup — ${timestamp}`);
      formData.append(
        "document",
        new Blob([jsonBuffer], { type: "application/json" }),
        filename,
      );

      const res = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`,
        { method: "POST", body: formData },
       );

      if (res.ok) {
        console.log(`[Cron/Backup] Backup sent to Telegram (${filename})`);
      } else {
        const body = await res.text();
        console.warn(`[Cron/Backup] Telegram sendDocument failed (${res.status}): ${body}`);
      }
    } catch (err) {
      console.error("[Cron/Backup] Error during backup:", err);
    }
  });

  console.log("[Cron] Hourly DB backup job scheduled (every hour at :00)");
}