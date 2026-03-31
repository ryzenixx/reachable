export type UserRole = "owner" | "admin" | "member";

export type ServiceStatus =
  | "operational"
  | "degraded"
  | "partial_outage"
  | "major_outage"
  | "maintenance";

export type IncidentStatus = "investigating" | "identified" | "monitoring" | "resolved";
export type IncidentImpact = "none" | "minor" | "major" | "critical";

export type MaintenanceStatus = "scheduled" | "in_progress" | "completed";

export type MonitorType = "http" | "tcp" | "ping";
export type MonitorMethod = "GET" | "POST" | "HEAD";
export type MonitorCheckStatus = "up" | "down" | "degraded";

export type ApiEnvelope<T> = {
  data: T;
};

export type ApiErrorPayload = {
  message?: string;
  errors?: Record<string, string[]>;
};

export type Organization = {
  id: string;
  name: string;
  logo_url: string | null;
  banner_url: string | null;
  custom_domain: string | null;
  smtp_enabled?: boolean;
  smtp_host?: string | null;
  smtp_port?: number | null;
  smtp_username?: string | null;
  smtp_encryption?: "none" | "tls" | "ssl" | null;
  smtp_from_address?: string | null;
  smtp_from_name?: string | null;
  smtp_password_set?: boolean;
  hcaptcha_sitekey?: string | null;
  hcaptcha_secret_set?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type UptimeMetric = {
  id: string;
  service_id: string;
  date: string;
  uptime_percentage: number;
  avg_response_time_ms: number;
};

export type MonitorCheck = {
  id: string;
  monitor_id: string;
  status: MonitorCheckStatus;
  response_time_ms: number;
  status_code: number | null;
  error_message: string | null;
  checked_at: string;
};

export type Monitor = {
  id: string;
  service_id: string;
  type: MonitorType;
  url: string;
  method: MonitorMethod;
  interval_seconds: number;
  timeout_ms: number;
  expected_status_code: number;
  is_active: boolean;
  verify_ssl: boolean;
  latest_check: MonitorCheck | null;
  checks: MonitorCheck[];
  created_at: string;
  updated_at: string;
};

export type Service = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  status: ServiceStatus;
  order: number;
  is_public: boolean;
  uptime_percentage: number | null;
  uptime_metrics: UptimeMetric[];
  monitors: Monitor[];
  created_at: string;
  updated_at: string;
};

export type IncidentUpdate = {
  id: string;
  incident_id: string;
  message: string;
  status: IncidentStatus;
  created_at: string;
};

export type Incident = {
  id: string;
  organization_id: string;
  title: string;
  status: IncidentStatus;
  impact: IncidentImpact;
  resolved_at: string | null;
  services: Service[];
  updates: IncidentUpdate[];
  created_at: string;
  updated_at: string;
};

export type Maintenance = {
  id: string;
  organization_id: string;
  title: string;
  description: string;
  scheduled_at: string;
  ended_at: string | null;
  status: MaintenanceStatus;
  created_at?: string;
  updated_at?: string;
};

export type Subscriber = {
  id: string;
  organization_id: string;
  email: string;
  confirmed_at: string | null;
  created_at: string;
};

export type StatusSummary = {
  organization_id: string;
  global_status: ServiceStatus;
  services_count: number;
  active_incidents_count: number;
  updated_at: string;
};

export type PublicStatusPayload = {
  organization: Organization;
  global_status: ServiceStatus;
  services: Service[];
  active_incidents: Incident[];
  maintenances: Maintenance[];
  incident_history: {
    data: Incident[];
    meta: {
      current_page: number;
      last_page: number;
      total: number;
    };
  };
};

export type PublicIncidentPayload = {
  organization: Organization;
  incident: Incident;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organization: Organization;
};

export type OnboardingState = {
  initialized: boolean;
};

export type ApiTokenSummary = {
  id: number;
  name: string;
  abilities: string[];
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
};

export type CreateApiTokenResponse = {
  token: string;
  name: string;
  expires_at: string | null;
};

export type SystemVersionSummary = {
  current_version: string;
  latest_version: string | null;
  latest_release_url: string | null;
  update_available: boolean;
  update_check_enabled: boolean;
  checked_at: string | null;
};
