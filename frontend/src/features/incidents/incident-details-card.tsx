import { ImpactBadge } from "@/components/status/impact-badge";
import { IncidentStatusBadge } from "@/components/status/incident-status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Incident } from "@/types/api";

type IncidentDetailsCardProps = {
  incident: Incident;
};

export function IncidentDetailsCard({ incident }: IncidentDetailsCardProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Incident details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Status</span>
          <IncidentStatusBadge status={incident.status} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Impact</span>
          <ImpactBadge impact={incident.impact} />
        </div>
        <div>
          <p className="text-muted-foreground">Affected services</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {incident.services.length === 0 ? (
              <span className="text-xs text-muted-foreground">None</span>
            ) : (
              incident.services.map((service) => (
                <Badge key={service.id} className="bg-muted text-foreground">
                  {service.name}
                </Badge>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
