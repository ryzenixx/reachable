import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading(): React.JSX.Element {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
