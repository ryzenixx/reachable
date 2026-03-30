"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Line, LineChart, ResponsiveContainer, Tooltip } from "recharts";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { ZodError } from "zod";
import { EmptyState } from "@/components/app/empty-state";
import { PageMeta } from "@/components/app/page-meta";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { useDashboardShell } from "@/components/dashboard/shell-context";
import { MonitorTypeBadge } from "@/components/status/monitor-type-badge";
import { StatusBadge } from "@/components/status/status-badge";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useCreateMonitor,
  useDeleteMonitor,
  useMonitors,
  useServices,
  useUpdateMonitor,
} from "@/hooks/use-dashboard";
import { formatRelativePrecise } from "@/lib/dates";
import { toastApiError } from "@/lib/errors";
import { monitorSchema, type MonitorValues } from "@/schemas";
import type { Monitor, Service } from "@/types/api";

function monitorStatusToServiceStatus(monitor: Monitor): Service["status"] {
  if (!monitor.latest_check) {
    return "maintenance";
  }

  if (monitor.latest_check.status === "up") {
    return "operational";
  }

  if (monitor.latest_check.status === "degraded") {
    return "degraded";
  }

  return "major_outage";
}

function defaultValues(serviceId?: string): MonitorValues {
  return {
    service_id: serviceId ?? "",
    type: "http",
    url: "",
    method: "GET",
    interval_seconds: 60,
    timeout_ms: 5000,
    expected_status_code: 200,
    is_active: true,
  };
}

