"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { serviceSchema, type ServiceValues } from "@/schemas";
import type { Service } from "@/types/api";
import { dashboardKeys } from "./query-keys";
import { normalizeOptionalText, tempId } from "./utils";

export function useServices() {
  return useQuery({
    queryKey: dashboardKeys.services,
    queryFn: async (): Promise<Service[]> => {
      return api.services();
    },
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: ServiceValues): Promise<Service> => {
      const payload = serviceSchema.parse(values);
      return api.createService({
        ...payload,
        description: normalizeOptionalText(payload.description),
      });
    },
    onMutate: async (values) => {
      const payload = serviceSchema.parse(values);
      await queryClient.cancelQueries({ queryKey: dashboardKeys.services });
      const previous = queryClient.getQueryData<Service[]>(dashboardKeys.services) ?? [];

      const optimistic: Service = {
        id: tempId("service"),
        organization_id: previous[0]?.organization_id ?? "",
        name: payload.name,
        description: normalizeOptionalText(payload.description),
        status: payload.status,
        order: payload.order ?? previous.length,
        is_public: payload.is_public,
        uptime_percentage: null,
        uptime_metrics: [],
        monitors: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueryData<Service[]>(dashboardKeys.services, [...previous, optimistic]);

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (!context) {
        return;
      }

      queryClient.setQueryData(dashboardKeys.services, context.previous);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.services });
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.status });
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ serviceId, values }: { serviceId: string; values: Partial<ServiceValues> }): Promise<Service> => {
      const payload = serviceSchema.partial().parse(values);
      return api.updateService(serviceId, {
        ...payload,
        description: normalizeOptionalText(payload.description),
      });
    },
    onMutate: async ({ serviceId, values }) => {
      const payload = serviceSchema.partial().parse(values);
      const normalizedPayload = {
        ...payload,
        description: normalizeOptionalText(payload.description),
      };
      await queryClient.cancelQueries({ queryKey: dashboardKeys.services });
      const previous = queryClient.getQueryData<Service[]>(dashboardKeys.services) ?? [];

      queryClient.setQueryData<Service[]>(dashboardKeys.services, (current) => {
        return (current ?? []).map((service) => {
          if (service.id !== serviceId) {
            return service;
          }

          return {
            ...service,
            ...normalizedPayload,
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

      queryClient.setQueryData(dashboardKeys.services, context.previous);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.services });
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.status });
    },
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serviceId: string): Promise<void> => {
      await api.deleteService(serviceId);
    },
    onMutate: async (serviceId) => {
      await queryClient.cancelQueries({ queryKey: dashboardKeys.services });
      const previous = queryClient.getQueryData<Service[]>(dashboardKeys.services) ?? [];

      queryClient.setQueryData<Service[]>(dashboardKeys.services, (current) => {
        return (current ?? []).filter((service) => service.id !== serviceId);
      });

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (!context) {
        return;
      }

      queryClient.setQueryData(dashboardKeys.services, context.previous);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.services });
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.status });
    },
  });
}

export function useReorderServices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (services: Array<{ id: string; order: number }>): Promise<void> => {
      await api.reorderServices({ services });
    },
    onMutate: async (services) => {
      await queryClient.cancelQueries({ queryKey: dashboardKeys.services });
      const previous = queryClient.getQueryData<Service[]>(dashboardKeys.services) ?? [];

      const byId = new Map(services.map((item) => [item.id, item.order]));

      queryClient.setQueryData<Service[]>(dashboardKeys.services, (current) => {
        return [...(current ?? [])]
          .map((service) => ({
            ...service,
            order: byId.get(service.id) ?? service.order,
          }))
          .sort((a, b) => a.order - b.order);
      });

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (!context) {
        return;
      }

      queryClient.setQueryData(dashboardKeys.services, context.previous);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.services });
    },
  });
}
