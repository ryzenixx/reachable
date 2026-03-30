"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  apiTokenSchema,
  deleteOrganizationSchema,
  incidentSchema,
  incidentUpdateSchema,
  maintenanceSchema,
  serviceSchema,
  settingsSchema,
  subscriberSchema,
  type ApiTokenValues,
  type IncidentUpdateValues,
  type IncidentValues,
  type MaintenanceValues,
  type MonitorValues,
  type ServiceValues,
  type SettingsValues,
} from "@/schemas";
import type {
  ApiTokenSummary,
  CreateApiTokenResponse,
  Incident,
  IncidentUpdate,
  Maintenance,
  Monitor,
  Organization,
  Service,
  StatusSummary,
  Subscriber,
  UptimeMetric,
} from "@/types/api";

export const dashboardKeys = {
  status: ["dashboard", "status"] as const,
  services: ["dashboard", "services"] as const,
  monitors: ["dashboard", "monitors"] as const,
  incidents: ["dashboard", "incidents"] as const,
  incident: (incidentId: string) => ["dashboard", "incident", incidentId] as const,
  maintenances: ["dashboard", "maintenances"] as const,
  subscribers: ["dashboard", "subscribers"] as const,
  settings: ["dashboard", "settings"] as const,
  apiTokens: ["dashboard", "api-tokens"] as const,
  uptime: (serviceId: string) => ["dashboard", "uptime", serviceId] as const,
};

function tempId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function normalizeOptionalText(value?: string | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function useStatusSummary() {
  return useQuery({
    queryKey: dashboardKeys.status,
    queryFn: async (): Promise<StatusSummary> => {
      return api.statusSummary();
    },
  });
}

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

export function useIncidents() {
  return useQuery({
    queryKey: dashboardKeys.incidents,
    queryFn: async (): Promise<Incident[]> => {
      return api.incidents();
    },
  });
}

export function useIncident(incidentId: string) {
  return useQuery({
    queryKey: dashboardKeys.incident(incidentId),
    queryFn: async (): Promise<Incident> => {
      return api.incident(incidentId);
    },
    enabled: incidentId.length > 0,
  });
}

export function useCreateIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: IncidentValues): Promise<Incident> => {
      const payload = incidentSchema.parse(values);
      return api.createIncident(payload);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.incidents });
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.services });
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.status });
      await queryClient.invalidateQueries({ queryKey: ["public-status"] });
    },
  });
}

export function useUpdateIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      incidentId,
      values,
    }: {
      incidentId: string;
      values: Partial<IncidentValues>;
    }): Promise<Incident> => {
      const payload = incidentSchema.partial().parse(values);
      return api.updateIncident(incidentId, payload);
    },
    onSettled: async (_data, _error, variables) => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.incidents });
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.incident(variables.incidentId) });
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.services });
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.status });
      await queryClient.invalidateQueries({ queryKey: ["public-status"] });
    },
  });
}

export function useAddIncidentUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      incidentId: string;
      values: IncidentUpdateValues;
    }): Promise<IncidentUpdate> => {
      const payload = incidentUpdateSchema.parse(input.values);
      return api.createIncidentUpdate(input.incidentId, payload);
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: dashboardKeys.incident(input.incidentId) });
      const previous = queryClient.getQueryData<Incident>(dashboardKeys.incident(input.incidentId));

      if (previous) {
        const optimisticUpdate: IncidentUpdate = {
          id: tempId("incident_update"),
          incident_id: input.incidentId,
          status: input.values.status,
          message: input.values.message,
          created_at: new Date().toISOString(),
        };

        queryClient.setQueryData<Incident>(dashboardKeys.incident(input.incidentId), {
          ...previous,
          status: input.values.status,
          updates: [...previous.updates, optimisticUpdate],
        });
      }

      return { previous, incidentId: input.incidentId };
    },
    onError: (_error, _variables, context) => {
      if (!context?.previous) {
        return;
      }

      queryClient.setQueryData(dashboardKeys.incident(context.incidentId), context.previous);
    },
    onSettled: async (_data, _error, variables) => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.incidents });
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.incident(variables.incidentId) });
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.services });
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.status });
      await queryClient.invalidateQueries({ queryKey: ["public-status"] });
    },
  });
}

