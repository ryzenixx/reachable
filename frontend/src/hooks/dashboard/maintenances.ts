"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { maintenanceSchema, type MaintenanceValues } from "@/schemas";
import type { Maintenance } from "@/types/api";
import { dashboardKeys, publicStatusKey } from "./query-keys";

export function useMaintenances() {
  return useQuery({
    queryKey: dashboardKeys.maintenances,
    queryFn: async (): Promise<Maintenance[]> => {
      return api.maintenances();
    },
  });
}

export function useCreateMaintenance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: MaintenanceValues): Promise<Maintenance> => {
      const payload = maintenanceSchema.parse(values);
      return api.createMaintenance(payload);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.maintenances });
      await queryClient.invalidateQueries({ queryKey: publicStatusKey });
    },
  });
}

export function useUpdateMaintenance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      maintenanceId,
      values,
    }: {
      maintenanceId: string;
      values: Partial<MaintenanceValues>;
    }): Promise<Maintenance> => {
      const payload = maintenanceSchema.partial().parse(values);
      return api.updateMaintenance(maintenanceId, payload);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.maintenances });
      await queryClient.invalidateQueries({ queryKey: publicStatusKey });
    },
  });
}

export function useCompleteMaintenance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (maintenanceId: string): Promise<Maintenance> => {
      return api.completeMaintenance(maintenanceId);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.maintenances });
      await queryClient.invalidateQueries({ queryKey: publicStatusKey });
    },
  });
}

export function useDeleteMaintenance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (maintenanceId: string): Promise<void> => {
      await api.deleteMaintenance(maintenanceId);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.maintenances });
      await queryClient.invalidateQueries({ queryKey: publicStatusKey });
    },
  });
}
