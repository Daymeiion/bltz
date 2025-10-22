import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AchievementsPageClient } from "./achievements-client";

export const metadata = {
  title: "Achievements | BLTZ Dashboard",
  description: "View your gaming achievements and awards",
};

function AchievementsPageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--bltz-navy))] via-[#000000] to-[#000000] p-6 md:p-10 scrollbar-hide">
      <div className="max-w-7xl mx-auto">
        {/* Header Skeleton */}
        <div className="relative mb-10">
          <div className="absolute -top-2 -left-2 w-64 h-64 bg-bltz-gold/10 rounded-full blur-3xl" />
          <div className="relative">
            <Skeleton className="h-12 w-96 mb-3" />
            <Skeleton className="h-6 w-80" />
          </div>
        </div>

        {/* Carousel Skeleton */}
        <div className="mb-8">
          <Skeleton className="h-96 w-full rounded-lg" />
        </div>

        {/* Dock Skeleton */}
        <div className="flex justify-center">
          <div className="bg-black/40 backdrop-blur-md rounded-2xl border-2 border-gray-600/50 p-4">
            <div className="flex gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-16 w-16 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AchievementsPage() {
  return (
    <Suspense fallback={<AchievementsPageSkeleton />}>
      <AchievementsPageClient />
    </Suspense>
  );
}
