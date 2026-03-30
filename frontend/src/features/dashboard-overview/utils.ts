import type { Incident, Monitor, Service } from "@/types/api";
import type { LastMonitorCheckRow } from "./types";

export function formatUptime(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function monitorDisplayName(monitorServiceName: string | undefined, monitorType: Monitor["type"]): string {
  const typeLabel = monitorType.toUpperCase();
  return monitorServiceName ? `${monitorServiceName} ${typeLabel} monitor` : `${typeLabel} monitor`;
}

export function computeOpenIncidents(incidents: Incident[]): Incident[] {
  return incidents.filter((incident) => incident.status !== "resolved");
}

export function computeGlobalUptime(services: Service[]): number | null {
  const uptimeSamples = services.flatMap((service) => {
    return [...service.uptime_metrics].sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
  });

  if (uptimeSamples.length === 0) {
    return null;
  }

  return uptimeSamples.reduce((accumulator, metric) => accumulator + metric.uptime_percentage, 0) / uptimeSamples.length;
}

export function computeLastChecks(monitors: Monitor[]): LastMonitorCheckRow[] {
  return monitors
    .map((monitor) => ({
      monitor,
      check: monitor.latest_check,
    }))
    .filter((item): item is LastMonitorCheckRow => Boolean(item.check))
    .sort((a, b) => new Date(b.check.checked_at).getTime() - new Date(a.check.checked_at).getTime())
    .slice(0, 5);
}
