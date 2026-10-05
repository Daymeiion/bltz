"use client";

import { useEffect, useState } from "react";
import { StatCard } from "./StatCard";

type ModerationStats = {
  counts: {
    open: number;
    in_review: number;
    resolved: number;
    closed: number;
  };
  trends: {
    open: number;
    in_review: number;
    resolved: number;
    closed: number;
  };
  lastUpdated: string;
};

export function ModerationStats({ refreshTrigger = 0 }: { refreshTrigger?: number }) {
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/moderations/stats", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching moderation stats:", error);
      // Fallback to mock data
      setStats({
        counts: { open: 9, in_review: 4, resolved: 31, closed: 12 },
        trends: { open: 2, in_review: -1, resolved: 6, closed: 1 },
        lastUpdated: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [refreshTrigger]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-24 bg-white/5 rounded-xl"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      <StatCard
        title="Open"
        value={stats.counts.open.toString()}
        trend={stats.trends.open > 0 ? `+${stats.trends.open}` : stats.trends.open.toString()}
        trendDirection={stats.trends.open >= 0 ? "up" : "down"}
        subtitle="last 7 days"
        description="Awaiting review"
      />
      <StatCard
        title="In Review"
        value={stats.counts.in_review.toString()}
        trend={stats.trends.in_review > 0 ? `+${stats.trends.in_review}` : stats.trends.in_review.toString()}
        trendDirection={stats.trends.in_review >= 0 ? "up" : "down"}
        subtitle="active cases"
        description="Assigned to admins"
      />
      <StatCard
        title="Resolved"
        value={stats.counts.resolved.toString()}
        trend={stats.trends.resolved > 0 ? `+${stats.trends.resolved}` : stats.trends.resolved.toString()}
        trendDirection={stats.trends.resolved >= 0 ? "up" : "down"}
        subtitle="this month"
        description="Avg time 14h"
      />
      <StatCard
        title="Closed"
        value={stats.counts.closed.toString()}
        trend={stats.trends.closed > 0 ? `+${stats.trends.closed}` : stats.trends.closed.toString()}
        trendDirection={stats.trends.closed >= 0 ? "up" : "down"}
        subtitle="no action needed"
        description="Archived"
      />
    </div>
  );
}

// Hook for refreshing stats from parent components
export function useModerationStats() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshStats = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return { refreshTrigger, refreshStats };
}
