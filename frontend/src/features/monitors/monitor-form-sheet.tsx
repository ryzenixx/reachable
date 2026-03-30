"use client";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { MonitorValues } from "@/schemas";
import type { Monitor, Service } from "@/types/api";
import type { UseFormReturn } from "react-hook-form";

type MonitorFormSheetProps = {
  editingMonitor: Monitor | null;
  form: UseFormReturn<MonitorValues>;
  isOpen: boolean;
  isSubmitting: boolean;
  monitorType: MonitorValues["type"];
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: MonitorValues) => Promise<void>;
  services: Service[];
};

export function MonitorFormSheet({
  editingMonitor,
  form,
  isOpen,
  isSubmitting,
  monitorType,
  onOpenChange,
  onSubmit,
  services,
}: MonitorFormSheetProps): React.JSX.Element {
  return (
    <Sheet onOpenChange={onOpenChange} open={isOpen}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{editingMonitor ? "Edit monitor" : "Add monitor"}</SheetTitle>
          <SheetDescription>
            Configure check interval, timeout, and expected status to drive incident automation.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="service_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a service" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (value !== "http") {
                          form.setValue("method", "GET");
                        }
                      }}
                      value={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a monitor type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="http">HTTP</SelectItem>
                        <SelectItem value="tcp">TCP</SelectItem>
                        <SelectItem value="ping">Ping</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL / Host</FormLabel>
                  <FormControl>
                    <Input placeholder="https://api.example.com/health" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>HTTP Method</FormLabel>
                  <FormControl>
                    <Select disabled={monitorType !== "http"} onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="HEAD">HEAD</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="interval_seconds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interval (s)</FormLabel>
                    <FormControl>
                      <Input
                        min={15}
                        name={field.name}
                        onBlur={field.onBlur}
                        onChange={(event) => field.onChange(Number(event.target.value))}
                        ref={field.ref}
                        step={1}
                        type="number"
                        value={typeof field.value === "number" ? field.value : 0}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="timeout_ms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timeout (ms)</FormLabel>
                    <FormControl>
                      <Input
                        min={100}
                        name={field.name}
                        onBlur={field.onBlur}
                        onChange={(event) => field.onChange(Number(event.target.value))}
                        ref={field.ref}
                        step={100}
                        type="number"
                        value={typeof field.value === "number" ? field.value : 0}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="expected_status_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected status code</FormLabel>
                  <FormControl>
                    <Input
                      max={599}
                      min={100}
                      name={field.name}
                      onBlur={field.onBlur}
                      onChange={(event) => field.onChange(Number(event.target.value))}
                      ref={field.ref}
                      step={1}
                      type="number"
                      value={typeof field.value === "number" ? field.value : 0}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem>
                  <label className="inline-flex items-center gap-2 text-sm font-medium">
                    <input
                      checked={field.value}
                      className="size-4 rounded border"
                      onChange={(event) => field.onChange(event.target.checked)}
                      type="checkbox"
                    />
                    Monitor is active
                  </label>
                  <FormMessage />
                </FormItem>
              )}
            />

            <SheetFooter>
              <Button disabled={isSubmitting} type="submit">
                {editingMonitor ? "Save changes" : "Create monitor"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
