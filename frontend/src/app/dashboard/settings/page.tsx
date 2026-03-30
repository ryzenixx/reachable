"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { PageMeta } from "@/components/app/page-meta";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { useDashboardShell } from "@/components/dashboard/shell-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiSettingsPanel } from "@/features/settings/api-settings-panel";
import { DangerZonePanel } from "@/features/settings/danger-zone-panel";
import { GeneralSettingsFields } from "@/features/settings/general-settings-fields";
import { SettingsTabs } from "@/features/settings/settings-tabs";
import { SmtpSettingsFields } from "@/features/settings/smtp-settings-fields";
import type { SettingsTab } from "@/features/settings/types";
import {
  normalizeSettingsFormValues,
  parseSettingsTab,
  settingsTabPath,
  settingsTabs,
  toSmtpStatusValue,
} from "@/features/settings/utils";
import {
  useApiTokens,
  useCreateApiToken,
  useDeleteApiToken,
  useDeleteOrganization,
  useOrganizationSettings,
  useUpdateOrganizationSettings,
} from "@/hooks/use-dashboard";
import { clearAuthToken } from "@/lib/auth";
import { toastApiError } from "@/lib/errors";
import { settingsSchema, type SettingsValues } from "@/schemas";

const SETTINGS_DEFAULT_VALUES: SettingsValues = {
  name: "",
  logo_url: "",
  banner_url: "",
  custom_domain: "",
  smtp_enabled: "disabled",
  smtp_host: "",
  smtp_port: 587,
  smtp_username: "",
  smtp_password: "",
  smtp_encryption: "tls",
  smtp_from_address: "",
  smtp_from_name: "",
};

