"use client";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ServiceValues } from "@/schemas";
import type { Service } from "@/types/api";
import type { UseFormReturn } from "react-hook-form";

type ServiceFormSheetProps = {
  editingService: Service | null;
  form: UseFormReturn<ServiceValues>;
  isOpen: boolean;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ServiceValues) => Promise<void>;
};

export function ServiceFormSheet({
  editingService,
  form,
  isOpen,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: ServiceFormSheetProps): React.JSX.Element {
  return (
    <Sheet onOpenChange={onOpenChange} open={isOpen}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{editingService ? "Edit service" : "Add service"}</SheetTitle>
          <SheetDescription>
            Configure how this service appears on your status page and dashboard.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="API Gateway" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Handles incoming API traffic" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="operational">Operational</SelectItem>
                        <SelectItem value="degraded">Degraded</SelectItem>
                        <SelectItem value="partial_outage">Partial Outage</SelectItem>
                        <SelectItem value="major_outage">Major Outage</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_public"
              render={({ field }) => (
                <FormItem>
                  <label className="inline-flex items-center gap-2 text-sm font-medium">
                    <input
                      checked={field.value}
                      className="size-4 rounded border"
                      onChange={(event) => field.onChange(event.target.checked)}
                      type="checkbox"
                    />
                    Visible on public page
                  </label>
                  <FormMessage />
                </FormItem>
              )}
            />

            <SheetFooter>
              <Button disabled={isSubmitting} type="submit">
                {editingService ? "Save changes" : "Create service"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
