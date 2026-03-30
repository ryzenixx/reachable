"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { EmptyState } from "@/components/app/empty-state";
import { PageMeta } from "@/components/app/page-meta";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { useDashboardShell } from "@/components/dashboard/shell-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MAINTENANCE_DEFAULT_VALUES } from "@/features/maintenances/constants";
import { MaintenanceFormSheet } from "@/features/maintenances/maintenance-form-sheet";
import { MaintenancesTable } from "@/features/maintenances/maintenances-table";
import {
  useCompleteMaintenance,
  useCreateMaintenance,
  useDeleteMaintenance,
  useMaintenances,
  useUpdateMaintenance,
} from "@/hooks/use-dashboard";
import { toDateTimeLocalValue } from "@/lib/dates";
import { toastApiError } from "@/lib/errors";
import { maintenanceSchema, type MaintenanceValues } from "@/schemas";
import type { Maintenance } from "@/types/api";

export default function MaintenancesPage(): React.JSX.Element {
  const { openMobileSidebar } = useDashboardShell();

  const maintenancesQuery = useMaintenances();

  const createMaintenanceMutation = useCreateMaintenance();
  const updateMaintenanceMutation = useUpdateMaintenance();
  const completeMaintenanceMutation = useCompleteMaintenance();
  const deleteMaintenanceMutation = useDeleteMaintenance();

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<Maintenance | null>(null);

  const form = useForm<MaintenanceValues>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: MAINTENANCE_DEFAULT_VALUES,
  });

  const maintenances = maintenancesQuery.data ?? [];

  function openCreate(): void {
    setEditingMaintenance(null);
    form.reset(MAINTENANCE_DEFAULT_VALUES);
    setIsSheetOpen(true);
  }

  function openEdit(maintenance: Maintenance): void {
    setEditingMaintenance(maintenance);
    form.reset({
      title: maintenance.title,
      description: maintenance.description,
      scheduled_at: toDateTimeLocalValue(maintenance.scheduled_at),
      ended_at: maintenance.ended_at ? toDateTimeLocalValue(maintenance.ended_at) : null,
      status: maintenance.status,
    });
    setIsSheetOpen(true);
  }

  async function submit(values: MaintenanceValues): Promise<void> {
    try {
      if (editingMaintenance) {
        await updateMaintenanceMutation.mutateAsync({
          maintenanceId: editingMaintenance.id,
          values,
        });
        toast.success("Maintenance updated.");
      } else {
        await createMaintenanceMutation.mutateAsync(values);
        toast.success("Maintenance scheduled.");
      }

      setIsSheetOpen(false);
      setEditingMaintenance(null);
      form.reset(MAINTENANCE_DEFAULT_VALUES);
    } catch (error) {
      toastApiError(error, editingMaintenance ? "Unable to update maintenance." : "Unable to schedule maintenance.");
    }
  }

  async function completeMaintenance(maintenanceId: string): Promise<void> {
    try {
      await completeMaintenanceMutation.mutateAsync(maintenanceId);
      toast.success("Maintenance marked as completed.");
    } catch (error) {
      toastApiError(error, "Unable to complete maintenance.");
    }
  }

  async function deleteMaintenance(maintenanceId: string): Promise<void> {
    try {
      await deleteMaintenanceMutation.mutateAsync(maintenanceId);
      toast.success("Maintenance deleted.");
    } catch (error) {
      toastApiError(error, "Unable to delete maintenance.");
    }
  }

  return (
    <div>
      <PageMeta
        description="Schedule, edit, and complete maintenance windows displayed to subscribers and status page visitors."
        title="Maintenances | Reachable"
      />
      <DashboardPageHeader
        action={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Schedule maintenance
          </Button>
        }
        description="Plan, update, and complete scheduled maintenance windows."
        onOpenMobileSidebar={openMobileSidebar}
        title="Maintenances"
      />

      {maintenancesQuery.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : maintenances.length === 0 ? (
        <EmptyState
          actionLabel="Schedule your first maintenance"
          description="Maintenance windows are displayed publicly and help users plan ahead."
          icon={Plus}
          onAction={openCreate}
          title="No maintenances yet"
        />
      ) : (
        <MaintenancesTable
          maintenances={maintenances}
          onComplete={completeMaintenance}
          onDelete={deleteMaintenance}
          onEdit={openEdit}
        />
      )}

      <MaintenanceFormSheet
        editingMaintenance={editingMaintenance}
        form={form}
        isOpen={isSheetOpen}
        isSubmitting={createMaintenanceMutation.isPending || updateMaintenanceMutation.isPending}
        onOpenChange={(open) => {
          setIsSheetOpen(open);
          if (!open) {
            setEditingMaintenance(null);
            form.reset(MAINTENANCE_DEFAULT_VALUES);
          }
        }}
        onSubmit={submit}
      />
    </div>
  );
}
