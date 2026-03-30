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
                  <Button onClick={() => void onComplete(maintenance.id)} size="sm" variant="outline">
                    Complete
                  </Button>
                ) : null}

                <Button onClick={() => onEdit(maintenance)} size="sm" variant="ghost">
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
                      <AlertDialogActionButton onClick={() => void onDelete(maintenance.id)}>
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
  );
}
