import { setTimeout as sleep } from "node:timers/promises";
import { processDueMaintenance, processDueMaintenanceReminder } from "../maintenances/scheduler";
import { processNotificationDelivery } from "../notifications/delivery";
import { processConfirmationDelivery } from "../notifications/confirmation-delivery";

const shutdown = new AbortController();
process.once("SIGINT", () => shutdown.abort());
process.once("SIGTERM", () => shutdown.abort());

while (!shutdown.signal.aborted) {
  try {
    for (let count = 0; count < 100 && !shutdown.signal.aborted; count++) {
      if (!await processConfirmationDelivery()) break;
    }
  } catch (error) {
    console.error("Failed to process subscription confirmations:", error);
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
