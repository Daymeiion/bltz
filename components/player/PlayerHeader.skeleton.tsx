import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function PlayerHeaderSkeleton() {
  return (
    <Card className="overflow-hidden rounded-2xl border-white/10 bg-white/5">
      <div className="relative h-44 sm:h-52 lg:h-72 w-full overflow-hidden">
        <Skeleton className="absolute inset-0 h-full w-full" />
      </div>
      <div className="px-4 pt-8 pb-5">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="mt-2 h-4 w-1/3" />
      </div>
    </Card>
  );
}
