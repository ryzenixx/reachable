import type { Monitor, Service } from "@/types/api";

export function monitorStatusToServiceStatus(monitor: Monitor): Service["status"] {
  if (!monitor.latest_check) {
    return "maintenance";
  }

  if (monitor.latest_check.status === "up") {
    return "operational";
  }

  if (monitor.latest_check.status === "degraded") {
    return "degraded";
  }

  return "major_outage";
}
