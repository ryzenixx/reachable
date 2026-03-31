"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { MonitorValues } from "@/schemas";
import type { Monitor } from "@/types/api";
import { dashboardKeys } from "./query-keys";
import { tempId } from "./utils";

export function useMonitors() {
  return useQuery({
    queryKey: dashboardKeys.monitors,
    queryFn: async (): Promise<Monitor[]> => {
      return api.monitors();
    },
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
  });
}

export function useCreateMonitor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: MonitorValues): Promise<Monitor> => {
      return api.createMonitor(values);
    },
    onMutate: async (values) => {
      await queryClient.cancelQueries({ queryKey: dashboardKeys.monitors });
      const previous = queryClient.getQueryData<Monitor[]>(dashboardKeys.monitors) ?? [];

      const optimistic: Monitor = {
        id: tempId("monitor"),
        service_id: values.service_id,
        type: values.type,
        url: values.url,
        method: values.method,
        interval_seconds: values.interval_seconds,
        timeout_ms: values.timeout_ms,
        expected_status_code: values.expected_status_code,
        is_active: values.is_active,
        verify_ssl: values.verify_ssl,
        latest_check: null,
        checks: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueryData<Monitor[]>(dashboardKeys.monitors, [...previous, optimistic]);

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (!context) {
        return;
      }

      queryClient.setQueryData(dashboardKeys.monitors, context.previous);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.monitors });
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.services });
    },
  });
}

export function useUpdateMonitor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ monitorId, values }: { monitorId: string; values: Partial<MonitorValues> }): Promise<Monitor> => {
      return api.updateMonitor(monitorId, values);
    },
    onMutate: async ({ monitorId, values }) => {
      await queryClient.cancelQueries({ queryKey: dashboardKeys.monitors });
      const previous = queryClient.getQueryData<Monitor[]>(dashboardKeys.monitors) ?? [];

      queryClient.setQueryData<Monitor[]>(dashboardKeys.monitors, (current) => {
        return (current ?? []).map((monitor) => {
          if (monitor.id !== monitorId) {
            return monitor;
          }

          return {
            ...monitor,
            ...values,
            updated_at: new Date().toISOString(),
          };
        });
      });

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (!context) {
        return;
      }

      queryClient.setQueryData(dashboardKeys.monitors, context.previous);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.monitors });
    },
  });
}

export function useDeleteMonitor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (monitorId: string): Promise<void> => {
      await api.deleteMonitor(monitorId);
    },
    onMutate: async (monitorId) => {
      await queryClient.cancelQueries({ queryKey: dashboardKeys.monitors });
      const previous = queryClient.getQueryData<Monitor[]>(dashboardKeys.monitors) ?? [];

      queryClient.setQueryData<Monitor[]>(dashboardKeys.monitors, (current) => {
        return (current ?? []).filter((monitor) => monitor.id !== monitorId);
      });

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (!context) {
        return;
      }

      queryClient.setQueryData(dashboardKeys.monitors, context.previous);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.monitors });
    },
  });
}
