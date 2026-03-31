"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { GlobalStatusBanner } from "@/components/status/global-status-banner";
import { ActiveIncidentsSection } from "@/features/public-status/active-incidents-section";
import { MaintenancesSection } from "@/features/public-status/maintenances-section";
import { PastIncidentsSection } from "@/features/public-status/past-incidents-section";
import { PublicStatusHeader } from "@/features/public-status/public-status-header";
import { ServicesSection } from "@/features/public-status/services-section";
import { StatusPageErrorState, StatusPageLoadingState } from "@/features/public-status/status-page-states";
import { buildPastIncidentDays, mergeIncidents } from "@/features/public-status/utils";
import { usePublicStatus } from "@/hooks/use-public-status";
import { createEcho } from "@/lib/realtime";

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
    return mergeIncidents(data?.active_incidents ?? [], data?.incident_history.data ?? []);
  }, [data?.active_incidents, data?.incident_history.data]);

  const pastIncidentDays = useMemo(() => {
    return buildPastIncidentDays(data?.incident_history.data ?? []);
  }, [data?.incident_history.data]);

  if (isPending) {
    return <StatusPageLoadingState />;
  }

  if (isError || !data) {
    return <StatusPageErrorState />;
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
        <PublicStatusHeader organization={data.organization} />

        <div className="mb-8">
          <GlobalStatusBanner status={data.global_status} />
        </div>

        <ServicesSection
          activeIncidents={data.active_incidents}
          incidentsForUptime={incidentsForUptime}
          services={data.services}
        />
        <ActiveIncidentsSection incidents={data.active_incidents} />
        <MaintenancesSection maintenances={data.maintenances} />
        <PastIncidentsSection days={pastIncidentDays} />

        <footer className="mb-4 mt-10 border-t border-border/80 pt-4">
          <a
            href="https://github.com/reachableapps/reachable"
            rel="noreferrer"
            target="_blank"
            className="inline-block opacity-50 transition-opacity hover:opacity-100"
          >
            <img src="/reachable_logo.png" alt="Powered by Reachable" className="h-5" />
          </a>
        </footer>
      </main>
    </>
  );
}
