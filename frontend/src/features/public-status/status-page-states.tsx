import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function StatusPageLoadingState(): React.JSX.Element {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 pb-10 pt-8">
      <Skeleton className="mb-8 h-10 w-full rounded-lg" />
      <Skeleton className="mb-8 h-12 w-full rounded-lg" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </main>
  );
}

export function StatusPageErrorState(): React.JSX.Element {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 pb-10 pt-8">
      <Card className="rounded-lg shadow-sm">
        <CardContent className="p-6">
          <p className="text-sm font-medium">Unable to load status page.</p>
          <p className="mt-1 text-sm text-muted-foreground">Please refresh in a moment.</p>
        </CardContent>
      </Card>
    </main>
  );
}
