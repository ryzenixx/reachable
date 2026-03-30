import { IncidentStatusBadge } from "@/components/status/incident-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelative } from "@/lib/dates";
import type { Incident } from "@/types/api";

type OverviewActiveIncidentsCardProps = {
  openIncidents: Incident[];
};

export function OverviewActiveIncidentsCard({ openIncidents }: OverviewActiveIncidentsCardProps): React.JSX.Element {
  return (
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
  );
}
