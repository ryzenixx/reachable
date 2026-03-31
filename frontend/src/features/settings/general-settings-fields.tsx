"use client";

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { SettingsValues } from "@/schemas";
import type { UseFormReturn } from "react-hook-form";

type GeneralSettingsFieldsProps = {
  form: UseFormReturn<SettingsValues>;
};

export function GeneralSettingsFields({ form }: GeneralSettingsFieldsProps): React.JSX.Element {
  return (
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
            <FormLabel>Domain</FormLabel>
            <FormControl>
              <Input placeholder="status.example.com" {...field} value={field.value ?? ""} />
            </FormControl>
            <p className="text-xs text-neutral-400">Used in email links. Important: set your public domain.</p>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="pt-4 border-t border-neutral-100">
        <p className="text-sm font-medium text-neutral-900 mb-3">hCaptcha</p>
        <p className="text-xs text-neutral-400 mb-4">Protect the subscribe form from bots. Leave empty to disable.</p>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="hcaptcha_sitekey"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Site key</FormLabel>
                <FormControl>
                  <Input placeholder="10000000-ffff-ffff-ffff-000000000001" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hcaptcha_secret"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Secret key</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter hCaptcha secret key"
                    type="password"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <p className="text-xs text-neutral-400">Leave blank to keep the existing secret.</p>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </>
  );
}
