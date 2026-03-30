import { Activity, AlertTriangle, GaugeCircle, Server } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="mb-8 grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total services</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <p className="text-2xl font-semibold">{servicesCount}</p>
          <Server className="size-4 text-muted-foreground" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Active monitors</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <p className="text-2xl font-semibold">{monitorsCount}</p>
          <Activity className="size-4 text-muted-foreground" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Open incidents</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <p className="text-2xl font-semibold">{openIncidentsCount}</p>
          <AlertTriangle className="size-4 text-muted-foreground" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Global uptime (30d)</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <p className="text-2xl font-semibold">{globalUptime === null ? "No data" : formatUptime(globalUptime)}</p>
          <GaugeCircle className="size-4 text-muted-foreground" />
        </CardContent>
      </Card>
    </div>
  );
}
