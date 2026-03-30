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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">API</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">Current API key</p>
          <p className="mt-1 font-mono text-sm">
            {latestPlainToken
              ? maskToken(latestPlainToken)
              : latestTokenSummary
                ? `${latestTokenSummary.name} (hidden)`
                : "No API key yet"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => void onCopyToken()} size="sm" variant="outline">
            <Copy className="size-4" />
            Copy
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline">
                <RefreshCw className="size-4" />
                Regenerate
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Regenerate API key</AlertDialogTitle>
                <AlertDialogDescription>
                  A new API key will be created and previous `api-key` tokens will be revoked.
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
      </CardContent>
    </Card>
  );
}
