import { IncidentStatusBadge } from "@/components/status/incident-status-badge";
import { formatRelative } from "@/lib/dates";
import type { Incident } from "@/types/api";

type OverviewActiveIncidentsCardProps = {
  openIncidents: Incident[];
};

export function OverviewActiveIncidentsCard({ openIncidents }: OverviewActiveIncidentsCardProps): React.JSX.Element {
  return (
    <div className="rounded-xl border border-neutral-100 bg-white">
      <div className="px-5 pt-5 pb-3">
        <h3 className="text-sm font-semibold text-neutral-900">Active incidents</h3>
      </div>
      {openIncidents.length === 0 ? (
        <div className="px-5 pb-5">
          <p className="text-sm text-neutral-400">No active incidents.</p>
        </div>
      ) : (
        <div className="px-5 pb-3">
          {openIncidents.slice(0, 5).map((incident) => (
            <div key={incident.id} className="flex items-center justify-between py-3 border-b border-neutral-50 last:border-0">
              <div className="min-w-0 flex-1">
                <span className="text-sm text-neutral-700">{incident.title}</span>
                <p className="text-xs text-neutral-400 mt-0.5">{formatRelative(incident.created_at)}</p>
              </div>
              <IncidentStatusBadge status={incident.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
