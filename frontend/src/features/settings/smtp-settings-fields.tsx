"use client";

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { SettingsValues } from "@/schemas";
import type { Organization } from "@/types/api";
import type { UseFormReturn } from "react-hook-form";
import { toSmtpStatusValue } from "./utils";

type SmtpSettingsFieldsProps = {
  form: UseFormReturn<SettingsValues>;
  organization: Organization;
  smtpDisabledVisualClass: string;
  smtpFieldDisabled: boolean;
};

export function SmtpSettingsFields({
  form,
  organization,
  smtpDisabledVisualClass,
  smtpFieldDisabled,
}: SmtpSettingsFieldsProps): React.JSX.Element {
  return (
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
                max={65535}
                min={1}
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
  );
}
