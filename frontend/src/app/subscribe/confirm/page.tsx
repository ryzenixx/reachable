import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ConfirmationState = {
  ok: boolean;
  message: string;
  status: number;
};

function apiBaseUrl(): string {
  return (process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8009/api/v1").replace(/\/$/, "");
}

async function confirmSubscription(token: string): Promise<ConfirmationState> {
  const endpoint = `${apiBaseUrl()}/public/subscribe/confirm/${encodeURIComponent(token)}`;

  const response = await fetch(endpoint, {
    method: "POST",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  let message = response.ok ? "Subscription confirmed." : "Unable to confirm subscription.";

  try {
    const payload = (await response.json()) as { message?: string };
    if (typeof payload.message === "string" && payload.message.trim().length > 0) {
      message = payload.message;
    }
  } catch {
    // Keep fallback message when API payload is not JSON.
  }

  return {
    ok: response.ok,
    message,
    status: response.status,
  };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Confirm Subscription | Reachable",
    description: "Confirm your status page update subscription.",
  };
}

export default async function ConfirmSubscriptionPage(
  props: PageProps<"/subscribe/confirm">,
): Promise<React.JSX.Element> {
  const searchParams = await props.searchParams;
  const token = typeof searchParams.token === "string" ? searchParams.token.trim() : "";

  const result =
    token.length > 0
      ? await confirmSubscription(token)
      : {
          ok: false,
          message: "Missing confirmation token in the URL.",
          status: 400,
        };

  const retryHref = token.length > 0 ? `/subscribe/confirm?token=${encodeURIComponent(token)}` : "/";
  const canRetry = !result.ok && result.status >= 500;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {result.ok ? (
              <CircleCheck className="size-5 text-green-600 dark:text-green-400" />
            ) : (
              <CircleAlert className="size-5 text-red-600 dark:text-red-400" />
            )}
            {result.ok ? "Subscription confirmed" : "Confirmation failed"}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{result.message}</p>

          {!result.ok && result.status >= 500 ? (
            <p className="text-xs text-muted-foreground">Temporary server issue detected. You can retry below.</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/">Back to status page</Link>
            </Button>

            {canRetry ? (
              <Button asChild>
                <Link href={retryHref}>Retry confirmation</Link>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
