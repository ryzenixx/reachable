import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function SetupLoadingState(): React.JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-10">
      <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-lg">
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-8 w-72" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
