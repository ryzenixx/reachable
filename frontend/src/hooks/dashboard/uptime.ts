"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { UptimeMetric } from "@/types/api";
import { dashboardKeys } from "./query-keys";

export function useUptime(serviceId: string) {
  return useQuery({
    queryKey: dashboardKeys.uptime(serviceId),
    queryFn: async (): Promise<UptimeMetric[]> => {
      return api.uptime(serviceId);
    },
    enabled: serviceId.length > 0,
  });
}
