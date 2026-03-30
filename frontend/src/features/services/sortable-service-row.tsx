"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import type { Service } from "@/types/api";
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
import { TableCell, TableRow } from "@/components/ui/table";

type SortableServiceRowProps = {
  monitorsCount: number;
  onDelete: (service: Service) => Promise<void>;
  onEdit: (service: Service) => void;
  service: Service;
};

function ServiceActions({
  service,
  onDelete,
  onEdit,
}: Omit<SortableServiceRowProps, "monitorsCount">): React.JSX.Element {
  return (
    <div className="flex items-center justify-end gap-2">
      <Button onClick={() => onEdit(service)} size="sm" variant="ghost">
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
            <AlertDialogActionButton onClick={() => void onDelete(service)}>
              Delete service
            </AlertDialogActionButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function SortableServiceRow({
  monitorsCount,
  onDelete,
  onEdit,
  service,
}: SortableServiceRowProps): React.JSX.Element {
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
