"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { SystemVersionSummary } from "@/types/api";
import { dashboardKeys } from "./query-keys";

export function useSystemVersion({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: dashboardKeys.systemVersion,
    queryFn: async (): Promise<SystemVersionSummary> => {
      return api.systemVersion();
    },
    enabled,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: true,
  });
}
