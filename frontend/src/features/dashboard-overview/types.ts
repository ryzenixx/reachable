import type { Monitor, MonitorCheck, Service } from "@/types/api";

export type LastMonitorCheckRow = {
  check: MonitorCheck;
  monitor: Monitor;
};

export type ServiceNameById = Map<string, Service["name"]>;