function Sparkline({ monitor }: { monitor: Monitor }): React.JSX.Element {
  const data = [...monitor.checks]
    .slice(0, 24)
    .reverse()
    .map((check) => ({
      response_time_ms: check.response_time_ms,
      checked_at: check.checked_at,
    }));

  if (data.length === 0) {
    return <span className="text-xs text-muted-foreground">No data</span>;
  }

  return (
    <div className="h-8 w-28">
      <ResponsiveContainer>
        <LineChart data={data}>
          <Tooltip
            allowEscapeViewBox={{ x: true, y: true }}
            content={({ active, payload }) => {
              const item = payload?.[0]?.payload;

              if (!active || !item) {
                return null;
              }

              const checkedAt = new Date(item.checked_at);
              const hasValidDate = !Number.isNaN(checkedAt.getTime());
              const responseMs =
                typeof item.response_time_ms === "number" && Number.isFinite(item.response_time_ms)
                  ? `${item.response_time_ms}ms`
                  : "N/A";

              return (
                <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-sm">
                  <p className="font-medium">{responseMs}</p>
                  <p className="text-muted-foreground">
                    {hasValidDate ? format(checkedAt, "dd MMM yyyy, HH:mm:ss") : "Check time unavailable"}
                  </p>
                </div>
              );
            }}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid oklch(92% 0.006 286)",
              fontSize: 11,
            }}
            cursor={false}
            offset={18}
            wrapperStyle={{
              pointerEvents: "none",
              transform: "translateY(-22px)",
              zIndex: 40,
            }}
          />
          <Line dataKey="response_time_ms" dot={false} stroke="currentColor" strokeWidth={1.5} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function MonitorsPage(): React.JSX.Element {
  const { openMobileSidebar } = useDashboardShell();

  const servicesQuery = useServices();
  const monitorsQuery = useMonitors();

  const createMonitorMutation = useCreateMonitor();
  const updateMonitorMutation = useUpdateMonitor();
  const deleteMonitorMutation = useDeleteMonitor();

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingMonitor, setEditingMonitor] = useState<Monitor | null>(null);

  const form = useForm({
    resolver: zodResolver(monitorSchema),
    defaultValues: defaultValues(),
  });
  const monitorType = useWatch({
    control: form.control,
    name: "type",
  });

  const monitorsByService = useMemo(() => {
    const map = new Map<string, Monitor[]>();

    for (const monitor of monitorsQuery.data ?? []) {
      const list = map.get(monitor.service_id) ?? [];
      list.push(monitor);
      map.set(monitor.service_id, list);
    }

    return map;
  }, [monitorsQuery.data]);

  const services = servicesQuery.data ?? [];

  const sections = services
    .map((service) => ({
      service,
      monitors: monitorsByService.get(service.id) ?? [],
    }))
    .filter((entry) => entry.monitors.length > 0);

  function openCreateSheet(serviceId?: string): void {
    setEditingMonitor(null);
    form.reset(defaultValues(serviceId));
    setIsSheetOpen(true);
  }

  function openEditSheet(monitor: Monitor): void {
    setEditingMonitor(monitor);
    form.reset({
      service_id: monitor.service_id,
      type: monitor.type,
      url: monitor.url,
      method: monitor.method ?? "GET",
      interval_seconds: monitor.interval_seconds,
      timeout_ms: monitor.timeout_ms,
      expected_status_code: monitor.expected_status_code,
      is_active: monitor.is_active,
    });
    setIsSheetOpen(true);
  }

  async function submit(values: MonitorValues): Promise<void> {
    try {
      if (editingMonitor) {
        await updateMonitorMutation.mutateAsync({
          monitorId: editingMonitor.id,
          values,
        });
        toast.success("Monitor updated.");
      } else {
        await createMonitorMutation.mutateAsync(values);
        toast.success("Monitor created.");
      }

      setIsSheetOpen(false);
      setEditingMonitor(null);
      form.reset(defaultValues());
    } catch (error) {
      if (error instanceof ZodError) {
        toast.error("Invalid monitor payload. Please check all fields.");
        return;
      }

      toastApiError(error, editingMonitor ? "Unable to update monitor." : "Unable to create monitor.");
    }
  }

  async function deleteMonitor(monitor: Monitor): Promise<void> {
    try {
      await deleteMonitorMutation.mutateAsync(monitor.id);
      toast.success("Monitor deleted.");
    } catch (error) {
      toastApiError(error, "Unable to delete monitor.");
    }
  }

  return (
    <div>
      <PageMeta
        description="Configure HTTP, TCP, and ping monitors with response-time trends and latest check outcomes."
        title="Monitors | Reachable"
      />
      <DashboardPageHeader
        action={
          <Button onClick={() => openCreateSheet()}>
            <Plus className="size-4" />
            Add monitor
          </Button>
        }
        description="Configure HTTP/TCP/Ping checks and review live response trends."
        onOpenMobileSidebar={openMobileSidebar}
        title="Monitors"
      />

      {monitorsQuery.isPending || servicesQuery.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : sections.length === 0 ? (
        <EmptyState
          actionLabel="Add your first monitor"
          description="Attach monitors to services to track uptime and response time automatically."
          icon={Plus}
          onAction={() => openCreateSheet()}
          title="No monitors yet"
        />
      ) : (
        <div className="space-y-6">
          {sections.map(({ service, monitors }) => (
            <div key={service.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold">{service.name}</h2>
                </div>
                <Button onClick={() => openCreateSheet(service.id)} size="sm" variant="outline">
                  <Plus className="size-4" />
                  Add monitor
                </Button>
              </div>

              <Table className="table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[34%] min-w-[220px]">Target</TableHead>
                    <TableHead className="w-[110px]">Type</TableHead>
                    <TableHead className="w-[90px]">Interval</TableHead>
                    <TableHead className="w-[140px]">Last status</TableHead>
                    <TableHead className="w-[110px]">Response</TableHead>
                    <TableHead className="w-[150px]">Last checked</TableHead>
                    <TableHead className="w-[140px]">Sparkline</TableHead>
                    <TableHead className="w-[150px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monitors.map((monitor) => (
                    <TableRow key={monitor.id}>
                      <TableCell className="max-w-0">
                        <p className="truncate text-sm font-medium">{monitor.url}</p>
                      </TableCell>
                      <TableCell className="w-[110px]">
                        <MonitorTypeBadge type={monitor.type} />
                      </TableCell>
                      <TableCell className="w-[90px] text-sm text-muted-foreground">{monitor.interval_seconds}s</TableCell>
                      <TableCell className="w-[140px]">
                        <StatusBadge status={monitorStatusToServiceStatus(monitor)} />
                      </TableCell>
                      <TableCell className="w-[110px] text-sm text-muted-foreground">
                        {monitor.latest_check ? `${monitor.latest_check.response_time_ms}ms` : "-"}
                      </TableCell>
                      <TableCell className="w-[150px] text-sm text-muted-foreground">
                        {monitor.latest_check ? formatRelativePrecise(monitor.latest_check.checked_at) : "Never"}
                      </TableCell>
                      <TableCell className="w-[140px]">
                        <Sparkline monitor={monitor} />
                      </TableCell>
                      <TableCell className="w-[150px]">
                        <div className="flex items-center justify-end gap-2">
                          <Button onClick={() => openEditSheet(monitor)} size="sm" variant="ghost">
                            <Pencil className="size-4" />
                            Edit
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost">
                                <Trash2 className="size-4" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete monitor</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This permanently removes monitor checks and alert history for {monitor.url}.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancelButton>Cancel</AlertDialogCancelButton>
                                <AlertDialogActionButton
                                  onClick={async () => {
                                    await deleteMonitor(monitor);
                                  }}
                                >
                                  Delete monitor
                                </AlertDialogActionButton>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
      )}

      <Sheet onOpenChange={setIsSheetOpen} open={isSheetOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>{editingMonitor ? "Edit monitor" : "Add monitor"}</SheetTitle>
            <SheetDescription>
              Configure check interval, timeout, and expected status to drive incident automation.
            </SheetDescription>
          </SheetHeader>

          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
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
                <Button disabled={createMonitorMutation.isPending || updateMonitorMutation.isPending} type="submit">
                  {editingMonitor ? "Save changes" : "Create monitor"}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
