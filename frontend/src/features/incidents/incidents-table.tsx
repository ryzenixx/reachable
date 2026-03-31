import Link from "next/link";
import { ImpactBadge } from "@/components/status/impact-badge";
import { IncidentStatusBadge } from "@/components/status/incident-status-badge";
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
        <TableRow className="border-neutral-100">
          <TableHead className="">Title</TableHead>
          <TableHead className="">Status</TableHead>
          <TableHead className="">Impact</TableHead>
          <TableHead className="">Services</TableHead>
          <TableHead className="">Created</TableHead>
          <TableHead className="w-[120px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {incidents.map((incident) => (
          <TableRow key={incident.id} className="border-neutral-100">
            <TableCell>
              <Link className="text-sm font-medium text-neutral-900 hover:underline" href={`/dashboard/incidents/${incident.id}`}>
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
              {incident.services.length === 0 ? (
                <span className="text-xs text-neutral-400">\u2014</span>
              ) : (
                <span className="text-xs text-neutral-500">
                  {incident.services.map((s) => s.name).join(", ")}
                </span>
              )}
            </TableCell>
            <TableCell className="text-xs text-neutral-400">{formatRelative(incident.created_at)}</TableCell>
            <TableCell>
              <div className="flex items-center justify-end gap-2">
                {incident.status !== "resolved" ? (
                  <Button className="h-7 text-xs" onClick={() => void onResolve(incident.id)} size="sm" variant="outline">
                    Resolve
                  </Button>
                ) : null}
                <Button asChild className="h-7 text-xs text-neutral-500" size="sm" variant="ghost">
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
