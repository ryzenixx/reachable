import { Pencil, Trash2 } from "lucide-react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatRelative } from "@/lib/dates";
import type { Maintenance } from "@/types/api";

type MaintenancesTableProps = {
  maintenances: Maintenance[];
  onComplete: (maintenanceId: string) => Promise<void>;
  onDelete: (maintenanceId: string) => Promise<void>;
  onEdit: (maintenance: Maintenance) => void;
};

export function MaintenancesTable({
  maintenances,
  onComplete,
  onDelete,
  onEdit,
}: MaintenancesTableProps): React.JSX.Element {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-neutral-100">
          <TableHead className="">Title</TableHead>
          <TableHead className="">Scheduled</TableHead>
          <TableHead className="">Ended</TableHead>
          <TableHead className="">Status</TableHead>
          <TableHead className="w-[140px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {maintenances.map((maintenance) => (
          <TableRow key={maintenance.id} className="border-neutral-100">
            <TableCell>
              <span className="text-sm font-medium text-neutral-900">{maintenance.title}</span>
              {maintenance.description ? (
                <p className="text-xs text-neutral-400">{maintenance.description}</p>
              ) : null}
            </TableCell>
            <TableCell className="text-xs text-neutral-500">{formatRelative(maintenance.scheduled_at)}</TableCell>
            <TableCell className="text-xs text-neutral-500">
              {maintenance.ended_at ? formatRelative(maintenance.ended_at) : "\u2014"}
            </TableCell>
            <TableCell>
              <MaintenanceStatusBadge status={maintenance.status} />
            </TableCell>
            <TableCell>
              <div className="flex items-center justify-end gap-1">
                {maintenance.status !== "completed" ? (
                  <Button className="h-7 text-xs" onClick={() => void onComplete(maintenance.id)} size="sm" variant="outline">
                    Complete
                  </Button>
                ) : null}

                <Button className="h-7 px-2 text-neutral-500" onClick={() => onEdit(maintenance)} size="sm" variant="ghost">
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
                      <AlertDialogTitle>Delete maintenance</AlertDialogTitle>
                      <AlertDialogDescription>
                        This permanently removes {maintenance.title}.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancelButton>Cancel</AlertDialogCancelButton>
                      <AlertDialogActionButton onClick={() => void onDelete(maintenance.id)}>
                        Delete
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
  );
}
