"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { StatusSummary } from "@/types/api";
import { dashboardKeys } from "./query-keys";

export function useStatusSummary() {
  return useQuery({
    queryKey: dashboardKeys.status,
    queryFn: async (): Promise<StatusSummary> => {
      return api.statusSummary();
    },
  });
}
