import { ArrowUpRight, RotateCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelative } from "@/lib/dates";
import type { SystemVersionSummary } from "@/types/api";

type VersionUpdateCardProps = {
  isError: boolean;
  isLoading: boolean;
  onRefresh: () => void;
  version: SystemVersionSummary | undefined;
};

export function VersionUpdateCard({
  isError,
  isLoading,
  onRefresh,
  version,
}: VersionUpdateCardProps): React.JSX.Element {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Runtime version</CardTitle>
          <CardDescription>Checking latest release information...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-4 w-56" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !version) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Runtime version</CardTitle>
          <CardDescription>Version check is temporarily unavailable.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onRefresh} size="sm" variant="outline">
            <RotateCw className="size-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Runtime version</CardTitle>
        <CardDescription>Current image version and upstream release status.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Current</span>
          <Badge className="bg-muted text-foreground">v{version.current_version}</Badge>
          {version.latest_version ? (
            <>
              <span className="text-muted-foreground">Latest</span>
              <Badge className="bg-muted text-foreground">v{version.latest_version}</Badge>
            </>
          ) : null}
        </div>

        {!version.update_check_enabled ? (
          <p className="text-sm text-muted-foreground">Update checks are disabled on this instance.</p>
        ) : version.latest_version === null ? (
          <p className="text-sm text-muted-foreground">Unable to resolve latest release right now.</p>
        ) : version.update_available ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-yellow-500/15 text-yellow-700 dark:text-yellow-300">Update available</Badge>
            {version.latest_release_url ? (
              <Button asChild size="sm" variant="outline">
                <a href={version.latest_release_url} rel="noreferrer" target="_blank">
                  View release
                  <ArrowUpRight className="size-4" />
                </a>
              </Button>
            ) : null}
          </div>
        ) : (
          <Badge className="bg-green-500/15 text-green-700 dark:text-green-300">Up to date</Badge>
        )}

        <p className="text-xs text-muted-foreground">
          Last checked: {version.checked_at ? formatRelative(version.checked_at) : "Unknown"}
        </p>
      </CardContent>
    </Card>
  );
}