export default function SettingsPage(): React.JSX.Element {
  const { openMobileSidebar } = useDashboardShell();
  const params = useParams<{ tab?: string }>();

  const settingsQuery = useOrganizationSettings();
  const tokensQuery = useApiTokens();
  const organization = settingsQuery.data;

  const createApiTokenMutation = useCreateApiToken();
  const deleteApiTokenMutation = useDeleteApiToken();
  const updateSettingsMutation = useUpdateOrganizationSettings(organization?.id ?? "");
  const deleteOrganizationMutation = useDeleteOrganization(organization?.id ?? "");

  const [latestPlainToken, setLatestPlainToken] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const settingsResolver = useMemo<Resolver<SettingsValues>>(() => {
    const baseResolver = zodResolver(settingsSchema);

    return async (rawValues, context, options) => {
      const normalizedValues = normalizeSettingsFormValues(rawValues, organization);
      return baseResolver(normalizedValues, context, options);
    };
  }, [organization]);

  const form = useForm<SettingsValues>({
    resolver: settingsResolver,
    shouldUnregister: false,
    defaultValues: SETTINGS_DEFAULT_VALUES,
  });

  const smtpStatus = useWatch({
    control: form.control,
    name: "smtp_enabled",
  });
  const smtpEnabled = toSmtpStatusValue(smtpStatus) === "enabled";
  const smtpFieldDisabled = !smtpEnabled || updateSettingsMutation.isPending;
  const smtpDisabledVisualClass = smtpFieldDisabled ? "bg-muted/50 text-muted-foreground cursor-not-allowed" : "";

  const routeTab = useMemo<SettingsTab>(() => {
    return parseSettingsTab(params?.tab);
  }, [params?.tab]);
  const [activeTab, setActiveTab] = useState<SettingsTab>(routeTab);

  useEffect(() => {
    setActiveTab(routeTab);
  }, [routeTab]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handlePopState = () => {
      const match = window.location.pathname.match(/^\/dashboard\/settings(?:\/([^/]+))?\/?$/);
      const candidate = match?.[1];
      setActiveTab(parseSettingsTab(candidate));
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    if (!organization) {
      return;
    }

    const currentSmtpStatus = form.getValues("smtp_enabled");

    form.reset({
      name: organization.name,
      logo_url: organization.logo_url,
      banner_url: organization.banner_url,
      custom_domain: organization.custom_domain ?? "",
      smtp_enabled:
        organization.smtp_enabled === undefined
          ? toSmtpStatusValue(currentSmtpStatus)
          : toSmtpStatusValue(organization.smtp_enabled),
      smtp_host: organization.smtp_host ?? "",
      smtp_port: organization.smtp_port ?? 587,
      smtp_username: organization.smtp_username ?? "",
      smtp_password: "",
      smtp_encryption: organization.smtp_encryption ?? "tls",
      smtp_from_address: organization.smtp_from_address ?? "",
      smtp_from_name: organization.smtp_from_name ?? organization.name,
    });
  }, [form, organization]);

  const latestTokenSummary = useMemo(() => {
    const tokens = tokensQuery.data ?? [];
    return tokens[0] ?? null;
  }, [tokensQuery.data]);

  function switchTab(tab: SettingsTab): void {
    if (tab === activeTab) {
      return;
    }

    setActiveTab(tab);

    if (typeof window !== "undefined") {
      window.history.pushState({ tab }, "", settingsTabPath(tab));
    }
  }

  async function saveSettings(values: SettingsValues): Promise<void> {
    if (!organization) {
      return;
    }

    const payload: SettingsValues = {
      ...values,
      name: values.name.trim().length > 0 ? values.name : organization.name,
      smtp_enabled: toSmtpStatusValue(values.smtp_enabled),
    };

    try {
      await updateSettingsMutation.mutateAsync(payload);
      form.setValue("smtp_enabled", toSmtpStatusValue(payload.smtp_enabled), { shouldDirty: false });
      toast.success("Organization settings updated.");
    } catch (error) {
      toastApiError(error, "Unable to update settings.");
    }
  }

  const submitSettings = form.handleSubmit(
    async (values) => {
      await saveSettings(values);
    },
    (errors) => {
      const firstError = Object.values(errors)[0];
      const message = firstError?.message;
      toast.error(typeof message === "string" && message.length > 0 ? message : "Please review the form fields.");
    },
  );

  async function regenerateToken(): Promise<void> {
    try {
      const created = await createApiTokenMutation.mutateAsync({ name: "api-key" });
      setLatestPlainToken(created.token);

      const existingApiTokens = (tokensQuery.data ?? []).filter((token) => token.name === "api-key");

      await Promise.all(
        existingApiTokens.map(async (token) => {
          await deleteApiTokenMutation.mutateAsync(token.id);
        }),
      );

      toast.success("API key regenerated.");
    } catch (error) {
      toastApiError(error, "Unable to regenerate API key.");
    }
  }

  async function copyToken(): Promise<void> {
    if (!latestPlainToken) {
      toast.error("Generate a new API key to copy it.");
      return;
    }

    await navigator.clipboard.writeText(latestPlainToken);
    toast.success("API key copied.");
  }

  async function deleteOrganization(): Promise<void> {
    if (!organization) {
      return;
    }

    if (deleteConfirmation !== organization.name) {
      toast.error("Type the exact organization name to confirm deletion.");
      return;
    }

    try {
      await deleteOrganizationMutation.mutateAsync({ confirmation_name: deleteConfirmation });
      clearAuthToken();
      toast.success("Organization deleted.");
      window.location.href = "/";
    } catch (error) {
      toastApiError(error, "Unable to delete organization.");
    }
  }

  if (settingsQuery.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (!organization) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">Unable to load organization settings.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageMeta
        description="Update organization branding, manage API keys, and perform secure organization-level actions."
        title="Settings | Reachable"
      />
      <DashboardPageHeader
        description="Manage organization profile, API keys, and destructive settings."
        onOpenMobileSidebar={openMobileSidebar}
        title="Settings"
      />

      <SettingsTabs activeTab={activeTab} onChange={switchTab} tabs={settingsTabs} />

      {(activeTab === "general" || activeTab === "smtp") ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{activeTab === "general" ? "General" : "SMTP email delivery"}</CardTitle>
            {activeTab === "smtp" ? (
              <CardDescription>Configure custom SMTP for subscription confirmations and incident notifications.</CardDescription>
            ) : null}
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-4" onSubmit={submitSettings}>
                {activeTab === "general" ? (
                  <GeneralSettingsFields form={form} />
                ) : (
                  <SmtpSettingsFields
                    form={form}
                    organization={organization}
                    smtpDisabledVisualClass={smtpDisabledVisualClass}
                    smtpFieldDisabled={smtpFieldDisabled}
                  />
                )}

                <Button disabled={updateSettingsMutation.isPending} type="submit">
                  Save changes
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "api" ? (
        <ApiSettingsPanel
          latestPlainToken={latestPlainToken}
          latestTokenSummary={latestTokenSummary}
          onCopyToken={copyToken}
          onRegenerateToken={regenerateToken}
        />
      ) : null}

      {activeTab === "danger" ? (
        <DangerZonePanel
          deleteConfirmation={deleteConfirmation}
          isDeleting={deleteOrganizationMutation.isPending}
          onChangeDeleteConfirmation={setDeleteConfirmation}
          onDelete={deleteOrganization}
          organizationName={organization.name}
        />
      ) : null}
    </div>
  );
}
