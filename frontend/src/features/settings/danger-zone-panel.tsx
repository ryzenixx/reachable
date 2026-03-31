"use client";

import { AlertTriangle, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";

type DangerZonePanelProps = {
  organizationName: string;
  deleteConfirmation: string;
  isDeleting: boolean;
  onChangeDeleteConfirmation: (value: string) => void;
  onDelete: () => Promise<void>;
};

export function DangerZonePanel({
  organizationName,
  deleteConfirmation,
  isDeleting,
  onChangeDeleteConfirmation,
  onDelete,
}: DangerZonePanelProps): React.JSX.Element {
  return (
    <div className="max-w-xl">
      <div className="space-y-3">
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <p>Deleting the organization is irreversible and will remove services, monitors, incidents, and subscribers.</p>
        </div>

        <Input
          onChange={(event) => onChangeDeleteConfirmation(event.target.value)}
          placeholder={`Type "${organizationName}" to confirm`}
          value={deleteConfirmation}
        />

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              disabled={deleteConfirmation !== organizationName || isDeleting}
              size="sm"
              variant="destructive"
            >
              <Trash2 className="size-3.5" />
              Delete organization
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete organization</AlertDialogTitle>
              <AlertDialogDescription>
                This action is permanent and cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancelButton>Cancel</AlertDialogCancelButton>
              <AlertDialogActionButton onClick={() => void onDelete()}>
                Delete permanently
              </AlertDialogActionButton>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
