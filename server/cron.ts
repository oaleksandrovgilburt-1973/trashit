import cron from "node-cron";
import { getAllSubscriptions, createDailyVisitsForSubscription } from "./db";

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
}