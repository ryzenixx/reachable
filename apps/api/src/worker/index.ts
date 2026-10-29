import { setTimeout as sleep } from "node:timers/promises";
import { processDueMaintenance, processDueMaintenanceReminder } from "../maintenances/scheduler";
import { processNotificationDelivery } from "../notifications/delivery";
import { processConfirmationDelivery } from "../notifications/confirmation-delivery";
import { processAuthEmailDelivery } from "../notifications/auth-email/delivery";
import { processWebhookFailureAlert } from "../notifications/webhook-alert";
import { pruneRequestRateLimits } from "../http/rate-limit";

const shutdown = new AbortController();
let nextRateLimitCleanup = 0;
process.once("SIGINT", () => shutdown.abort());
process.once("SIGTERM", () => shutdown.abort());

async function processTask(name: string, task: () => Promise<boolean>) {
  if (shutdown.signal.aborted) return false;
  try {
    return await task();
  } catch (error) {
    console.error(`Failed to process ${name}:`, error);
    return false;
  }
}

while (!shutdown.signal.aborted) {
  if (Date.now() >= nextRateLimitCleanup) {
    nextRateLimitCleanup = Date.now() + 60_000;
    try {
      await pruneRequestRateLimits();
    } catch (error) {
      console.error("Failed to clean up request rate limits:", error);
    }
  }
  const processed = [
    await processTask("authentication emails", processAuthEmailDelivery),
    await processTask("subscription confirmations", processConfirmationDelivery),
    await processTask("webhook failure alerts", processWebhookFailureAlert),
    await processTask("scheduled maintenances", processDueMaintenance),
    await processTask("maintenance reminders", processDueMaintenanceReminder),
    await processTask("notification deliveries", processNotificationDelivery),
  ].some(Boolean);
  if (!shutdown.signal.aborted && !processed) {
    try {
      await sleep(10_000, undefined, { signal: shutdown.signal });
    } catch (error) {
      if (!shutdown.signal.aborted) throw error;
    }
  }
}
