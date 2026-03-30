import type { Incident, IncidentImpact, IncidentStatus, Service, ServiceStatus } from "@/types/api";

export type PastIncidentEvent = {
  id: string;
  status: IncidentStatus;
  message: string;
  created_at: string;
};

export type PastIncidentEntry = {
  incidentId: string;
  title: string;
  href: string;
  impact: IncidentImpact;
  events: PastIncidentEvent[];
};

export type PastIncidentDay = {
  key: string;
  label: string;
  incidents: PastIncidentEntry[];
};

const incidentTitleClassMap: Record<IncidentImpact, string> = {
  none: "text-foreground",
  minor: "text-yellow-600 dark:text-yellow-400",
  major: "text-orange-600 dark:text-orange-400",
  critical: "text-red-600 dark:text-red-400",
};

const serviceStatusTextClassMap: Record<ServiceStatus, string> = {
  operational: "text-green-600 dark:text-green-400",
  degraded: "text-yellow-600 dark:text-yellow-400",
  partial_outage: "text-orange-600 dark:text-orange-400",
  major_outage: "text-red-600 dark:text-red-400",
  maintenance: "text-indigo-600 dark:text-indigo-400",
};

export function serviceStatusClass(status: ServiceStatus): string {
  return serviceStatusTextClassMap[status];
}

export function incidentTitleClass(impact: IncidentImpact): string {
  return incidentTitleClassMap[impact];
}

function toLocalDayKey(dateValue: string | Date): string {
  const date = new Date(dateValue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getLastSevenDays(): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }).map((_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - index);
    return day;
  });
}

function formatDayHeading(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatEventTime(dateValue: string): string {
  return new Date(dateValue).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatServiceUptimeSummary(service: Service, activeIncidents: Incident[]): string {
  if (service.uptime_percentage === null) {
    return "No data";
  }

  const hasActiveIncident = activeIncidents.some((incident) => incident.services.some((item) => item.id === service.id));

  if (hasActiveIncident && service.status !== "operational") {
    return "Live incident in progress";
  }

  return `${service.uptime_percentage.toFixed(2)}% uptime`;
}

export function mergeIncidents(activeIncidents: Incident[], historyIncidents: Incident[]): Incident[] {
  const merged = new Map<string, Incident>();

  for (const incident of [...activeIncidents, ...historyIncidents]) {
    merged.set(incident.id, incident);
  }

  return Array.from(merged.values());
}

export function buildPastIncidentDays(historyIncidents: Incident[]): PastIncidentDay[] {
  const days = getLastSevenDays();
  const incidentsByDay = new Map<string, Map<string, PastIncidentEntry>>();

  for (const day of days) {
    incidentsByDay.set(toLocalDayKey(day), new Map());
  }

  for (const incident of historyIncidents) {
    const updatesToRender =
      incident.updates.length > 0
        ? incident.updates
        : [
            {
              id: `${incident.id}-created`,
              incident_id: incident.id,
              status: incident.status,
              message: "Incident created.",
              created_at: incident.created_at,
            },
          ];

    for (const update of updatesToRender) {
      const dayKey = toLocalDayKey(update.created_at);
      const dayIncidents = incidentsByDay.get(dayKey);

      if (!dayIncidents) {
        continue;
      }

      const existing = dayIncidents.get(incident.id);
      const eventItem: PastIncidentEvent = {
        id: update.id,
        status: update.status,
        message: update.message,
        created_at: update.created_at,
      };

      if (!existing) {
        dayIncidents.set(incident.id, {
          incidentId: incident.id,
          title: incident.title,
          href: `/incidents/${incident.id}`,
          impact: incident.impact,
          events: [eventItem],
        });
        continue;
      }

      existing.events.push(eventItem);
    }
  }

  return days.map((day) => {
    const key = toLocalDayKey(day);
    const incidents = Array.from(incidentsByDay.get(key)?.values() ?? [])
      .map((incident) => ({
        ...incident,
        events: [...incident.events].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      }))
      .sort((a, b) => {
        const aTime = new Date(a.events[0]?.created_at ?? 0).getTime();
        const bTime = new Date(b.events[0]?.created_at ?? 0).getTime();
        return bTime - aTime;
      });

    return {
      key,
      label: formatDayHeading(day),
      incidents,
    };
  });
}
