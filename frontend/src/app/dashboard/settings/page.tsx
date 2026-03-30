"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Copy, RefreshCw, Trash2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { PageMeta } from "@/components/app/page-meta";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { useDashboardShell } from "@/components/dashboard/shell-context";
import {
  AlertDialog,
  AlertDialogActionButton,
  AlertDialogCancelButton,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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
import { cn } from "@/lib/utils";
import { settingsSchema, type SettingsValues } from "@/schemas";
import type { Organization } from "@/types/api";

function maskToken(token: string): string {
  if (token.length <= 8) {
    return "••••••••";
  }

  return `${token.slice(0, 4)}••••••••${token.slice(-4)}`;
}

function toSmtpStatusValue(value: unknown): "enabled" | "disabled" {
  if (value === "enabled" || value === true || value === 1 || value === "1") {
    return "enabled";
  }

  return "disabled";
}

type SettingsTab = "general" | "smtp" | "api" | "danger";

function parseSettingsTab(candidate: string | undefined): SettingsTab {
  if (candidate === "general" || candidate === "smtp" || candidate === "api" || candidate === "danger") {
    return candidate;
  }

  return "general";
}

function settingsTabPath(tab: SettingsTab): string {
  return tab === "general" ? "/dashboard/settings" : `/dashboard/settings/${tab}`;
}

function normalizeSettingsFormValues(values: Partial<SettingsValues>, organization: Organization | undefined): SettingsValues {
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
  };
}

