import Link from "next/link";
import { ImpactBadge } from "@/components/status/impact-badge";
import { IncidentStatusBadge } from "@/components/status/incident-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatRelative } from "@/lib/dates";
import type { Incident } from "@/types/api";

type IncidentsTableProps = {
  incidents: Incident[];
  onResolve: (incidentId: string) => Promise<void>;
};

export function IncidentsTable({ incidents, onResolve }: IncidentsTableProps): React.JSX.Element {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Impact</TableHead>
          <TableHead>Affected services</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Resolved</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {incidents.map((incident) => (
          <TableRow key={incident.id}>
            <TableCell>
              <Link className="font-medium hover:underline" href={`/dashboard/incidents/${incident.id}`}>
                {incident.title}
              </Link>
            </TableCell>
            <TableCell>
              <IncidentStatusBadge status={incident.status} />
            </TableCell>
            <TableCell>
              <ImpactBadge impact={incident.impact} />
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
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
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{formatRelative(incident.created_at)}</TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {incident.resolved_at ? formatRelative(incident.resolved_at) : "-"}
            </TableCell>
            <TableCell>
              <div className="flex items-center justify-end gap-2">
                {incident.status !== "resolved" ? (
                  <Button onClick={() => void onResolve(incident.id)} size="sm" variant="outline">
                    Resolve
                  </Button>
                ) : null}
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/dashboard/incidents/${incident.id}`}>View</Link>
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
