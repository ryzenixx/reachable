"use client";

import Link from "next/link";
import { AlertOctagon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Error({ reset }: { reset: () => void }): React.JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg items-center justify-center px-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertOctagon className="size-5 text-muted-foreground" />
            Something went wrong
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Reachable hit an unexpected error while rendering this page.
          </p>
          <div className="flex items-center gap-2">
            <Button onClick={reset}>
              Retry
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Back to home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
