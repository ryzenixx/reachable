import type { SettingsValues } from "@/schemas";
import type { Organization } from "@/types/api";
import type { SettingsTab, SettingsTabDefinition } from "./types";

export function maskToken(token: string): string {
  if (token.length <= 8) {
    return "••••••••";
  }

  return `${token.slice(0, 4)}••••••••${token.slice(-4)}`;
}

export function toSmtpStatusValue(value: unknown): "enabled" | "disabled" {
  if (value === "enabled" || value === true || value === 1 || value === "1") {
    return "enabled";
  }

  return "disabled";
}

export function parseSettingsTab(candidate: string | undefined): SettingsTab {
  if (candidate === "general" || candidate === "smtp" || candidate === "api" || candidate === "danger") {
    return candidate;
  }

  return "general";
}

export function settingsTabPath(tab: SettingsTab): string {
  return tab === "general" ? "/dashboard/settings" : `/dashboard/settings/${tab}`;
}

export function normalizeSettingsFormValues(values: Partial<SettingsValues>, organization: Organization | undefined): SettingsValues {
  return {
    name: typeof values.name === "string" ? values.name : organization?.name ?? "",
    logo_url: values.logo_url ?? organization?.logo_url ?? "",
    banner_url: values.banner_url ?? organization?.banner_url ?? "",
    custom_domain: values.custom_domain ?? organization?.custom_domain ?? "",
    smtp_enabled: toSmtpStatusValue(values.smtp_enabled),
    smtp_host: values.smtp_host ?? organization?.smtp_host ?? "",
    smtp_port:
      typeof values.smtp_port === "number" ? values.smtp_port : organization?.smtp_port ?? 587,
    smtp_username: values.smtp_username ?? organization?.smtp_username ?? "",
    smtp_password: values.smtp_password ?? "",
    smtp_encryption: values.smtp_encryption ?? organization?.smtp_encryption ?? "tls",
    smtp_from_address: values.smtp_from_address ?? organization?.smtp_from_address ?? "",
    smtp_from_name: values.smtp_from_name ?? organization?.smtp_from_name ?? organization?.name ?? "",
    hcaptcha_sitekey: values.hcaptcha_sitekey ?? organization?.hcaptcha_sitekey ?? "",
    hcaptcha_secret: values.hcaptcha_secret ?? "",
  };
}

export const settingsTabs: SettingsTabDefinition[] = [
  { key: "general", label: "General" },
  { key: "smtp", label: "SMTP" },
  { key: "api", label: "API" },
  { key: "danger", label: "Danger zone" },
];
