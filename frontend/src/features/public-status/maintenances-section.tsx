import { Card, CardContent } from "@/components/ui/card";
import { formatRelative } from "@/lib/dates";
import type { Maintenance } from "@/types/api";
import { SectionTitle } from "./section-title";

type MaintenancesSectionProps = {
  maintenances: Maintenance[];
};

export function MaintenancesSection({ maintenances }: MaintenancesSectionProps): React.JSX.Element | null {
  if (maintenances.length === 0) {
    return null;
  }

  return (
    <section className="mb-10">
      <SectionTitle>Scheduled maintenances</SectionTitle>
      <div className="space-y-3">
        {maintenances.map((maintenance) => (
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
  );
}
