"use client";

import { Button } from "@/components/ui/button";

export default function IncidentDetailError({ reset }: { reset: () => void }): React.JSX.Element {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Unable to load incident</h2>
      <p className="mt-2 text-sm text-muted-foreground">Please retry in a moment.</p>
      <Button className="mt-4" onClick={reset}>
        Retry
      </Button>
    </div>
  );
}
