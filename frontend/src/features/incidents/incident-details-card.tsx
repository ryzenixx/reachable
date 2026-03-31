import { ImpactBadge } from "@/components/status/impact-badge";
import { IncidentStatusBadge } from "@/components/status/incident-status-badge";
import type { Incident } from "@/types/api";

type IncidentDetailsCardProps = {
  incident: Incident;
};

export function IncidentDetailsCard({ incident }: IncidentDetailsCardProps): React.JSX.Element {
  return (
    <div className="rounded-xl border border-neutral-100 bg-white p-5">
      <h3 className="text-sm font-semibold text-neutral-900">Details</h3>
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-neutral-500">Status</span>
          <IncidentStatusBadge status={incident.status} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-neutral-500">Impact</span>
          <ImpactBadge impact={incident.impact} />
        </div>
        <div>
          <span className="text-sm text-neutral-500">Services</span>
          {incident.services.length === 0 ? (
            <p className="mt-1 text-xs text-neutral-400">{"\u2014"}</p>
          ) : (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {incident.services.map((service) => (
                <span key={service.id} className="inline-flex rounded-md bg-neutral-50 px-2 py-0.5 text-xs font-medium text-neutral-600 border border-neutral-100">
                  {service.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
