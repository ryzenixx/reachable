import { StatusBadge } from "@/components/status/status-badge";
import { formatRelative } from "@/lib/dates";
import type { LastMonitorCheckRow, ServiceNameById } from "./types";

type OverviewLastChecksCardProps = {
  lastChecks: LastMonitorCheckRow[];
  serviceNameById: ServiceNameById;
};

export function OverviewLastChecksCard({
  lastChecks,
  serviceNameById,
}: OverviewLastChecksCardProps): React.JSX.Element {
  return (
    <div className="rounded-xl border border-neutral-100 bg-white">
      <div className="px-5 pt-5 pb-3">
        <h3 className="text-sm font-semibold text-neutral-900">Recent checks</h3>
      </div>
      {lastChecks.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-neutral-400">No checks yet.</p>
      ) : (
        <div className="px-5 pb-3">
          {lastChecks.map(({ monitor, check }) => (
            <div key={check.id} className="flex items-center justify-between py-3 border-b border-neutral-50 last:border-0">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-neutral-700">{serviceNameById.get(monitor.service_id) ?? "Unknown"}</span>
                  <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-400">{monitor.type.toUpperCase()}</span>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">{formatRelative(check.checked_at)}</p>
              </div>
              <div className="flex items-center gap-5">
                <span className="text-sm tabular-nums text-neutral-400">{check.response_time_ms}ms</span>
                <StatusBadge
                  status={
                    check.status === "up"
                      ? "operational"
                      : check.status === "degraded"
                        ? "degraded"
                        : "major_outage"
                  }
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
