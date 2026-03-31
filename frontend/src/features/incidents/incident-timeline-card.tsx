import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { IncidentStatusBadge } from "@/components/status/incident-status-badge";
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
    <div>
      <h3 className="text-sm font-medium text-neutral-900">Timeline</h3>
      <div className="mt-4 space-y-0">
        {timeline.length === 0 ? (
          <p className="text-sm text-neutral-400">No updates yet.</p>
        ) : (
          timeline.map((update) => (
            <article key={update.id} className="border-l border-neutral-200 py-3 pl-4">
              <div className="flex items-center gap-2">
                <IncidentStatusBadge status={update.status} />
                <span className="text-xs text-neutral-400">{formatRelative(update.created_at)}</span>
              </div>
              <div className="prose prose-sm prose-neutral mt-1.5 max-w-none text-sm">
                <Markdown remarkPlugins={[remarkGfm]}>{update.message}</Markdown>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
