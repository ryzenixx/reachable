import { AlertTriangle, CheckCircle2, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ServiceStatus } from "@/types/api";

type GlobalStatusBannerProps = {
  status: ServiceStatus;
};

const styles: Record<ServiceStatus, { text: string; className: string; icon: React.ComponentType<{ className?: string }> }> = {
  operational: {
    text: "All systems operational",
    className: "border-operational bg-operational/10 text-operational",
    icon: CheckCircle2,
  },
  degraded: {
    text: "Some systems are degraded",
    className: "border-degraded bg-degraded/10 text-degraded",
    icon: AlertTriangle,
  },
  partial_outage: {
    text: "Partial outage detected",
    className: "border-partial-outage bg-partial-outage/10 text-partial-outage",
    icon: AlertTriangle,
  },
  major_outage: {
    text: "Major outage in progress",
    className: "border-major-outage bg-major-outage/10 text-major-outage",
    icon: AlertTriangle,
  },
  maintenance: {
    text: "Scheduled maintenance in progress",
    className: "border-maintenance bg-maintenance/10 text-maintenance",
    icon: Wrench,
  },
};

export function GlobalStatusBanner({ status }: GlobalStatusBannerProps): React.JSX.Element {
  const presentation = styles[status];
  const Icon = presentation.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold",
        presentation.className,
      )}
    >
      <Icon className="size-4" />
      <span>{presentation.text}</span>
    </div>
  );
}
