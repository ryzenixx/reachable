import { formatUptime } from "./utils";

type OverviewMetricsRowProps = {
  globalUptime: number | null;
  monitorsCount: number;
  openIncidentsCount: number;
  servicesCount: number;
};

export function OverviewMetricsRow({
  globalUptime,
  monitorsCount,
  openIncidentsCount,
  servicesCount,
}: OverviewMetricsRowProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <MetricCard label="Services" value={servicesCount} />
      <MetricCard label="Monitors" value={monitorsCount} />
      <MetricCard
        label="Open incidents"
        value={openIncidentsCount}
        accent={openIncidentsCount > 0 ? "red" : undefined}
      />
      <MetricCard
        label="Uptime (30d)"
        value={globalUptime === null ? "\u2014" : formatUptime(globalUptime)}
        accent={globalUptime !== null && globalUptime >= 99.9 ? "green" : undefined}
      />
    </div>
  );
}

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: "red" | "green";
}): React.JSX.Element {
  const valueColor = accent === "red"
    ? "text-red-600"
    : accent === "green"
      ? "text-emerald-600"
      : "text-neutral-900";

  return (
    <div className="rounded-xl border border-neutral-100 bg-neutral-50/50 px-5 py-5">
      <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums leading-none ${valueColor}`}>
        {value}
      </p>
    </div>
  );
}
