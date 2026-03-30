"use client";

export { dashboardKeys, publicStatusKey } from "@/hooks/dashboard/query-keys";
export { useStatusSummary } from "@/hooks/dashboard/status";
export {
  useCreateService,
  useDeleteService,
  useReorderServices,
  useServices,
  useUpdateService,
} from "@/hooks/dashboard/services";
export {
  useCreateMonitor,
  useDeleteMonitor,
  useMonitors,
  useUpdateMonitor,
} from "@/hooks/dashboard/monitors";
export {
  useAddIncidentUpdate,
  useCreateIncident,
  useDeleteIncident,
  useIncident,
  useIncidents,
  useUpdateIncident,
} from "@/hooks/dashboard/incidents";
export {
  useCompleteMaintenance,
  useCreateMaintenance,
  useDeleteMaintenance,
  useMaintenances,
  useUpdateMaintenance,
} from "@/hooks/dashboard/maintenances";
export {
  useCreateSubscriber,
  useDeleteSubscriber,
  useExportSubscribers,
  useSubscribers,
} from "@/hooks/dashboard/subscribers";
export {
  useDeleteOrganization,
  useOrganizationSettings,
  useUpdateOrganizationSettings,
} from "@/hooks/dashboard/settings";
export {
  useApiTokens,
  useCreateApiToken,
  useDeleteApiToken,
} from "@/hooks/dashboard/api-tokens";
export { useUptime } from "@/hooks/dashboard/uptime";
