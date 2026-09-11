import type { League, SeasonStats } from "@/lib/sportradar/types";
export type StoredStats = { league: League; source: string; syncedAt: string; seasons: SeasonStats[] };
