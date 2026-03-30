import { Timer } from "lucide-react";
import { StatusBadge } from "@/components/status/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelative } from "@/lib/dates";
import { monitorDisplayName } from "./utils";
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Last 5 monitor check results</CardTitle>
      </CardHeader>
      <CardContent>
        {lastChecks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No monitor checks yet.</p>
        ) : (
          <div className="space-y-3">
            {lastChecks.map(({ monitor, check }) => (
              <div key={check.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium">{monitorDisplayName(serviceNameById.get(monitor.service_id), monitor.type)}</p>
                  <p className="text-xs text-muted-foreground">{formatRelative(check.checked_at)}</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Timer className="size-3" />
                    {check.response_time_ms}ms
                  </span>
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
      </CardContent>
    </Card>
  );
}
