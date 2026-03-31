"use client";

import { Copy, RefreshCw } from "lucide-react";
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
import type { ApiTokenSummary } from "@/types/api";
import { maskToken } from "./utils";

type ApiSettingsPanelProps = {
  latestPlainToken: string | null;
  latestTokenSummary: ApiTokenSummary | null;
  onCopyToken: () => Promise<void>;
  onRegenerateToken: () => Promise<void>;
};

export function ApiSettingsPanel({
  latestPlainToken,
  latestTokenSummary,
  onCopyToken,
  onRegenerateToken,
}: ApiSettingsPanelProps): React.JSX.Element {
  return (
    <div className="max-w-xl">
      <div className="space-y-3">
        <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Current API key</p>
          <p className="mt-1.5 font-mono text-sm text-neutral-700">
            {latestPlainToken
              ? maskToken(latestPlainToken)
              : latestTokenSummary
                ? `${latestTokenSummary.name} (hidden)`
                : "No API key yet"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => void onCopyToken()} size="sm" variant="outline">
            <Copy className="size-3.5" />
            Copy
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline">
                <RefreshCw className="size-3.5" />
                Regenerate
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Regenerate API key</AlertDialogTitle>
                <AlertDialogDescription>
                  A new key will be created and previous tokens revoked.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancelButton>Cancel</AlertDialogCancelButton>
                <AlertDialogActionButton onClick={() => void onRegenerateToken()}>
                  Regenerate
                </AlertDialogActionButton>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
