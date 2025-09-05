import cron from "node-cron";
import { createNotionTask } from "../api/services/tasks.service.js";

const ENABLED =
  String(process.env.CRON_ENABLED || "false").toLowerCase() === "true";
const SCHEDULE = process.env.CRON_SCHEDULE || "*/15 * * * *"; // cada 15 min por defecto

export function startScheduler() {
  if (!ENABLED) {
    console.log("[cron] disabled");
    return;
  }

  console.log(`[cron] enabled. schedule=${SCHEDULE}`);

  cron.schedule(SCHEDULE, async () => {
    const ts = new Date().toISOString();
    try {
      const page = await createNotionTask({
        type: "Sync",
        name: `Sync products ${ts}`,
        description: "Creada automáticamente por el scheduler",
      });
      console.log("[cron] created task:", page.id);
    } catch (err) {
      console.error("[cron] error:", err.body || err);
    }
  });
}
