import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SetupErrorStateProps = {
  onRetry: () => void;
};

export function SetupErrorState({ onRetry }: SetupErrorStateProps): React.JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-6 py-10">
      <Card className="w-full rounded-lg">
        <CardHeader className="space-y-2">
          <CardTitle>Unable to load onboarding</CardTitle>
          <CardDescription>Reachable could not connect to the API. Check your stack and try again.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onRetry} variant="outline">
            Retry
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
