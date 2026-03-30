"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { EmptyState } from "@/components/app/empty-state";
import { PageMeta } from "@/components/app/page-meta";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { useDashboardShell } from "@/components/dashboard/shell-context";
import { MaintenanceStatusBadge } from "@/components/status/maintenance-status-badge";
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
import { Textarea } from "@/components/ui/textarea";
import {
  useCompleteMaintenance,
  useCreateMaintenance,
  useDeleteMaintenance,
  useMaintenances,
  useUpdateMaintenance,
} from "@/hooks/use-dashboard";
import { formatRelative, toDateTimeLocalValue } from "@/lib/dates";
import { toastApiError } from "@/lib/errors";
import { maintenanceSchema, type MaintenanceValues } from "@/schemas";
import type { Maintenance } from "@/types/api";

function defaultValues(): MaintenanceValues {
  return {
    title: "",
    description: "",
    scheduled_at: "",
    ended_at: null,
    status: "scheduled",
  };
}

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
    defaultValues: defaultValues(),
  });

  const maintenances = maintenancesQuery.data ?? [];

  function openCreate(): void {
    setEditingMaintenance(null);
    form.reset(defaultValues());
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
      form.reset(defaultValues());
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Scheduled at</TableHead>
              <TableHead>Ended at</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {maintenances.map((maintenance) => (
              <TableRow key={maintenance.id}>
                <TableCell>
                  <p className="text-sm font-medium">{maintenance.title}</p>
                  <p className="text-xs text-muted-foreground">{maintenance.description}</p>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatRelative(maintenance.scheduled_at)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {maintenance.ended_at ? formatRelative(maintenance.ended_at) : "-"}
                </TableCell>
                <TableCell>
                  <MaintenanceStatusBadge status={maintenance.status} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    {maintenance.status !== "completed" ? (
                      <Button
                        onClick={() => void completeMaintenance(maintenance.id)}
                        size="sm"
                        variant="outline"
                      >
                        Complete
                      </Button>
                    ) : null}

                    <Button onClick={() => openEdit(maintenance)} size="sm" variant="ghost">
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
                          <AlertDialogTitle>Delete maintenance</AlertDialogTitle>
                          <AlertDialogDescription>
                            This permanently removes {maintenance.title} from your schedule.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancelButton>Cancel</AlertDialogCancelButton>
                          <AlertDialogActionButton onClick={() => void deleteMaintenance(maintenance.id)}>
                            Delete maintenance
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
      )}

      <Sheet
        onOpenChange={(open) => {
          setIsSheetOpen(open);
          if (!open) {
            setEditingMaintenance(null);
            form.reset(defaultValues());
          }
        }}
        open={isSheetOpen}
      >
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>{editingMaintenance ? "Edit maintenance" : "Schedule maintenance"}</SheetTitle>
            <SheetDescription>
              Define your maintenance timeline and public communication details.
            </SheetDescription>
          </SheetHeader>

          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Database failover rehearsal" {...field} />
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
                      <Textarea placeholder="Expected impact and mitigation details..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scheduled_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scheduled at</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ended_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ended at (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        value={field.value ?? ""}
                        onChange={(event) => field.onChange(event.target.value || null)}
                      />
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
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <SheetFooter>
                <Button
                  disabled={createMaintenanceMutation.isPending || updateMaintenanceMutation.isPending}
                  type="submit"
                >
                  {editingMaintenance ? "Save changes" : "Schedule maintenance"}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
