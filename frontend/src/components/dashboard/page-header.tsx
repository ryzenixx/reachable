import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

type DashboardPageHeaderProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  onOpenMobileSidebar?: () => void;
};

export function DashboardPageHeader({
  title,
  description,
  action,
  onOpenMobileSidebar,
}: DashboardPageHeaderProps): React.JSX.Element {
  return (
    <header className="mb-8 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {onOpenMobileSidebar ? (
          <Button className="md:hidden" onClick={onOpenMobileSidebar} size="icon" variant="ghost">
            <Menu className="size-4" />
            <span className="sr-only">Open navigation</span>
          </Button>
        ) : null}
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">{title}</h1>
          {description ? <p className="mt-1 text-sm text-neutral-500">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
