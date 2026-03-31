import type {
  AuthUser,
  CreateApiTokenResponse,
  Incident,
  IncidentUpdate,
  Maintenance,
  Monitor,
  Organization,
  Service,
} from "@/types/api";

export type LoginPayload = {
  email: string;
  password: string;
  device_name?: string;
};

export type OnboardingPayload = {
  organization_name: string;
  owner_name: string;
  owner_email: string;
  owner_password: string;
  device_name?: string;
};

export type CreateServicePayload = {
  name: string;
  description?: string | null;
  status: Service["status"];
  order?: number;
  is_public?: boolean;
};

export type UpdateServicePayload = Partial<CreateServicePayload>;

export type ReorderServicesPayload = {
  services: Array<{
    id: string;
    order: number;
  }>;
};

export type CreateMonitorPayload = {
  service_id: string;
  type: Monitor["type"];
  url: string;
  method: Monitor["method"];
  interval_seconds: number;
  timeout_ms: number;
  expected_status_code: number;
  is_active: boolean;
  verify_ssl: boolean;
};

export type UpdateMonitorPayload = Partial<CreateMonitorPayload>;

export type CreateIncidentPayload = {
  title: string;
  status: Incident["status"];
  impact: Incident["impact"];
  message?: string;
  service_ids: string[];
};

export type UpdateIncidentPayload = {
  status?: Incident["status"];
  impact?: Incident["impact"];
  resolved_at?: string | null;
};

export type CreateIncidentUpdatePayload = {
  status: IncidentUpdate["status"];
  message: string;
};

export type CreateMaintenancePayload = {
  title: string;
  description: string;
  scheduled_at: string;
  ended_at?: string | null;
  status: Maintenance["status"];
};

export type UpdateMaintenancePayload = Partial<CreateMaintenancePayload>;

export type UpdateOrganizationPayload = {
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

export type CreateApiTokenPayload = {
  name: string;
};

export type DeleteOrganizationPayload = {
  confirmation_name: string;
};

export type BootstrapOnboardingResponse = {
  token: string;
  user: AuthUser;
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};

export type CreateApiTokenResult = CreateApiTokenResponse;
export type UpdateOrganizationResult = Organization;
