"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ImpactBadge } from "@/components/status/impact-badge";
import { IncidentStatusBadge } from "@/components/status/incident-status-badge";
import { OrganizationAvatar } from "@/components/app/organization-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicIncident } from "@/hooks/use-public-status";
import { formatRelative } from "@/lib/dates";

type PublicIncidentPageClientProps = {
  incidentId: string;
};

export function PublicIncidentPageClient({ incidentId }: PublicIncidentPageClientProps): React.JSX.Element {
  const incidentQuery = usePublicIncident(incidentId);

  const data = incidentQuery.data;

  if (incidentQuery.isPending) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-8">
        <Skeleton className="h-8 w-60" />
        <Skeleton className="mt-4 h-64 w-full" />
      </main>
    );
  }

  if (incidentQuery.isError || !data) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-8">
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Unable to load incident details.</CardContent>
        </Card>
      </main>
    );
  }

  const updates = data.incident.updates
    .slice()
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <OrganizationAvatar organization={data.organization} />
          <div>
            <h1 className="text-sm font-semibold">{data.organization.name}</h1>
            <p className="text-xs text-muted-foreground">Incident details</p>
          </div>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/">
            <ArrowLeft className="size-4" />
            Back to status
          </Link>
        </Button>
      </header>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-lg">{data.incident.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2">
          <IncidentStatusBadge status={data.incident.status} />
          <ImpactBadge impact={data.incident.impact} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {updates.map((update) => (
            <article key={update.id} className="space-y-2 border-l-2 border-border pl-4">
              <div className="flex items-center gap-2">
                <IncidentStatusBadge status={update.status} />
                <p className="text-xs text-muted-foreground">{formatRelative(update.created_at)}</p>
              </div>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <Markdown remarkPlugins={[remarkGfm]}>{update.message}</Markdown>
              </div>
            </article>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
