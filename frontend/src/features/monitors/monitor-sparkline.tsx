"use client";

import { format } from "date-fns";
import { Line, LineChart, ResponsiveContainer, Tooltip } from "recharts";
import type { Monitor } from "@/types/api";

type MonitorSparklineProps = {
  monitor: Monitor;
};

export function MonitorSparkline({ monitor }: MonitorSparklineProps): React.JSX.Element {
  const data = [...monitor.checks]
    .slice(0, 24)
    .reverse()
    .map((check) => ({
      response_time_ms: check.response_time_ms,
      checked_at: check.checked_at,
    }));

  if (data.length === 0) {
    return <span className="text-xs text-muted-foreground">No data</span>;
  }

  return (
    <div className="h-8 w-28">
      <ResponsiveContainer>
        <LineChart data={data}>
          <Tooltip
            allowEscapeViewBox={{ x: true, y: true }}
            content={({ active, payload }) => {
              const item = payload?.[0]?.payload;

              if (!active || !item) {
                return null;
              }

              const checkedAt = new Date(item.checked_at);
              const hasValidDate = !Number.isNaN(checkedAt.getTime());
              const responseMs =
                typeof item.response_time_ms === "number" && Number.isFinite(item.response_time_ms)
                  ? `${item.response_time_ms}ms`
                  : "N/A";

              return (
                <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-sm">
                  <p className="font-medium">{responseMs}</p>
                  <p className="text-muted-foreground">
                    {hasValidDate ? format(checkedAt, "dd MMM yyyy, HH:mm:ss") : "Check time unavailable"}
                  </p>
                </div>
              );
            }}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid oklch(92% 0.006 286)",
              fontSize: 11,
            }}
            cursor={false}
            offset={18}
            wrapperStyle={{
              pointerEvents: "none",
              transform: "translateY(-22px)",
              zIndex: 40,
            }}
          />
          <Line dataKey="response_time_ms" dot={false} stroke="currentColor" strokeWidth={1.5} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
