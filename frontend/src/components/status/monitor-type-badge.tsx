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
  return (
    <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">
      {monitorTypeLabelMap[type]}
    </span>
  );
}
