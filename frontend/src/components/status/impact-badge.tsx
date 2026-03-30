import { Badge } from "@/components/ui/badge";
import { impactClassMap, impactLabelMap } from "@/lib/status";
import type { IncidentImpact } from "@/types/api";

type ImpactBadgeProps = {
  impact: IncidentImpact;
};

export function ImpactBadge({ impact }: ImpactBadgeProps): React.JSX.Element {
  return <Badge className={impactClassMap[impact]}>{impactLabelMap[impact]}</Badge>;
}
