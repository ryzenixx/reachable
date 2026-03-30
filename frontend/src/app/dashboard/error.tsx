"use client";

import { Button } from "@/components/ui/button";

export default function DashboardError({ reset }: { reset: () => void }): React.JSX.Element {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Dashboard error</h2>
      <p className="mt-2 text-sm text-muted-foreground">An unexpected error happened while loading this route.</p>
      <Button className="mt-4" onClick={reset}>
        Retry
      </Button>
    </div>
  );
}
