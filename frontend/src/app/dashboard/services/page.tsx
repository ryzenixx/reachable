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
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { EmptyState } from "@/components/app/empty-state";
import { PageMeta } from "@/components/app/page-meta";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { useDashboardShell } from "@/components/dashboard/shell-context";
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

type SortableServiceRowProps = {
  service: Service;
  monitorsCount: number;
  onEdit: (service: Service) => void;
  onDelete: (service: Service) => Promise<void>;
};

function ServiceActions({ service, onEdit, onDelete }: Omit<SortableServiceRowProps, "monitorsCount">): React.JSX.Element {
  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        onClick={() => onEdit(service)}
        size="sm"
        variant="ghost"
      >
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
            <AlertDialogTitle>Delete service</AlertDialogTitle>
            <AlertDialogDescription>
              This action permanently removes {service.name} and all linked monitors.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancelButton>Cancel</AlertDialogCancelButton>
            <AlertDialogActionButton
              onClick={async () => {
                await onDelete(service);
              }}
            >
              Delete service
            </AlertDialogActionButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SortableServiceRow({ service, monitorsCount, onEdit, onDelete }: SortableServiceRowProps): React.JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: service.id,
  });

  return (
    <TableRow
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <TableCell className="w-9">
        <button
          className="text-muted-foreground"
          type="button"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
          <span className="sr-only">Drag to reorder</span>
        </button>
      </TableCell>
      <TableCell>
        <p className="text-sm font-medium">{service.name}</p>
      </TableCell>
      <TableCell>
        <StatusBadge status={service.status} />
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{monitorsCount}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {service.uptime_percentage === null ? "No data" : `${service.uptime_percentage.toFixed(2)}%`}
      </TableCell>
      <TableCell>
        <ServiceActions onDelete={onDelete} onEdit={onEdit} service={service} />
      </TableCell>
    </TableRow>
  );
}

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

  const sortedServices = useMemo(() => {
    return [...(servicesQuery.data ?? [])].sort((a, b) => a.order - b.order);
  }, [servicesQuery.data]);

  const orderedServices = sortedServices;

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
          <Button onClick={openCreateSheet}>
            <Plus className="size-4" />
            Add service
          </Button>
        }
        description="Manage services, statuses, and display order on your public page."
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

      <Sheet onOpenChange={setIsSheetOpen} open={isSheetOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>{editingService ? "Edit service" : "Add service"}</SheetTitle>
            <SheetDescription>
              Configure how this service appears on your status page and dashboard.
            </SheetDescription>
          </SheetHeader>

          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
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
                <Button
                  disabled={createServiceMutation.isPending || updateServiceMutation.isPending}
                  type="submit"
                >
                  {editingService ? "Save changes" : "Create service"}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
