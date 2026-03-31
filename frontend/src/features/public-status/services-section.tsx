import { Info } from "lucide-react";
import { UptimeBars } from "@/components/status/uptime-bars";
import { Card, CardContent } from "@/components/ui/card";
import { statusLabelMap } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { Incident, Service } from "@/types/api";
import { formatServiceUptimeSummary, serviceStatusClass } from "./utils";
import { SectionTitle } from "./section-title";

type ServicesSectionProps = {
  incidentsForUptime: Incident[];
  activeIncidents: Incident[];
  services: Service[];
};

export function ServicesSection({ incidentsForUptime, activeIncidents, services }: ServicesSectionProps): React.JSX.Element {
  return (
    <section className="mb-10">
      <SectionTitle>Services</SectionTitle>

      <Card className="rounded-lg shadow-sm">
        <CardContent className="p-0">
          {services.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground sm:px-5">No services to display yet.</div>
          ) : (
            services.map((service) => (
              <div key={service.id} className="border-b px-4 py-4 last:border-0 sm:px-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <p className="truncate text-sm font-semibold">{service.name}</p>
                    {service.description ? (
                      <span className="group relative">
                        <Info className="size-3.5 text-neutral-400 cursor-help" />
                        <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-neutral-900 px-2.5 py-1.5 text-xs text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                          {service.description}
                        </span>
                      </span>
                    ) : null}
                  </div>
                  <p className={cn("shrink-0 text-sm font-medium", serviceStatusClass(service.status))}>
                    {statusLabelMap[service.status]}
                  </p>
                </div>

                <div className="mt-3">
                  <UptimeBars incidents={incidentsForUptime} metrics={service.uptime_metrics} serviceId={service.id} />
                </div>

                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="shrink-0">90 days ago</span>
                  <span className="h-px flex-1 bg-border" />
                  <span className="shrink-0 font-medium">{formatServiceUptimeSummary(service, activeIncidents)}</span>
                  <span className="h-px flex-1 bg-border" />
                  <span className="shrink-0">Today</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  );
}
