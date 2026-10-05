"use client";

import { ModerationStats, useModerationStats } from "@/components/admin/ModerationStats";
import { ModerationTable } from "@/components/admin/ModerationTable";

export default function ModerationCenterPage() {
  const { refreshTrigger, refreshStats } = useModerationStats();

  return (
    <div className="p-3 md:p-8 space-y-4 md:space-y-6 max-w-[1600px] mx-auto">
      <ModerationStats refreshTrigger={refreshTrigger} />
      <ModerationTable onStatsChange={refreshStats} />
    </div>
  );
}


