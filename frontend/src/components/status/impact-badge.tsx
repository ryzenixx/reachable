import { cn } from "@/lib/utils";
import { impactLabelMap } from "@/lib/status";
import type { IncidentImpact } from "@/types/api";

const dotClassMap: Record<IncidentImpact, string> = {
  none: "bg-neutral-400",
  minor: "bg-yellow-500",
  major: "bg-orange-500",
  critical: "bg-red-500",
};

type ImpactBadgeProps = {
  impact: IncidentImpact;
};

export function ImpactBadge({ impact }: ImpactBadgeProps): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-neutral-600">
      <span className={cn("h-2 w-2 rounded-full", dotClassMap[impact])} />
      {impactLabelMap[impact]}
    </span>
  );
}