export function useDeleteIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (incidentId: string): Promise<void> => {
      await api.deleteIncident(incidentId);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.incidents });
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.services });
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.status });
      await queryClient.invalidateQueries({ queryKey: ["public-status"] });
    },
  });
}

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
      await queryClient.invalidateQueries({ queryKey: ["public-status"] });
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
      await queryClient.invalidateQueries({ queryKey: ["public-status"] });
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
      await queryClient.invalidateQueries({ queryKey: ["public-status"] });
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
      await queryClient.invalidateQueries({ queryKey: ["public-status"] });
    },
  });
}

export function useSubscribers() {
  return useQuery({
    queryKey: dashboardKeys.subscribers,
    queryFn: async (): Promise<Subscriber[]> => {
      return api.subscribers();
    },
  });
}

export function useCreateSubscriber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (email: string): Promise<Subscriber> => {
      const payload = subscriberSchema.parse({ email });
      return api.createSubscriber(payload.email);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.subscribers });
    },
  });
}

export function useDeleteSubscriber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subscriberId: string): Promise<void> => {
      await api.deleteSubscriber(subscriberId);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.subscribers });
    },
  });
}

export function useExportSubscribers() {
  return useMutation({
    mutationFn: async (): Promise<Blob> => {
      return api.exportSubscribersCsv();
    },
  });
}

export function useOrganizationSettings() {
  return useQuery({
    queryKey: dashboardKeys.settings,
    queryFn: async (): Promise<Organization> => {
      return api.organizationSettings();
    },
  });
}

export function useUpdateOrganizationSettings(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: SettingsValues): Promise<Organization> => {
      const normalizedValues: SettingsValues = {
        name: typeof values.name === "string" ? values.name : "",
        logo_url: values.logo_url ?? "",
        banner_url: values.banner_url ?? "",
        custom_domain: values.custom_domain ?? "",
        smtp_enabled: values.smtp_enabled === "enabled" ? "enabled" : "disabled",
        smtp_host: values.smtp_host ?? "",
        smtp_port: typeof values.smtp_port === "number" ? values.smtp_port : null,
        smtp_username: values.smtp_username ?? "",
        smtp_password: values.smtp_password ?? "",
        smtp_encryption: values.smtp_encryption ?? "tls",
        smtp_from_address: values.smtp_from_address ?? "",
        smtp_from_name: values.smtp_from_name ?? "",
      };

      const payload = settingsSchema.parse(normalizedValues);

      const smtpPassword =
        typeof payload.smtp_password === "string" && payload.smtp_password.trim().length > 0
          ? payload.smtp_password.trim()
          : undefined;

      return api.updateOrganizationSettings(organizationId, {
        ...payload,
        logo_url: normalizeOptionalText(payload.logo_url),
        banner_url: normalizeOptionalText(payload.banner_url),
        custom_domain: normalizeOptionalText(payload.custom_domain),
        smtp_enabled: payload.smtp_enabled === "enabled",
        smtp_host: normalizeOptionalText(payload.smtp_host),
        smtp_port: payload.smtp_port ?? null,
        smtp_username: normalizeOptionalText(payload.smtp_username),
        smtp_password: smtpPassword,
        smtp_encryption: payload.smtp_encryption ?? null,
        smtp_from_address: normalizeOptionalText(payload.smtp_from_address),
        smtp_from_name: normalizeOptionalText(payload.smtp_from_name),
      });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Organization>(dashboardKeys.settings, updated);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.settings });
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      await queryClient.invalidateQueries({ queryKey: ["public-status"] });
    },
  });
}

export function useDeleteOrganization(organizationId: string) {
  return useMutation({
    mutationFn: async (values: { confirmation_name: string }): Promise<void> => {
      const payload = deleteOrganizationSchema.parse(values);
      await api.deleteOrganization(organizationId, payload);
    },
  });
}

export function useApiTokens() {
  return useQuery({
    queryKey: dashboardKeys.apiTokens,
    queryFn: async (): Promise<ApiTokenSummary[]> => {
      return api.apiTokens();
    },
  });
}

export function useCreateApiToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: ApiTokenValues): Promise<CreateApiTokenResponse> => {
      const payload = apiTokenSchema.parse(values);
      return api.createApiToken(payload);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.apiTokens });
    },
  });
}

export function useDeleteApiToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tokenId: number): Promise<void> => {
      await api.deleteApiToken(tokenId);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.apiTokens });
    },
  });
}

export function useUptime(serviceId: string) {
  return useQuery({
    queryKey: dashboardKeys.uptime(serviceId),
    queryFn: async (): Promise<UptimeMetric[]> => {
      return api.uptime(serviceId);
    },
    enabled: serviceId.length > 0,
  });
}
