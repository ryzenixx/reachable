import { Skeleton } from "@/components/ui/skeleton";

export default function Loading(): React.JSX.Element {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-8">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-4 h-40 w-full" />
    </main>
  );
}
