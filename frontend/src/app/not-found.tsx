import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound(): React.JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg items-center px-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <SearchX className="size-5 text-muted-foreground" />
            Page not found
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The page you requested does not exist or may have moved.
          </p>
          <Button asChild>
            <Link href="/">Go to Reachable home</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
