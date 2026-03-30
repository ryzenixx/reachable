import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { IncidentStatusBadge } from "@/components/status/incident-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelative } from "@/lib/dates";
import type { Incident } from "@/types/api";

type IncidentTimelineCardProps = {
  incident: Incident;
};

export function IncidentTimelineCard({ incident }: IncidentTimelineCardProps): React.JSX.Element {
  const timeline = incident.updates
    .slice()
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Incident timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">No updates yet.</p>
          ) : (
            timeline.map((update) => (
              <article key={update.id} className="space-y-2 border-l-2 border-border pl-4">
                <div className="flex items-center gap-2">
                  <IncidentStatusBadge status={update.status} />
                  <p className="text-xs text-muted-foreground">{formatRelative(update.created_at)}</p>
                </div>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <Markdown remarkPlugins={[remarkGfm]}>{update.message}</Markdown>
                </div>
              </article>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
