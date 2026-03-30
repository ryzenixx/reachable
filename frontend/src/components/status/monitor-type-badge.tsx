import { Badge } from "@/components/ui/badge";
import type { MonitorType } from "@/types/api";

const monitorTypeLabelMap: Record<MonitorType, string> = {
  http: "HTTP",
  tcp: "TCP",
  ping: "PING",
};

type MonitorTypeBadgeProps = {
  type: MonitorType;
};

export function MonitorTypeBadge({ type }: MonitorTypeBadgeProps): React.JSX.Element {
  return <Badge className="bg-muted text-foreground">{monitorTypeLabelMap[type]}</Badge>;
}
