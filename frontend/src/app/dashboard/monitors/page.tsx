"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { ZodError } from "zod";
import { EmptyState } from "@/components/app/empty-state";
import { PageMeta } from "@/components/app/page-meta";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { useDashboardShell } from "@/components/dashboard/shell-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MonitorFormSheet } from "@/features/monitors/monitor-form-sheet";
import { MonitorSectionsTable } from "@/features/monitors/monitor-sections-table";
import {
  useCreateMonitor,
  useDeleteMonitor,
  useMonitors,
  useServices,
  useUpdateMonitor,
} from "@/hooks/use-dashboard";
import { toastApiError } from "@/lib/errors";
import { monitorSchema, type MonitorValues } from "@/schemas";
import type { Monitor } from "@/types/api";

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
          <Button onClick={() => openCreateSheet()} size="sm">
            <Plus className="size-3.5" />
            Add monitor
          </Button>
        }
        description="Configure checks and review response trends."
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
        <MonitorSectionsTable
          onCreateMonitor={openCreateSheet}
          onDeleteMonitor={deleteMonitor}
          onEditMonitor={openEditSheet}
          sections={sections}
        />
      )}

      <MonitorFormSheet
        editingMonitor={editingMonitor}
        form={form}
        isOpen={isSheetOpen}
        isSubmitting={createMonitorMutation.isPending || updateMonitorMutation.isPending}
        monitorType={monitorType}
        onOpenChange={setIsSheetOpen}
        onSubmit={submit}
        services={services}
      />
    </div>
  );
}