export default function SettingsPage(): React.JSX.Element {
  const { openMobileSidebar } = useDashboardShell();
  const params = useParams<{ tab?: string }>();

  const settingsQuery = useOrganizationSettings();
  const tokensQuery = useApiTokens();

  const createApiTokenMutation = useCreateApiToken();
  const deleteApiTokenMutation = useDeleteApiToken();

  const [latestPlainToken, setLatestPlainToken] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const organization = settingsQuery.data;

  const updateSettingsMutation = useUpdateOrganizationSettings(organization?.id ?? "");
  const deleteOrganizationMutation = useDeleteOrganization(organization?.id ?? "");

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
    defaultValues: {
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
    },
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

  async function saveGeneral(values: SettingsValues): Promise<void> {
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
      await saveGeneral(values);
    },
    (errors) => {
      const firstError = Object.values(errors)[0];
      const message = firstError?.message;
      toast.error(typeof message === "string" && message.length > 0 ? message : "Please review the form fields.");
    },
  );

  async function regenerateToken(): Promise<void> {
    try {
      const created = await createApiTokenMutation.mutateAsync({
        name: "api-key",
      });

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
      await deleteOrganizationMutation.mutateAsync({
        confirmation_name: deleteConfirmation,
      });
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

  const settingsTabs: Array<{ key: SettingsTab; label: string }> = [
    { key: "general", label: "General" },
    { key: "smtp", label: "SMTP" },
    { key: "api", label: "API" },
    { key: "danger", label: "Danger zone" },
  ];

  function switchTab(tab: SettingsTab): void {
    if (tab === activeTab) {
      return;
    }

    setActiveTab(tab);

    if (typeof window !== "undefined") {
      window.history.pushState({ tab }, "", settingsTabPath(tab));
    }
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

      <div className="flex items-center pb-2">
        <div className="inline-flex rounded-lg border bg-card p-1 shadow-sm">
          {settingsTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                activeTab === tab.key
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
              onClick={() => switchTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

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
                  <>
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="logo_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Logo URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://cdn.example.com/logo.png" {...field} value={field.value ?? ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="banner_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status page banner URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://cdn.example.com/status-banner.png" {...field} value={field.value ?? ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="custom_domain"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Public URL for email links</FormLabel>
                          <FormControl>
                            <Input placeholder="https://status.example.com" {...field} value={field.value ?? ""} />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            Used for confirmation and unsubscribe links in emails. You can enter a full URL or just a domain.
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                ) : (
                  <>
                    <FormField
                      control={form.control}
                      name="smtp_enabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-col items-start gap-2">
                          <FormLabel className="block">SMTP status</FormLabel>
                          <FormControl>
                            <div className="inline-flex w-fit rounded-md border bg-background p-1">
                              <button
                                className={cn(
                                  "rounded-sm px-3 py-1.5 text-xs font-medium transition-colors",
                                  toSmtpStatusValue(field.value) === "enabled"
                                    ? "bg-green-500/15 text-green-700 dark:text-green-300"
                                    : "text-muted-foreground hover:text-foreground",
                                )}
                                onClick={() => field.onChange("enabled")}
                                type="button"
                              >
                                Enabled
                              </button>
                              <button
                                className={cn(
                                  "rounded-sm px-3 py-1.5 text-xs font-medium transition-colors",
                                  toSmtpStatusValue(field.value) === "disabled"
                                    ? "bg-red-500/15 text-red-700 dark:text-red-300"
                                    : "text-muted-foreground hover:text-foreground",
                                )}
                                onClick={() => field.onChange("disabled")}
                                type="button"
                              >
                                Disabled
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="smtp_host"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SMTP host</FormLabel>
                          <FormControl>
                            <Input
                              className={smtpDisabledVisualClass}
                              placeholder="smtp.example.com"
                              {...field}
                              disabled={smtpFieldDisabled}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="smtp_port"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SMTP port</FormLabel>
                          <FormControl>
                            <Input
                              className={smtpDisabledVisualClass}
                              disabled={smtpFieldDisabled}
                              min={1}
                              max={65535}
                              onChange={(event) => {
                                const value = event.target.value.trim();
                                field.onChange(value === "" ? null : Number.parseInt(value, 10));
                              }}
                              placeholder="587"
                              type="number"
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="smtp_encryption"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Encryption</FormLabel>
                          <FormControl>
                            <Select
                              disabled={smtpFieldDisabled}
                              onValueChange={(value: "none" | "tls" | "ssl") => field.onChange(value)}
                              value={field.value ?? "tls"}
                            >
                              <SelectTrigger
                                className={cn(
                                  smtpDisabledVisualClass,
                                  smtpFieldDisabled && "disabled:opacity-100 data-[disabled]:opacity-100",
                                )}
                              >
                                <SelectValue placeholder="Select encryption" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="tls">TLS (STARTTLS)</SelectItem>
                                <SelectItem value="ssl">SSL (SMTPS)</SelectItem>
                                <SelectItem value="none">None</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="smtp_username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SMTP username</FormLabel>
                            <FormControl>
                              <Input
                                autoComplete="off"
                                className={smtpDisabledVisualClass}
                                disabled={smtpFieldDisabled}
                                placeholder="user@example.com"
                                {...field}
                                value={field.value ?? ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="smtp_password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SMTP password</FormLabel>
                            <FormControl>
                              <Input
                                autoComplete="new-password"
                                className={smtpDisabledVisualClass}
                                disabled={smtpFieldDisabled}
                                placeholder={organization.smtp_password_set ? "•••••••• (unchanged if blank)" : "Enter SMTP password"}
                                type="password"
                                {...field}
                                value={field.value ?? ""}
                              />
                            </FormControl>
                            {organization.smtp_password_set ? (
                              <p className="text-xs text-muted-foreground">Saved password detected. Leave blank to keep it unchanged.</p>
                            ) : null}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="smtp_from_address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>From email</FormLabel>
                            <FormControl>
                              <Input
                                className={smtpDisabledVisualClass}
                                disabled={smtpFieldDisabled}
                                placeholder="status@example.com"
                                type="email"
                                {...field}
                                value={field.value ?? ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="smtp_from_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>From name</FormLabel>
                            <FormControl>
                              <Input
                                className={smtpDisabledVisualClass}
                                disabled={smtpFieldDisabled}
                                placeholder="Reachable"
                                {...field}
                                value={field.value ?? ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base">API</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Current API key</p>
              <p className="mt-1 font-mono text-sm">
                {latestPlainToken
                  ? maskToken(latestPlainToken)
                  : latestTokenSummary
                    ? `${latestTokenSummary.name} (hidden)`
                    : "No API key yet"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={copyToken} size="sm" variant="outline">
                <Copy className="size-4" />
                Copy
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <RefreshCw className="size-4" />
                    Regenerate
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Regenerate API key</AlertDialogTitle>
                    <AlertDialogDescription>
                      A new API key will be created and previous `api-key` tokens will be revoked.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancelButton>Cancel</AlertDialogCancelButton>
                    <AlertDialogActionButton onClick={() => void regenerateToken()}>
                      Regenerate
                    </AlertDialogActionButton>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "danger" ? (
        <Card className="border-red-500/30">
          <CardHeader>
            <CardTitle className="text-base text-red-700 dark:text-red-300">Danger zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300">
              <AlertTriangle className="mt-0.5 size-4" />
              <p>Deleting the organization is irreversible and will remove services, monitors, incidents, and subscribers.</p>
            </div>

            <Input
              placeholder={`Type \"${organization.name}\" to confirm`}
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
            />

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  className="w-full"
                  disabled={deleteConfirmation !== organization.name || deleteOrganizationMutation.isPending}
                  variant="destructive"
                >
                  <Trash2 className="size-4" />
                  Delete organization
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete organization</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action is permanent. Type confirmation is valid, do you want to continue?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancelButton>Cancel</AlertDialogCancelButton>
                  <AlertDialogActionButton onClick={() => void deleteOrganization()}>
                    Delete permanently
                  </AlertDialogActionButton>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
