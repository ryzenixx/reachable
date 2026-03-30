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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className="border-red-500/30">
      <CardHeader>
        <CardTitle className="text-base text-red-700 dark:text-red-300">Danger zone</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300">
          <AlertTriangle className="mt-0.5 size-4" />
          <p>Deleting the organization is irreversible and will remove services, monitors, incidents, and subscribers.</p>
        </div>

        <Input
          onChange={(event) => onChangeDeleteConfirmation(event.target.value)}
          placeholder={`Type \"${organizationName}\" to confirm`}
          value={deleteConfirmation}
        />

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              className="w-full"
              disabled={deleteConfirmation !== organizationName || isDeleting}
              variant="destructive"
            >
              <Trash2 className="size-4" />
              Delete organization
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete organization</AlertDialogTitle>
              <AlertDialogDescription>
                This action is permanent. Type confirmation is valid, do you want to continue?
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
      </CardContent>
    </Card>
  );
}
