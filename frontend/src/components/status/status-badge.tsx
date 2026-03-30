import { Badge } from "@/components/ui/badge";
import { statusClassMap, statusLabelMap } from "@/lib/status";
import type { ServiceStatus } from "@/types/api";

type StatusBadgeProps = {
  status: ServiceStatus;
};

export function StatusBadge({ status }: StatusBadgeProps): React.JSX.Element {
  return <Badge className={statusClassMap[status]}>{statusLabelMap[status]}</Badge>;
}
