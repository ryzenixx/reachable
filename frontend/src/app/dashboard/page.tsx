"use client";

import Link from "next/link";
import { AlertTriangle, Activity, GaugeCircle, Plus, Server, Timer } from "lucide-react";
import { PageMeta } from "@/components/app/page-meta";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { useDashboardShell } from "@/components/dashboard/shell-context";
import { IncidentStatusBadge } from "@/components/status/incident-status-badge";
import { StatusBadge } from "@/components/status/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useIncidents, useMonitors, useServices } from "@/hooks/use-dashboard";
import { formatRelative } from "@/lib/dates";

function formatUptime(value: number): string {
  return `${value.toFixed(2)}%`;
}

function monitorDisplayName(monitorServiceName: string | undefined, monitorType: "http" | "tcp" | "ping"): string {
  const typeLabel = monitorType.toUpperCase();
  return monitorServiceName ? `${monitorServiceName} ${typeLabel} monitor` : `${typeLabel} monitor`;
}

export default function DashboardOverviewPage(): React.JSX.Element {
  const { openMobileSidebar } = useDashboardShell();

  const servicesQuery = useServices();
  const monitorsQuery = useMonitors();
  const incidentsQuery = useIncidents();

  const services = servicesQuery.data ?? [];
  const monitors = monitorsQuery.data ?? [];
  const incidents = incidentsQuery.data ?? [];

  const openIncidents = incidents.filter((incident) => incident.status !== "resolved");

  const uptimeSamples = services.flatMap((service) => {
    return [...service.uptime_metrics]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);
  });

  const globalUptime =
    uptimeSamples.length > 0
      ? uptimeSamples.reduce((accumulator, metric) => accumulator + metric.uptime_percentage, 0) / uptimeSamples.length
      : null;

  const lastChecks = monitors
    .map((monitor) => ({
      monitor,
      check: monitor.latest_check,
    }))
    .filter((item): item is { monitor: typeof item.monitor; check: NonNullable<typeof item.check> } => Boolean(item.check))
    .sort((a, b) => new Date(b.check.checked_at).getTime() - new Date(a.check.checked_at).getTime())
    .slice(0, 5);

  const serviceNameById = new Map(services.map((service) => [service.id, service.name]));

  const isLoading = servicesQuery.isPending || monitorsQuery.isPending || incidentsQuery.isPending;

  return (
    <div>
      <PageMeta
        description="Track total services, active monitors, incident load, and recent checks from one operational overview."
        title="Dashboard Overview | Reachable"
      />
      <DashboardPageHeader
        action={
          <Button asChild>
            <Link href="/dashboard/services">
              <Plus className="size-4" />
              Add service
            </Link>
          </Button>
        }
        description="Live operational summary of your organization."
        onOpenMobileSidebar={openMobileSidebar}
        title="Overview"
      />

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          <div className="mb-8 grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total services</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <p className="text-2xl font-semibold">{services.length}</p>
                <Server className="size-4 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active monitors</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <p className="text-2xl font-semibold">{monitors.filter((monitor) => monitor.is_active).length}</p>
                <Activity className="size-4 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Open incidents</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <p className="text-2xl font-semibold">{openIncidents.length}</p>
                <AlertTriangle className="size-4 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Global uptime (30d)</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <p className="text-2xl font-semibold">{globalUptime === null ? "No data" : formatUptime(globalUptime)}</p>
                <GaugeCircle className="size-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </div>

          <div className="mb-8 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Services overview</CardTitle>
              </CardHeader>
              <CardContent>
                {services.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No services yet. Add your first service to start monitoring.</p>
                ) : (
                  <div className="space-y-3">
                    {services.slice(0, 6).map((service) => (
                      <div key={service.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                        <div>
                          <p className="text-sm font-medium">{service.name}</p>
                        </div>
                        <StatusBadge status={service.status} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Active incidents</CardTitle>
              </CardHeader>
              <CardContent>
                {openIncidents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active incidents right now.</p>
                ) : (
                  <div className="space-y-3">
                    {openIncidents.slice(0, 5).map((incident) => (
                      <div key={incident.id} className="space-y-2 border-b pb-3 last:border-0 last:pb-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{incident.title}</p>
                          <IncidentStatusBadge status={incident.status} />
                        </div>
                        <p className="text-xs text-muted-foreground">{formatRelative(incident.created_at)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Last 5 monitor check results</CardTitle>
            </CardHeader>
            <CardContent>
              {lastChecks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No monitor checks yet.</p>
              ) : (
                <div className="space-y-3">
                  {lastChecks.map(({ monitor, check }) => (
                    <div key={check.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                      <div>
                        <p className="text-sm font-medium">{monitorDisplayName(serviceNameById.get(monitor.service_id), monitor.type)}</p>
                        <p className="text-xs text-muted-foreground">{formatRelative(check.checked_at)}</p>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Timer className="size-3" />
                          {check.response_time_ms}ms
                        </span>
                        <StatusBadge
                          status={
                            check.status === "up"
                              ? "operational"
                              : check.status === "degraded"
                                ? "degraded"
                                : "major_outage"
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
