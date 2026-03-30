import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AuthStateCardProps = {
  title: string;
  description: string;
  loadingLabel?: string;
  showSkeleton?: boolean;
};

export function AuthStateCard({
  title,
  description,
  loadingLabel,
  showSkeleton = false,
}: AuthStateCardProps): React.JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6">
      <Card className="w-full rounded-lg border-border/90">
        <CardHeader className="space-y-1 p-6">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          {showSkeleton ? (
            <div className="space-y-3">
              <div className="h-9 rounded-md bg-muted" />
              <div className="h-9 rounded-md bg-muted" />
              <div className="h-9 rounded-md bg-muted" />
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {loadingLabel ?? "Loading..."}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
