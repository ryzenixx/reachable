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
  );
}
