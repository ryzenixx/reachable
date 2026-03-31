import { statusDotClassMap, statusLabelMap } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { ServiceStatus } from "@/types/api";

type StatusBadgeProps = {
  status: ServiceStatus;
};

export function StatusBadge({ status }: StatusBadgeProps): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-neutral-600">
      <span className={cn("h-2 w-2 rounded-full", statusDotClassMap[status])} />
      {statusLabelMap[status]}
    </span>
  );
}
