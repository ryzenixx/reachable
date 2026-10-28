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

while (!shutdown.signal.aborted) {
  if (Date.now() >= nextRateLimitCleanup) {
    nextRateLimitCleanup = Date.now() + 60_000;
    try {
      await pruneRequestRateLimits();
    } catch (error) {
      console.error("Failed to clean up request rate limits:", error);
    }
  }
  try {
    for (let count = 0; count < 100 && !shutdown.signal.aborted; count++) {
      if (!await processAuthEmailDelivery()) break;
    }
  } catch (error) {
    console.error("Failed to process authentication emails:", error);
  }
  try {
    for (let count = 0; count < 100 && !shutdown.signal.aborted; count++) {
      if (!await processConfirmationDelivery()) break;
    }
  } catch (error) {
    console.error("Failed to process subscription confirmations:", error);
  }
  try {
    for (let count = 0; count < 100 && !shutdown.signal.aborted; count++) {
      if (!await processWebhookFailureAlert()) break;
    }
  } catch (error) {
    console.error("Failed to process webhook failure alerts:", error);
  }
  try {
    for (let count = 0; count < 100 && !shutdown.signal.aborted; count++) {
      if (!await processDueMaintenance()) break;
    }
    for (let count = 0; count < 100 && !shutdown.signal.aborted; count++) {
      if (!await processDueMaintenanceReminder()) break;
    }
  } catch (error) {
    console.error("Failed to process scheduled maintenances:", error);
  }
  try {
    for (let count = 0; count < 100 && !shutdown.signal.aborted; count++) {
      if (!await processNotificationDelivery()) break;
    }
  } catch (error) {
    console.error("Failed to process notification deliveries:", error);
  }
  if (!shutdown.signal.aborted) {
    try {
      await sleep(10_000, undefined, { signal: shutdown.signal });
    } catch (error) {
      if (!shutdown.signal.aborted) throw error;
    }
  }
}
