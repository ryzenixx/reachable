"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { EmptyState } from "@/components/app/empty-state";
import { PageMeta } from "@/components/app/page-meta";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { useDashboardShell } from "@/components/dashboard/shell-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ServiceFormSheet } from "@/features/services/service-form-sheet";
import { SortableServiceRow } from "@/features/services/sortable-service-row";
import {
  useCreateService,
  useDeleteService,
  useMonitors,
  useReorderServices,
  useServices,
  useUpdateService,
} from "@/hooks/use-dashboard";
import { toastApiError } from "@/lib/errors";
import { serviceSchema, type ServiceValues } from "@/schemas";
import type { Service } from "@/types/api";

function makeDefaultServiceValues(): ServiceValues {
  return {
    name: "",
    description: "",
    status: "operational",
    is_public: true,
  };
}

export default function ServicesPage(): React.JSX.Element {
  const { openMobileSidebar } = useDashboardShell();

  const servicesQuery = useServices();
  const monitorsQuery = useMonitors();

  const createServiceMutation = useCreateService();
  const updateServiceMutation = useUpdateService();
  const deleteServiceMutation = useDeleteService();
  const reorderMutation = useReorderServices();

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const form = useForm<ServiceValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: makeDefaultServiceValues(),
  });

  const sensors = useSensors(useSensor(PointerSensor));

  const orderedServices = useMemo(() => {
    return [...(servicesQuery.data ?? [])].sort((a, b) => a.order - b.order);
  }, [servicesQuery.data]);

  const monitorCountByServiceId = useMemo(() => {
    const map = new Map<string, number>();

    for (const monitor of monitorsQuery.data ?? []) {
      map.set(monitor.service_id, (map.get(monitor.service_id) ?? 0) + 1);
    }

    return map;
  }, [monitorsQuery.data]);

  const hasServices = orderedServices.length > 0;

  async function saveReorder(nextIds: string[]): Promise<void> {
    try {
      await reorderMutation.mutateAsync(nextIds.map((id, index) => ({ id, order: index })));
      toast.success("Service order updated.");
    } catch (error) {
      toastApiError(error, "Unable to update service order.");
    }
  }

  function onDragEnd(event: DragEndEvent): void {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const orderedIds = orderedServices.map((service) => service.id);
    const oldIndex = orderedIds.findIndex((id) => id === active.id);
    const newIndex = orderedIds.findIndex((id) => id === over.id);

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const next = arrayMove(orderedIds, oldIndex, newIndex);
    void saveReorder(next);
  }

  function openCreateSheet(): void {
    setEditingService(null);
    form.reset(makeDefaultServiceValues());
    setIsSheetOpen(true);
  }

  function openEditSheet(service: Service): void {
    setEditingService(service);
    form.reset({
      name: service.name,
      description: service.description ?? "",
      status: service.status,
      is_public: service.is_public,
      order: service.order,
    });
    setIsSheetOpen(true);
  }

  async function submit(values: ServiceValues): Promise<void> {
    try {
      if (editingService) {
        await updateServiceMutation.mutateAsync({
          serviceId: editingService.id,
          values,
        });

        toast.success("Service updated.");
      } else {
        await createServiceMutation.mutateAsync(values);
        toast.success("Service created.");
      }

      setIsSheetOpen(false);
      setEditingService(null);
      form.reset(makeDefaultServiceValues());
    } catch (error) {
      toastApiError(error, editingService ? "Unable to update service." : "Unable to create service.");
    }
  }

  async function deleteService(service: Service): Promise<void> {
    try {
      await deleteServiceMutation.mutateAsync(service.id);
      toast.success("Service deleted.");
    } catch (error) {
      toastApiError(error, "Unable to delete service.");
    }
  }

  return (
    <div>
      <PageMeta
        description="Create, reorder, and manage service statuses shown on your public status page."
        title="Services | Reachable"
      />
      <DashboardPageHeader
        action={
          <Button onClick={openCreateSheet} size="sm">
            <Plus className="size-3.5" />
            Add service
          </Button>
        }
        description="Manage services and display order."
        onOpenMobileSidebar={openMobileSidebar}
        title="Services"
      />

      {servicesQuery.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : hasServices ? (
        <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd} sensors={sensors}>
          <SortableContext items={orderedServices.map((service) => service.id)} strategy={verticalListSortingStrategy}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-9" />
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Monitors</TableHead>
                  <TableHead>Uptime</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderedServices.map((service) => (
                  <SortableServiceRow
                    key={service.id}
                    monitorsCount={monitorCountByServiceId.get(service.id) ?? 0}
                    onDelete={deleteService}
                    onEdit={openEditSheet}
                    service={service}
                  />
                ))}
              </TableBody>
            </Table>
          </SortableContext>
        </DndContext>
      ) : (
        <EmptyState
          actionLabel="Add your first service"
          description="Create a service to start publishing uptime and incidents."
          icon={Plus}
          onAction={openCreateSheet}
          title="No services yet"
        />
      )}

      <ServiceFormSheet
        editingService={editingService}
        form={form}
        isOpen={isSheetOpen}
        isSubmitting={createServiceMutation.isPending || updateServiceMutation.isPending}
        onOpenChange={setIsSheetOpen}
        onSubmit={submit}
      />
    </div>
  );
}
