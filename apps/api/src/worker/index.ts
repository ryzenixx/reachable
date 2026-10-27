import { setTimeout as sleep } from "node:timers/promises";
import { processDueMaintenance } from "../maintenances/scheduler";

const shutdown = new AbortController();
process.once("SIGINT", () => shutdown.abort());
process.once("SIGTERM", () => shutdown.abort());

while (!shutdown.signal.aborted) {
  try {
    for (let count = 0; count < 100 && !shutdown.signal.aborted; count++) {
      if (!await processDueMaintenance()) break;
    }
  } catch (error) {
    console.error("Failed to process scheduled maintenances:", error);
  }
  if (!shutdown.signal.aborted) {
    try {
      await sleep(10_000, undefined, { signal: shutdown.signal });
    } catch (error) {
      if (!shutdown.signal.aborted) throw error;
    }
  }
}
