import { Skeleton } from "@/components/ui/skeleton";

export default function IncidentDetailLoading(): React.JSX.Element {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-72" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-56 w-full" />
    </div>
  );
}
