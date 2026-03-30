"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/app/empty-state";
import { PageMeta } from "@/components/app/page-meta";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { useDashboardShell } from "@/components/dashboard/shell-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { OverviewActiveIncidentsCard } from "@/features/dashboard-overview/overview-active-incidents-card";
import { OverviewLastChecksCard } from "@/features/dashboard-overview/overview-last-checks-card";
import { OverviewMetricsRow } from "@/features/dashboard-overview/overview-metrics-row";
import { OverviewServicesCard } from "@/features/dashboard-overview/overview-services-card";
import { computeGlobalUptime, computeLastChecks, computeOpenIncidents } from "@/features/dashboard-overview/utils";
import { useIncidents, useMonitors, useServices } from "@/hooks/use-dashboard";

export default function DashboardOverviewPage(): React.JSX.Element {
  const { openMobileSidebar } = useDashboardShell();
  const router = useRouter();

  const servicesQuery = useServices();
  const monitorsQuery = useMonitors();
  const incidentsQuery = useIncidents();

  const services = servicesQuery.data ?? [];
  const monitors = monitorsQuery.data ?? [];
  const incidents = incidentsQuery.data ?? [];

  const openIncidents = computeOpenIncidents(incidents);
  const globalUptime = computeGlobalUptime(services);
  const lastChecks = computeLastChecks(monitors);
  const activeMonitorsCount = monitors.filter((monitor) => monitor.is_active).length;
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
      ) : services.length === 0 && monitors.length === 0 && incidents.length === 0 ? (
        <EmptyState
          actionLabel="Add your first service"
          description="Start by creating a service, then attach monitors and incidents will appear when needed."
          icon={Plus}
          onAction={() => {
            router.push("/dashboard/services");
          }}
          title="Your dashboard is empty"
        />
      ) : (
        <>
          <OverviewMetricsRow
            globalUptime={globalUptime}
            monitorsCount={activeMonitorsCount}
            openIncidentsCount={openIncidents.length}
            servicesCount={services.length}
          />

          <div className="mb-8 grid gap-4 lg:grid-cols-2">
            <OverviewServicesCard services={services} />
            <OverviewActiveIncidentsCard openIncidents={openIncidents} />
          </div>

          <OverviewLastChecksCard lastChecks={lastChecks} serviceNameById={serviceNameById} />
        </>
      )}
    </div>
  );
}
