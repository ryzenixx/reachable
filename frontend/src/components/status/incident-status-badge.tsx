import { Badge } from "@/components/ui/badge";
import { incidentStatusClassMap, incidentStatusLabelMap } from "@/lib/status";
import type { IncidentStatus } from "@/types/api";

type IncidentStatusBadgeProps = {
  status: IncidentStatus;
};

export function IncidentStatusBadge({ status }: IncidentStatusBadgeProps): React.JSX.Element {
  return <Badge className={incidentStatusClassMap[status]}>{incidentStatusLabelMap[status]}</Badge>;
}
