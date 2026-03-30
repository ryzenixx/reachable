import { Badge } from "@/components/ui/badge";
import type { MaintenanceStatus } from "@/types/api";

const labelMap: Record<MaintenanceStatus, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
};

const classMap: Record<MaintenanceStatus, string> = {
  scheduled: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  in_progress: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
  completed: "bg-green-500/15 text-green-700 dark:text-green-300",
};

type MaintenanceStatusBadgeProps = {
  status: MaintenanceStatus;
};

export function MaintenanceStatusBadge({ status }: MaintenanceStatusBadgeProps): React.JSX.Element {
  return <Badge className={classMap[status]}>{labelMap[status]}</Badge>;
}
