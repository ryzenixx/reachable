import type {
  ApiTokenSummary,
  AuthUser,
  CreateApiTokenResponse,
  Incident,
  IncidentUpdate,
  Maintenance,
  Monitor,
  OnboardingState,
  Organization,
  PublicIncidentPayload,
  PublicStatusPayload,
  Service,
  StatusSummary,
  Subscriber,
  UptimeMetric,
} from "@/types/api";
import { apiClient, request } from "./client";
import type {
  BootstrapOnboardingResponse,
  CreateApiTokenPayload,
  CreateIncidentPayload,
  CreateIncidentUpdatePayload,
  CreateMaintenancePayload,
  CreateMonitorPayload,
  CreateServicePayload,
  DeleteOrganizationPayload,
  LoginPayload,
  LoginResponse,
  OnboardingPayload,
  ReorderServicesPayload,
  UpdateIncidentPayload,
  UpdateMaintenancePayload,
  UpdateMonitorPayload,
  UpdateOrganizationPayload,
  UpdateServicePayload,
} from "./contracts";
import { mapApiError } from "./errors";

export const api = {
  onboardingState(): Promise<OnboardingState> {
    return request<OnboardingState>({ method: "GET", url: "/onboarding/state" });
  },

  bootstrapOnboarding(payload: OnboardingPayload): Promise<BootstrapOnboardingResponse> {
    return request<BootstrapOnboardingResponse>({ method: "POST", url: "/onboarding/bootstrap", data: payload });
  },

  login(payload: LoginPayload): Promise<LoginResponse> {
    return request<LoginResponse>({ method: "POST", url: "/auth/login", data: payload });
  },

  me(): Promise<AuthUser> {
    return request<AuthUser>({ method: "GET", url: "/auth/me" });
  },

  logout(): Promise<{ message: string }> {
    return request<{ message: string }>({ method: "POST", url: "/auth/logout" });
  },

  statusSummary(): Promise<StatusSummary> {
    return request<StatusSummary>({ method: "GET", url: "/status" });
  },

  services(): Promise<Service[]> {
    return request<Service[]>({ method: "GET", url: "/dashboard/services" });
  },

  createService(payload: CreateServicePayload): Promise<Service> {
    return request<Service>({ method: "POST", url: "/dashboard/services", data: payload });
  },

  updateService(serviceId: string, payload: UpdateServicePayload): Promise<Service> {
    return request<Service>({ method: "PATCH", url: `/dashboard/services/${serviceId}`, data: payload });
  },

  deleteService(serviceId: string): Promise<void> {
    return request<void>({ method: "DELETE", url: `/dashboard/services/${serviceId}` });
  },

  reorderServices(payload: ReorderServicesPayload): Promise<{ message: string }> {
    return request<{ message: string }>({ method: "POST", url: "/dashboard/services/reorder", data: payload });
  },

  monitors(): Promise<Monitor[]> {
    return request<Monitor[]>({ method: "GET", url: "/dashboard/monitors" });
  },

  createMonitor(payload: CreateMonitorPayload): Promise<Monitor> {
    return request<Monitor>({ method: "POST", url: "/dashboard/monitors", data: payload });
  },

  updateMonitor(monitorId: string, payload: UpdateMonitorPayload): Promise<Monitor> {
    return request<Monitor>({ method: "PATCH", url: `/dashboard/monitors/${monitorId}`, data: payload });
  },

  deleteMonitor(monitorId: string): Promise<void> {
    return request<void>({ method: "DELETE", url: `/dashboard/monitors/${monitorId}` });
  },

  incidents(): Promise<Incident[]> {
    return request<Incident[]>({ method: "GET", url: "/incidents" });
  },

  incident(incidentId: string): Promise<Incident> {
    return request<Incident>({ method: "GET", url: `/incidents/${incidentId}` });
  },

  createIncident(payload: CreateIncidentPayload): Promise<Incident> {
    return request<Incident>({ method: "POST", url: "/incidents", data: payload });
  },

  updateIncident(incidentId: string, payload: UpdateIncidentPayload): Promise<Incident> {
    return request<Incident>({ method: "PATCH", url: `/incidents/${incidentId}`, data: payload });
  },

  createIncidentUpdate(incidentId: string, payload: CreateIncidentUpdatePayload): Promise<IncidentUpdate> {
    return request<IncidentUpdate>({ method: "POST", url: `/incidents/${incidentId}/updates`, data: payload });
  },

  deleteIncident(incidentId: string): Promise<void> {
    return request<void>({ method: "DELETE", url: `/incidents/${incidentId}` });
  },

  maintenances(): Promise<Maintenance[]> {
    return request<Maintenance[]>({ method: "GET", url: "/dashboard/maintenances" });
  },

  createMaintenance(payload: CreateMaintenancePayload): Promise<Maintenance> {
    return request<Maintenance>({ method: "POST", url: "/dashboard/maintenances", data: payload });
  },

  updateMaintenance(maintenanceId: string, payload: UpdateMaintenancePayload): Promise<Maintenance> {
    return request<Maintenance>({ method: "PATCH", url: `/dashboard/maintenances/${maintenanceId}`, data: payload });
  },

  completeMaintenance(maintenanceId: string): Promise<Maintenance> {
    return request<Maintenance>({ method: "POST", url: `/dashboard/maintenances/${maintenanceId}/complete` });
  },

  deleteMaintenance(maintenanceId: string): Promise<void> {
    return request<void>({ method: "DELETE", url: `/dashboard/maintenances/${maintenanceId}` });
  },

  subscribers(): Promise<Subscriber[]> {
    return request<Subscriber[]>({ method: "GET", url: "/dashboard/subscribers" });
  },

  createSubscriber(email: string): Promise<Subscriber> {
    return request<Subscriber>({ method: "POST", url: "/dashboard/subscribers", data: { email } });
  },

  deleteSubscriber(subscriberId: string): Promise<void> {
    return request<void>({ method: "DELETE", url: `/dashboard/subscribers/${subscriberId}` });
  },

  exportSubscribersCsv(): Promise<Blob> {
    return apiClient
      .get<Blob>("/dashboard/subscribers-export", { responseType: "blob" })
      .then((response) => response.data)
      .catch((error) => {
        throw mapApiError(error);
      });
  },

  organizationSettings(): Promise<Organization> {
    return request<Organization>({ method: "GET", url: "/dashboard/settings/organization" });
  },

  updateOrganizationSettings(organizationId: string, payload: UpdateOrganizationPayload): Promise<Organization> {
    return request<Organization>({
      method: "PATCH",
      url: `/dashboard/settings/organization/${organizationId}`,
      data: payload,
    });
  },

  deleteOrganization(organizationId: string, payload: DeleteOrganizationPayload): Promise<void> {
    return request<void>({
      method: "DELETE",
      url: `/dashboard/settings/organization/${organizationId}`,
      data: payload,
    });
  },

  apiTokens(): Promise<ApiTokenSummary[]> {
    return request<ApiTokenSummary[]>({ method: "GET", url: "/dashboard/tokens" });
  },

  createApiToken(payload: CreateApiTokenPayload): Promise<CreateApiTokenResponse> {
    return request<CreateApiTokenResponse>({ method: "POST", url: "/dashboard/tokens", data: payload });
  },

  deleteApiToken(tokenId: number): Promise<void> {
    return request<void>({ method: "DELETE", url: `/dashboard/tokens/${tokenId}` });
  },

  uptime(serviceId: string): Promise<UptimeMetric[]> {
    return request<UptimeMetric[]>({ method: "GET", url: `/uptime/${serviceId}` });
  },

  publicStatus(page = 1): Promise<PublicStatusPayload> {
    return request<PublicStatusPayload>({ method: "GET", url: `/public?page=${page}` });
  },

  publicIncident(incidentId: string): Promise<PublicIncidentPayload> {
    return request<PublicIncidentPayload>({ method: "GET", url: `/public/incidents/${incidentId}` });
  },

  subscribe(email: string): Promise<{ message: string; subscriber_id: string }> {
    return request<{ message: string; subscriber_id: string }>({
      method: "POST",
      url: "/public/subscribe",
      data: { email },
    });
  },
};
