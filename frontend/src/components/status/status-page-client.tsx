"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { GlobalStatusBanner } from "@/components/status/global-status-banner";
import { SubscribeDialog } from "@/components/status/subscribe-dialog";
import { UptimeBars } from "@/components/status/uptime-bars";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicStatus } from "@/hooks/use-public-status";
import { formatRelative } from "@/lib/dates";
import { impactBorderClassMap, incidentStatusLabelMap, statusLabelMap } from "@/lib/status";
import { createEcho } from "@/lib/realtime";
import { cn } from "@/lib/utils";
import type { Incident, IncidentImpact, IncidentStatus, Service, ServiceStatus } from "@/types/api";

function IncidentCard({
  impact,
  title,
  message,
  createdAt,
  href,
}: {
  impact: IncidentImpact;
  title: string;
  message: string | null;
  createdAt: string;
  href?: string;
}): React.JSX.Element {
  const content = (
    <article className={cn("rounded-r-lg border-l-4 bg-card p-4", impactBorderClassMap[impact])}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{formatRelative(createdAt)}</p>
      </div>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </article>
  );

  if (!href) {
    return content;
  }

  return <Link href={href}>{content}</Link>;
}

function SectionTitle({ children }: { children: string }): React.JSX.Element {
  return <h2 className="mb-4 border-b pb-2 text-xs uppercase tracking-widest text-muted-foreground">{children}</h2>;
}

const serviceStatusTextClassMap: Record<ServiceStatus, string> = {
  operational: "text-green-600 dark:text-green-400",
  degraded: "text-yellow-600 dark:text-yellow-400",
  partial_outage: "text-orange-600 dark:text-orange-400",
  major_outage: "text-red-600 dark:text-red-400",
  maintenance: "text-indigo-600 dark:text-indigo-400",
};

const incidentTitleClassMap: Record<IncidentImpact, string> = {
  none: "text-foreground",
  minor: "text-yellow-600 dark:text-yellow-400",
  major: "text-orange-600 dark:text-orange-400",
  critical: "text-red-600 dark:text-red-400",
};

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

