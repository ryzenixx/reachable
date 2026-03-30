import { StatusBadge } from "@/components/status/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Service } from "@/types/api";

type OverviewServicesCardProps = {
  services: Service[];
};

export function OverviewServicesCard({ services }: OverviewServicesCardProps): React.JSX.Element {
  return (
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
  );
}
