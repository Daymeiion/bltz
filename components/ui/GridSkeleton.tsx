import { Skeleton } from "@/components/ui/skeleton";
export function GridSkeleton() {
  return (
    <div className="mx-auto grid max-w-6xl gap-6 p-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-6 w-3/4" />
        </div>
      ))}
    </div>
  );
}
