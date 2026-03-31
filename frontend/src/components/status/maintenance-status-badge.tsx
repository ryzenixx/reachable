import { cn } from "@/lib/utils";
import type { MaintenanceStatus } from "@/types/api";

const labelMap: Record<MaintenanceStatus, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
};

const dotClassMap: Record<MaintenanceStatus, string> = {
  scheduled: "bg-indigo-500",
  in_progress: "bg-yellow-500",
  completed: "bg-green-500",
};

type MaintenanceStatusBadgeProps = {
  status: MaintenanceStatus;
};

export function MaintenanceStatusBadge({ status }: MaintenanceStatusBadgeProps): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-neutral-600">
      <span className={cn("h-2 w-2 rounded-full", dotClassMap[status])} />
      {labelMap[status]}
    </span>
  );
}
