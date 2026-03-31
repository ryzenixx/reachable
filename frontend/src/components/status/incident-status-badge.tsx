import { cn } from "@/lib/utils";
import { incidentStatusLabelMap } from "@/lib/status";
import type { IncidentStatus } from "@/types/api";

const dotClassMap: Record<IncidentStatus, string> = {
  investigating: "bg-red-500",
  identified: "bg-orange-500",
  monitoring: "bg-yellow-500",
  resolved: "bg-green-500",
};

type IncidentStatusBadgeProps = {
  status: IncidentStatus;
};

export function IncidentStatusBadge({ status }: IncidentStatusBadgeProps): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-neutral-600">
      <span className={cn("h-2 w-2 rounded-full", dotClassMap[status])} />
      {incidentStatusLabelMap[status]}
    </span>
  );
}
