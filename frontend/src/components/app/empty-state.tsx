import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
};

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps): React.JSX.Element {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-lg border p-2 text-muted-foreground">
          <Icon className="size-4" />
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
          <Button onClick={onAction} size="sm">
            {actionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
