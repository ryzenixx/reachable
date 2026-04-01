import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { Incident, IncidentImpact, UptimeMetric } from "@/types/api";

type UptimeBarsProps = {
  metrics: UptimeMetric[];
  serviceId: string;
  incidents: Incident[];
};

type IncidentDayData = {
  impact: IncidentImpact;
  titles: string[];
};

const impactFillColorMap: Record<IncidentImpact, string> = {
  none: "#22c55e",
  minor: "#eab308",
  major: "#f97316",
  critical: "#ef4444",
};

const impactTextClassMap: Record<IncidentImpact, string> = {
  none: "text-green-600",
  minor: "text-yellow-600",
  major: "text-orange-600",
  critical: "text-red-600",
};

const impactLabelMap: Record<IncidentImpact, string> = {
  none: "No impact",
  minor: "Minor impact",
  major: "Major impact",
  critical: "Critical impact",
};

function incidentImpactSeverity(impact: IncidentImpact): number {
  switch (impact) {
    case "critical":
      return 3;
    case "major":
      return 2;
    case "minor":
      return 1;
    case "none":
      return 0;
    default:
      return 0;
  }
}

function normalizeMetricDayKey(dateValue: string): string {
  return dateValue.includes("T") ? dateValue.slice(0, 10) : dateValue;
}

function toLocalDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toStartOfDay(dateValue: string | Date): Date {
  const date = new Date(dateValue);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function collectIncidentDayData(incidents: Incident[], serviceId: string): Map<string, IncidentDayData> {
  const byDay = new Map<string, { impact: IncidentImpact; titles: Set<string> }>();
  const today = toStartOfDay(new Date());

  for (const incident of incidents) {
    const affectsService = incident.services.some((service) => service.id === serviceId);

    if (!affectsService) {
      continue;
    }

    const start = toStartOfDay(incident.created_at);
    const resolvedAt = incident.resolved_at ? toStartOfDay(incident.resolved_at) : today;
    const end = resolvedAt.getTime() < start.getTime() ? start : resolvedAt;

    const cursor = new Date(start);

    while (cursor.getTime() <= end.getTime()) {
      const key = toLocalDayKey(cursor);
      const existing = byDay.get(key);

      if (!existing) {
        byDay.set(key, {
          impact: incident.impact,
          titles: new Set<string>([incident.title]),
        });
      } else {
        if (incidentImpactSeverity(incident.impact) > incidentImpactSeverity(existing.impact)) {
          existing.impact = incident.impact;
        }

        existing.titles.add(incident.title);
      }

      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return new Map(
    Array.from(byDay.entries()).map(([key, value]) => [
      key,
      {
        impact: value.impact,
        titles: Array.from(value.titles.values()),
      },
    ]),
  );
}

export function UptimeBars({ metrics, serviceId, incidents }: UptimeBarsProps): React.JSX.Element {
  const [activeBarIndex, setActiveBarIndex] = useState<number | null>(null);

  const metricByDay = useMemo(() => {
    return new Map(metrics.map((metric) => [normalizeMetricDayKey(metric.date), Number(metric.uptime_percentage)]));
  }, [metrics]);

  const incidentByDay = useMemo(() => {
    return collectIncidentDayData(incidents, serviceId);
  }, [incidents, serviceId]);

  const bars = useMemo(() => {
    const today = toStartOfDay(new Date());

    return Array.from({ length: 90 }).map((_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (89 - index));

      const dayKey = toLocalDayKey(date);
      const incidentDay = incidentByDay.get(dayKey) ?? null;
      const metricValue = metricByDay.get(dayKey);
      const uptime = typeof metricValue === "number" && Number.isFinite(metricValue) ? metricValue : null;

      return {
        index,
        dayKey,
        label: formatDayLabel(date),
        impact: incidentDay?.impact ?? null,
        incidentTitles: incidentDay?.titles ?? [],
        uptime,
        fillColor: incidentDay ? impactFillColorMap[incidentDay.impact] : impactFillColorMap.none,
      };
    });
  }, [incidentByDay, metricByDay]);

  const activeBar = activeBarIndex === null ? null : bars[activeBarIndex];
  const tooltipLeft = activeBar ? Math.min(Math.max(((activeBar.index + 0.5) / bars.length) * 100, 14), 86) : 50;

  const barCount = bars.length;
  const barWidth = 7;
  const barGap = 3;
  const barStep = barWidth + barGap;
  const viewBoxWidth = barCount * barStep - barGap;
  const viewBoxHeight = 28;
  const barRadius = 3;

  return (
    <div className="relative">
      <svg
        aria-label="Uptime history bars"
        className="h-7 w-full"
        preserveAspectRatio="none"
        role="img"
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      >
        {bars.map((bar) => {
          const x = bar.index * barStep;
          const fill = bar.impact !== null ? impactFillColorMap[bar.impact] : impactFillColorMap.none;

          return (
            <rect
              key={bar.dayKey}
              aria-label={`${bar.label} service status details`}
              fill={fill}
              height={viewBoxHeight}
              onBlur={() => {
                setActiveBarIndex((current) => (current === bar.index ? null : current));
              }}
              onFocus={() => {
                setActiveBarIndex(bar.index);
              }}
              onMouseEnter={() => {
                setActiveBarIndex(bar.index);
              }}
              onMouseLeave={() => {
                setActiveBarIndex((current) => (current === bar.index ? null : current));
              }}
              opacity={activeBarIndex === bar.index ? 0.85 : 1}
              role="button"
              rx={barRadius}
              ry={barRadius}
              style={{ cursor: "pointer", transition: "opacity 0.15s" }}
              tabIndex={0}
              width={barWidth}
              x={x}
              y={0}
            />
          );
        })}
      </svg>

      {activeBar ? (
        <div
          className="pointer-events-none absolute bottom-full z-20 mb-3 w-72 max-w-[calc(100vw-3rem)] -translate-x-1/2 rounded-lg border bg-card p-3 shadow-sm"
          style={{ left: `${tooltipLeft}%` }}
        >
          <p className="text-sm font-semibold">{activeBar.label}</p>

          {activeBar.impact === null ? (
            <p className="mt-2 text-sm text-muted-foreground">No incidents reported on this day.</p>
          ) : (
            <div className="mt-2 rounded-md bg-muted/40 p-2">
              <div className="flex items-center justify-between gap-2">
                <p className={cn("text-sm font-semibold", impactTextClassMap[activeBar.impact])}>
                  {impactLabelMap[activeBar.impact]}
                </p>
                <p className="text-xs text-muted-foreground">
                  {activeBar.incidentTitles.length} incident{activeBar.incidentTitles.length > 1 ? "s" : ""}
                </p>
              </div>
            </div>
          )}

          {activeBar.incidentTitles.length > 0 ? (
            <div className="mt-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Related</p>
              <ul className="mt-1 space-y-1">
                {activeBar.incidentTitles.slice(0, 3).map((title) => (
                  <li key={title} className="text-sm">
                    {title}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <span className="absolute left-1/2 top-full size-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r bg-card" />
        </div>
      ) : null}
    </div>
  );
}
