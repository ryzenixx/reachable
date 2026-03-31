"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { deleteOrganizationSchema, settingsSchema, type SettingsValues } from "@/schemas";
import type { Organization } from "@/types/api";
import { dashboardKeys, publicStatusKey } from "./query-keys";
import { normalizeOptionalText } from "./utils";

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
        hcaptcha_sitekey: values.hcaptcha_sitekey ?? "",
        hcaptcha_secret: values.hcaptcha_secret ?? "",
      };

      const payload = settingsSchema.parse(normalizedValues);

      const smtpPassword =
        typeof payload.smtp_password === "string" && payload.smtp_password.trim().length > 0
          ? payload.smtp_password.trim()
          : undefined;

      const hcaptchaSecret =
        typeof payload.hcaptcha_secret === "string" && payload.hcaptcha_secret.trim().length > 0
          ? payload.hcaptcha_secret.trim()
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
        hcaptcha_sitekey: normalizeOptionalText(payload.hcaptcha_sitekey),
        hcaptcha_secret: hcaptchaSecret,
      });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Organization>(dashboardKeys.settings, updated);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.settings });
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      await queryClient.invalidateQueries({ queryKey: publicStatusKey });
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
