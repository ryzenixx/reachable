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
      className="border-neutral-100"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <TableCell className="w-8 pr-0">
        <button
          className="cursor-grab text-neutral-300 hover:text-neutral-500 active:cursor-grabbing"
          type="button"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" />
          <span className="sr-only">Drag to reorder</span>
        </button>
      </TableCell>
      <TableCell>
        <span className="text-sm font-medium text-neutral-900">{service.name}</span>
      </TableCell>
      <TableCell>
        <StatusBadge status={service.status} />
      </TableCell>
      <TableCell className="text-sm tabular-nums text-neutral-500">{monitorsCount}</TableCell>
      <TableCell className="text-sm tabular-nums text-neutral-500">
        {service.uptime_percentage === null ? "\u2014" : `${service.uptime_percentage.toFixed(2)}%`}
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          <Button className="h-7 px-2 text-neutral-500" onClick={() => onEdit(service)} size="sm" variant="ghost">
            <Pencil className="size-3" />
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="h-7 px-2 text-neutral-400 hover:text-red-600" size="sm" variant="ghost">
                <Trash2 className="size-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete service</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes {service.name} and all linked monitors.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancelButton>Cancel</AlertDialogCancelButton>
                <AlertDialogActionButton onClick={() => void onDelete(service)}>
                  Delete
                </AlertDialogActionButton>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}
