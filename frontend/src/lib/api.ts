import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import { env } from "@/env.mjs";
import type {
  ApiEnvelope,
  ApiErrorPayload,
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

const NETWORK_ERROR_EVENT = "reachable:network-error";
const NETWORK_OK_EVENT = "reachable:network-ok";

type LoginPayload = {
  email: string;
  password: string;
  device_name?: string;
};

type OnboardingPayload = {
  organization_name: string;
  owner_name: string;
  owner_email: string;
  owner_password: string;
  device_name?: string;
};

type CreateServicePayload = {
  name: string;
  description?: string | null;
  status: Service["status"];
  order?: number;
  is_public?: boolean;
};

type UpdateServicePayload = Partial<CreateServicePayload>;

type ReorderServicesPayload = {
  services: Array<{
    id: string;
    order: number;
  }>;
};

type CreateMonitorPayload = {
  service_id: string;
  type: Monitor["type"];
  url: string;
  method: Monitor["method"];
  interval_seconds: number;
  timeout_ms: number;
  expected_status_code: number;
  is_active: boolean;
};

type UpdateMonitorPayload = Partial<CreateMonitorPayload>;

type CreateIncidentPayload = {
  title: string;
  status: Incident["status"];
  impact: Incident["impact"];
  message?: string;
  service_ids: string[];
};

type UpdateIncidentPayload = {
  status?: Incident["status"];
  impact?: Incident["impact"];
  resolved_at?: string | null;
};

type CreateIncidentUpdatePayload = {
  status: IncidentUpdate["status"];
  message: string;
};

type CreateMaintenancePayload = {
  title: string;
  description: string;
  scheduled_at: string;
  ended_at?: string | null;
  status: Maintenance["status"];
};

type UpdateMaintenancePayload = Partial<CreateMaintenancePayload>;

type UpdateOrganizationPayload = {
  name: string;
  logo_url?: string | null;
  banner_url?: string | null;
  custom_domain?: string | null;
  smtp_enabled: boolean;
  smtp_host?: string | null;
  smtp_port?: number | null;
  smtp_username?: string | null;
  smtp_password?: string;
  smtp_encryption?: "none" | "tls" | "ssl" | null;
  smtp_from_address?: string | null;
  smtp_from_name?: string | null;
};

type CreateApiTokenPayload = {
  name: string;
};

type DeleteOrganizationPayload = {
  confirmation_name: string;
};

export class ApiError extends Error {
  readonly status: number | null;
  readonly fields: Record<string, string[]>;
  readonly isNetworkError: boolean;

  constructor(message: string, options?: { status?: number | null; fields?: Record<string, string[]>; isNetworkError?: boolean }) {
    super(message);
    this.name = "ApiError";
    this.status = options?.status ?? null;
    this.fields = options?.fields ?? {};
    this.isNetworkError = options?.isNetworkError ?? false;
  }

  firstFieldError(field: string): string | null {
    const [first] = this.fields[field] ?? [];
    return first ?? null;
  }
}

function emitNetwork(eventName: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(eventName));
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function resolveBrowserAwareApiBaseUrl(configuredUrl: string): string {
  if (typeof window === "undefined") {
    return configuredUrl.replace(/\/$/, "");
  }

  try {
    const url = new URL(configuredUrl);
    const browserHostname = window.location.hostname;

    if (isLoopbackHost(url.hostname) && !isLoopbackHost(browserHostname)) {
      url.hostname = browserHostname;
      return url.toString().replace(/\/$/, "");
    }
  } catch {
    return configuredUrl.replace(/\/$/, "");
  }

  return configuredUrl.replace(/\/$/, "");
}

export const apiClient = axios.create({
  baseURL: resolveBrowserAwareApiBaseUrl(env.NEXT_PUBLIC_API_URL),
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.response.use(
  (response) => {
    emitNetwork(NETWORK_OK_EVENT);
    return response;
  },
  (error) => {
    if (axios.isAxiosError(error) && !error.response) {
      emitNetwork(NETWORK_ERROR_EVENT);
    }
    return Promise.reject(error);
  },
);

export function setApiToken(token: string | null): void {
  if (!token) {
    delete apiClient.defaults.headers.common.Authorization;
    return;
  }

  apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
}

function unwrap<T>(payload: T | ApiEnvelope<T>): T {
  if (typeof payload === "object" && payload !== null && "data" in payload) {
    return (payload as ApiEnvelope<T>).data;
  }

  return payload;
}

function mapApiError(error: unknown): ApiError {
  if (!(error instanceof AxiosError)) {
    return new ApiError("Something went wrong.");
  }

  if (!error.response) {
    return new ApiError("Unable to connect to server, retrying...", {
      isNetworkError: true,
    });
  }

  const data = error.response.data as ApiErrorPayload | undefined;

  return new ApiError(data?.message ?? "Request failed.", {
    status: error.response.status,
    fields: data?.errors ?? {},
    isNetworkError: false,
  });
}

async function request<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await apiClient.request<T | ApiEnvelope<T>>(config);
    return unwrap(response.data);
  } catch (error) {
    throw mapApiError(error);
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function onNetworkError(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener(NETWORK_ERROR_EVENT, listener);

  return () => {
    window.removeEventListener(NETWORK_ERROR_EVENT, listener);
  };
}

export function onNetworkRecovered(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener(NETWORK_OK_EVENT, listener);

  return () => {
    window.removeEventListener(NETWORK_OK_EVENT, listener);
  };
}

export type BootstrapOnboardingResponse = {
  token: string;
  user: AuthUser;
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};

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
