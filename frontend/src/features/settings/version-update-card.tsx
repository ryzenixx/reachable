import { ArrowUpRight, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      <div className="max-w-xl">
        <h3 className="text-sm font-semibold text-neutral-900">Runtime version</h3>
        <p className="mt-0.5 text-xs text-neutral-400">Checking latest release...</p>
        <div className="mt-3 space-y-2">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
    );
  }

  if (isError || !version) {
    return (
      <div className="max-w-xl">
        <h3 className="text-sm font-semibold text-neutral-900">Runtime version</h3>
        <p className="mt-0.5 text-xs text-neutral-400">Version check unavailable.</p>
        <Button className="mt-3" onClick={onRefresh} size="sm" variant="outline">
          <RotateCw className="size-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <h3 className="text-sm font-semibold text-neutral-900">Runtime version</h3>
      <div className="mt-3 space-y-2">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-neutral-500">Current</span>
          <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">v{version.current_version}</span>
          {version.latest_version ? (
            <>
              <span className="text-neutral-500">Latest</span>
              <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">v{version.latest_version}</span>
            </>
          ) : null}
        </div>

        {!version.update_check_enabled ? (
          <p className="text-xs text-neutral-400">Update checks are disabled.</p>
        ) : version.latest_version === null ? (
          <p className="text-xs text-neutral-400">Unable to resolve latest release.</p>
        ) : version.update_available ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700">Update available</span>
            {version.latest_release_url ? (
              <Button asChild size="sm" variant="outline">
                <a href={version.latest_release_url} rel="noreferrer" target="_blank">
                  View release
                  <ArrowUpRight className="size-3.5" />
                </a>
              </Button>
            ) : null}
          </div>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">Up to date</span>
        )}

        <p className="text-xs text-neutral-400">
          Last checked: {version.checked_at ? formatRelative(version.checked_at) : "Unknown"}
        </p>
      </div>
    </div>
  );
}
