import type { IncidentImpact, IncidentStatus, ServiceStatus } from "@/types/api";

export const statusLabelMap: Record<ServiceStatus, string> = {
  operational: "Operational",
  degraded: "Degraded",
  partial_outage: "Partial Outage",
  major_outage: "Major Outage",
  maintenance: "Maintenance",
};

export const statusClassMap: Record<ServiceStatus, string> = {
  operational: "bg-green-500/15 text-green-700 dark:text-green-300",
  degraded: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
  partial_outage: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  major_outage: "bg-red-500/15 text-red-700 dark:text-red-300",
  maintenance: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
};

export const statusDotClassMap: Record<ServiceStatus, string> = {
  operational: "bg-green-500",
  degraded: "bg-yellow-500",
  partial_outage: "bg-orange-500",
  major_outage: "bg-red-500",
  maintenance: "bg-indigo-500",
};

export const impactLabelMap: Record<IncidentImpact, string> = {
  none: "None",
  minor: "Minor",
  major: "Major",
  critical: "Critical",
};

export const impactClassMap: Record<IncidentImpact, string> = {
  none: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  minor: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
  major: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  critical: "bg-red-500/15 text-red-700 dark:text-red-300",
};

export const impactBorderClassMap: Record<IncidentImpact, string> = {
  none: "border-slate-500",
  minor: "border-yellow-500",
  major: "border-orange-500",
  critical: "border-red-500",
};

export const incidentStatusLabelMap: Record<IncidentStatus, string> = {
  investigating: "Investigating",
  identified: "Identified",
  monitoring: "Monitoring",
  resolved: "Resolved",
};

export const incidentStatusClassMap: Record<IncidentStatus, string> = {
  investigating: "bg-red-500/15 text-red-700 dark:text-red-300",
  identified: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  monitoring: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
  resolved: "bg-green-500/15 text-green-700 dark:text-green-300",
};

export function incidentStatusToServiceStatus(status: IncidentStatus): ServiceStatus {
  switch (status) {
    case "resolved":
      return "operational";
    case "monitoring":
      return "degraded";
    case "identified":
      return "partial_outage";
    case "investigating":
    default:
      return "major_outage";
  }
}

export function summarizeGlobalStatus(statuses: ServiceStatus[]): ServiceStatus {
  if (statuses.some((status) => status === "major_outage")) {
    return "major_outage";
  }

  if (statuses.some((status) => status === "partial_outage")) {
    return "partial_outage";
  }

  if (statuses.some((status) => status === "degraded")) {
    return "degraded";
  }

  if (statuses.some((status) => status === "maintenance")) {
    return "maintenance";
  }

  return "operational";
}