function formatEventTime(dateValue: string): string {
  return new Date(dateValue).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatServiceUptimeSummary(service: Service, activeIncidents: Incident[]): string {
  if (service.uptime_percentage === null) {
    return "No data";
  }

  const hasActiveIncident = activeIncidents.some((incident) => incident.services.some((item) => item.id === service.id));

  if (hasActiveIncident && service.status !== "operational") {
    return "Live incident in progress";
  }

  return `${service.uptime_percentage.toFixed(2)}% uptime`;
}

export function StatusPageClient(): React.JSX.Element {
  const { data, isPending, isError } = usePublicStatus(1);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!data?.organization.id) {
      return;
    }

    const echo = createEcho();
    const channel = echo.channel(`status.${data.organization.id}`);

    channel.listen(".service.status.changed", () => {
      void queryClient.invalidateQueries({ queryKey: ["public-status"] });
    });

    channel.listen(".incident.changed", () => {
      void queryClient.invalidateQueries({ queryKey: ["public-status"] });
    });

    return () => {
      echo.leave(`status.${data.organization.id}`);
      echo.disconnect();
    };
  }, [data?.organization.id, queryClient]);

  const incidentsForUptime = useMemo(() => {
    const merged = new Map<string, Incident>();

    for (const incident of [...(data?.active_incidents ?? []), ...(data?.incident_history.data ?? [])]) {
      merged.set(incident.id, incident);
    }

    return Array.from(merged.values());
  }, [data?.active_incidents, data?.incident_history]);

  const pastIncidentDays = useMemo(() => {
    const days = getLastSevenDays();
    const incidentsByDay = new Map<string, Map<string, {
      incidentId: string;
      title: string;
      href: string;
      impact: IncidentImpact;
      events: Array<{
        id: string;
        status: IncidentStatus;
        message: string;
        created_at: string;
      }>;
    }>>();

    for (const day of days) {
      incidentsByDay.set(toLocalDayKey(day), new Map());
    }

    for (const incident of data?.incident_history.data ?? []) {
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
        const eventItem = {
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
  }, [data?.incident_history.data]);

  if (isPending) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 pb-10 pt-8">
        <Skeleton className="mb-8 h-10 w-full rounded-lg" />
        <Skeleton className="mb-8 h-12 w-full rounded-lg" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 pb-10 pt-8">
        <Card className="rounded-lg shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm font-medium">Unable to load status page.</p>
            <p className="mt-1 text-sm text-muted-foreground">Please refresh in a moment.</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <>
      {data.organization.banner_url ? (
        <section className="w-full border-b bg-muted/20">
          <img
            alt={`${data.organization.name} status banner`}
            className="h-40 w-full object-cover sm:h-48"
            src={data.organization.banner_url}
          />
        </section>
      ) : null}

      <main className="mx-auto w-full max-w-3xl px-6 pb-10 pt-8">
      <header className="flex items-center justify-between py-8">
        <div className="flex items-center gap-3">
          {data.organization.logo_url ? (
            <img
              alt={`${data.organization.name} logo`}
              className="h-8 w-8 rounded-lg object-cover"
              src={data.organization.logo_url}
            />
          ) : null}
          <h1 className="text-base font-semibold leading-none">{data.organization.name}</h1>
        </div>
        <SubscribeDialog />
      </header>

      <div className="mb-8">
        <GlobalStatusBanner status={data.global_status} />
      </div>

      <section className="mb-10">
        <SectionTitle>Services</SectionTitle>

        <Card className="rounded-lg shadow-sm">
          <CardContent className="p-0">
            {data.services.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground sm:px-5">
                No services to display yet.
              </div>
            ) : (
              data.services.map((service) => (
                <div
                  key={service.id}
                  className="border-b px-4 py-4 last:border-0 sm:px-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{service.name}</p>
                    </div>
                    <p className={cn("shrink-0 text-sm font-medium", serviceStatusTextClassMap[service.status])}>
                      {statusLabelMap[service.status]}
                    </p>
                  </div>

                  <div className="mt-3">
                    <UptimeBars
                      incidents={incidentsForUptime}
                      metrics={service.uptime_metrics}
                      serviceId={service.id}
                    />
                  </div>

                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="shrink-0">90 days ago</span>
                    <span className="h-px flex-1 bg-border" />
                    <span className="shrink-0 font-medium">
                      {formatServiceUptimeSummary(service, data.active_incidents)}
                    </span>
                    <span className="h-px flex-1 bg-border" />
                    <span className="shrink-0">Today</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      {data.active_incidents.length > 0 ? (
        <section className="mb-10">
          <SectionTitle>Active incidents</SectionTitle>
          <div className="space-y-3">
            {data.active_incidents.map((incident) => (
              <IncidentCard
                key={incident.id}
                createdAt={incident.created_at}
                href={`/incidents/${incident.id}`}
                impact={incident.impact}
                message={incident.updates[incident.updates.length - 1]?.message ?? null}
                title={incident.title}
              />
            ))}
          </div>
        </section>
      ) : null}

      {data.maintenances.length > 0 ? (
        <section className="mb-10">
          <SectionTitle>Scheduled maintenances</SectionTitle>
          <div className="space-y-3">
            {data.maintenances.map((maintenance) => (
              <Card key={maintenance.id} className="rounded-lg shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{maintenance.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{maintenance.description}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatRelative(maintenance.scheduled_at)}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mb-6" id="incident-history">
        <SectionTitle>Past incidents</SectionTitle>

        <Card className="rounded-lg shadow-sm">
          <CardContent className="p-0">
            {pastIncidentDays.map((day, index) => (
              <div key={day.key} className={cn("px-4 py-4 sm:px-5", index > 0 ? "border-t" : "")}>
                <h3 className="text-base font-semibold">{day.label}</h3>

                {day.incidents.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">No incidents reported.</p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {day.incidents.map((incident) => (
                      <article
                        key={incident.incidentId}
                        className="rounded-lg bg-muted/20 p-3"
                      >
                        <Link className={cn("text-sm font-semibold", incidentTitleClassMap[incident.impact])} href={incident.href}>
                          {incident.title}
                        </Link>

                        <div className="mt-2 space-y-2">
                          {incident.events.map((event) => (
                            <div key={event.id}>
                              <p className="text-sm leading-5">
                                <span className="font-semibold">{incidentStatusLabelMap[event.status]}</span>
                                {" - "}
                                <span className="text-muted-foreground">{event.message}</span>
                              </p>
                              <p className="mt-0.5 text-xs text-muted-foreground">{formatEventTime(event.created_at)}</p>
                            </div>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <footer className="mb-4 mt-10 border-t border-border/80 pt-4">
        <div className="text-[11px] leading-none text-muted-foreground">
          <span className="tracking-wide">
            Powered by <span className="font-medium text-foreground/85">Reachable</span>
          </span>
        </div>
      </footer>
      </main>
    </>
  );
}
