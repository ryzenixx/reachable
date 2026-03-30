import Link from "next/link";
import { impactBorderClassMap } from "@/lib/status";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/dates";
import type { IncidentImpact } from "@/types/api";

type IncidentCardProps = {
  createdAt: string;
  href?: string;
  impact: IncidentImpact;
  message: string | null;
  title: string;
};

export function IncidentCard({ createdAt, href, impact, message, title }: IncidentCardProps): React.JSX.Element {
  const content = (
    <article className={cn("rounded-r-lg border-l-4 bg-card p-4", impactBorderClassMap[impact])}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{formatRelative(createdAt)}</p>
      </div>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </article>
  );

  if (!href) {
    return content;
  }

  return <Link href={href}>{content}</Link>;
}
