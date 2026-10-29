import type { component } from "../db/schema/component";

type ComponentStatus = typeof component.$inferSelect.status | "unknown";

export function summarizeStatus(
  statuses: ComponentStatus[],
  activeIncidents: boolean,
  activeMaintenances: boolean,
  unscopedImpact: boolean,
) {
  const hasUnknownImpact = unscopedImpact || statuses.includes("unknown");
  const knownImpact = (
    ["major_outage", "partial_outage", "degraded_performance", "under_maintenance"] as const
  ).find((status) => statuses.includes(status));
  const status =
    knownImpact ?? (statuses.length === 0 || hasUnknownImpact ? "unknown" : "operational");
  return {
    status,
    hasUnknownImpact,
    hasActiveIncidents: activeIncidents,
    hasActiveMaintenances: activeMaintenances,
  };
}
