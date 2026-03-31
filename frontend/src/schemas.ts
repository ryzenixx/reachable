import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  device_name: z.string().min(2).max(255),
});

export const onboardingSchema = z
  .object({
    organization_name: z
      .string()
      .min(2, "Organization name must be at least 2 characters.")
      .max(255, "Organization name is too long."),
    owner_name: z.string().min(2, "Name must be at least 2 characters.").max(255, "Name is too long."),
    owner_email: z.email("Enter a valid email address."),
    owner_password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(255, "Password is too long."),
    confirm_password: z.string().min(1, "Please confirm your password."),
    device_name: z.string().min(2).max(255),
  })
  .refine((value) => value.owner_password === value.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords do not match.",
  });

export const serviceSchema = z.object({
  name: z.string().min(2, "Service name must be at least 2 characters.").max(255),
  description: z.string().max(255, "Description is too long.").optional(),
  status: z.enum(["operational", "degraded", "partial_outage", "major_outage", "maintenance"]),
  order: z.number().int().nonnegative().optional(),
  is_public: z.boolean(),
});

const monitorUrlSchema = z
  .string()
  .min(1, "Target is required.")
  .max(2048, "Target is too long.");

export const monitorSchema = z
  .object({
    service_id: z.uuid("Select a service."),
    type: z.enum(["http", "tcp", "ping"]),
    url: monitorUrlSchema,
    method: z.enum(["GET", "POST", "HEAD"]),
    interval_seconds: z
      .number()
      .int("Interval must be a whole number.")
      .min(15, "Interval must be at least 15 seconds.")
      .max(3600, "Interval must be 3600 seconds or less."),
    timeout_ms: z
      .number()
      .int("Timeout must be a whole number.")
      .min(100, "Timeout must be at least 100ms.")
      .max(60000, "Timeout must be 60000ms or less."),
    expected_status_code: z
      .number()
      .int("Expected status code must be a whole number.")
      .min(100, "Expected status code must be between 100 and 599.")
      .max(599, "Expected status code must be between 100 and 599."),
    is_active: z.boolean(),
    verify_ssl: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.type === "http") {
      const isValidHttp = /^https?:\/\//.test(value.url);
      if (!isValidHttp) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["url"],
          message: "HTTP monitors must start with http:// or https://.",
        });
      }
    }

    if (value.type !== "http") {
      const isHostLike = /^[a-zA-Z0-9.-]+(?::\d+)?$/.test(value.url.replace(/^tcp:\/\//, ""));
      if (!isHostLike) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["url"],
          message: "Use a hostname or host:port for TCP/Ping monitors.",
        });
      }
    }
  });

export const incidentSchema = z.object({
  title: z.string().min(4, "Title must be at least 4 characters.").max(255),
  status: z.enum(["investigating", "identified", "monitoring", "resolved"]),
  impact: z.enum(["none", "minor", "major", "critical"]),
  message: z.string().max(4000, "Initial update is too long.").optional(),
  service_ids: z.array(z.uuid()),
});

export const incidentUpdateSchema = z.object({
  status: z.enum(["investigating", "identified", "monitoring", "resolved"]),
  message: z.string().min(8, "Update must be at least 8 characters.").max(8000),
});

export const maintenanceSchema = z.object({
  title: z.string().min(4, "Title must be at least 4 characters.").max(255),
  description: z.string().min(8, "Description must be at least 8 characters."),
  scheduled_at: z.string().min(1, "Scheduled date is required."),
  ended_at: z.string().nullable().optional(),
  status: z.enum(["scheduled", "in_progress", "completed"]),
});

export const subscriberSchema = z.object({
  email: z.email("Enter a valid email address."),
});

export const settingsSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters.").max(255),
  logo_url: z.string().url("Enter a valid URL.").nullable().optional().or(z.literal("")),
  banner_url: z.string().url("Enter a valid URL.").nullable().optional().or(z.literal("")),
  custom_domain: z.string().max(255).nullable().optional().or(z.literal("")),
  smtp_enabled: z.enum(["enabled", "disabled"]),
  smtp_host: z.string().max(255).nullable().optional().or(z.literal("")),
  smtp_port: z.number().int("SMTP port must be a whole number.").min(1).max(65535).nullable(),
  smtp_username: z.string().max(255).nullable().optional().or(z.literal("")),
  smtp_password: z.string().max(255).nullable().optional().or(z.literal("")),
  smtp_encryption: z.enum(["none", "tls", "ssl"]).nullable().optional(),
  smtp_from_address: z.string().email("Enter a valid sender email.").max(255).nullable().optional().or(z.literal("")),
  smtp_from_name: z.string().max(255).nullable().optional().or(z.literal("")),
  hcaptcha_sitekey: z.string().max(255).nullable().optional().or(z.literal("")),
  hcaptcha_secret: z.string().max(255).nullable().optional().or(z.literal("")),
}).superRefine((value, ctx) => {
  if (value.smtp_enabled !== "enabled") {
    return;
  }

  const host = typeof value.smtp_host === "string" ? value.smtp_host.trim() : "";
  if (host.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["smtp_host"],
      message: "SMTP host is required when SMTP is enabled.",
    });
  }

  const fromAddress = typeof value.smtp_from_address === "string" ? value.smtp_from_address.trim() : "";
  if (fromAddress.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["smtp_from_address"],
      message: "Sender email is required when SMTP is enabled.",
    });
  }

  if (typeof value.smtp_port !== "number" || Number.isNaN(value.smtp_port)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["smtp_port"],
      message: "SMTP port is required when SMTP is enabled.",
    });
  }
});

export const deleteOrganizationSchema = z.object({
  confirmation_name: z.string().min(1, "Organization name confirmation is required."),
});

export const apiTokenSchema = z.object({
  name: z.string().min(2, "Token name must be at least 2 characters.").max(255),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type OnboardingValues = z.infer<typeof onboardingSchema>;
export type ServiceValues = z.infer<typeof serviceSchema>;
export type MonitorValues = z.infer<typeof monitorSchema>;
export type IncidentValues = z.infer<typeof incidentSchema>;
export type IncidentUpdateValues = z.infer<typeof incidentUpdateSchema>;
export type MaintenanceValues = z.infer<typeof maintenanceSchema>;
export type SubscriberValues = z.infer<typeof subscriberSchema>;
export type SettingsValues = z.infer<typeof settingsSchema>;
export type ApiTokenValues = z.infer<typeof apiTokenSchema>;
export type DeleteOrganizationValues = z.infer<typeof deleteOrganizationSchema>;
