import type { League, SeasonStats } from "@/lib/sportradar/types";
export type ReportedCareerTotals = { gamesPlayed: number | null; gamesStarted: number | null; statistics: Record<string, number> };
export type StoredStats = { league: League; source: string; sourceUrls?: string[]; syncedAt: string; seasons: SeasonStats[]; reportedCareerTotals?: ReportedCareerTotals };
