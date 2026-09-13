import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { League, SeasonStats } from "@/lib/sportradar/types";
import { createServiceClient } from "@/lib/supabase/service";
import type { StoredStats } from "./structured-stats-types";

const Bundle = z.object({ version: z.literal(1), league: League, seasons: z.array(SeasonStats) });

/** Database-only, fail-soft read. Never imports the provider client/service. */
export async function readStructuredStats(db: SupabaseClient, playerId: string | null): Promise<StoredStats[]> {
  if (!playerId) return [];
  try {
    const { data, error } = await db.from("player_season_stats")
      .select("source,stats,last_synced_at").eq("player_id", playerId)
      .in("source", ["sportradar_nfl", "sportradar_ncaafb"]);
    if (error) return [];
    const grouped = new Map<string, StoredStats>();
    for (const row of data ?? []) {
      const parsed = Bundle.safeParse(row.stats);
      if (!parsed.success || row.source !== `sportradar_${parsed.data.league}`) continue;
      const { league, seasons } = parsed.data;
      const entry: StoredStats = grouped.get(league) ?? { league, source: "Sportradar", seasons: [], syncedAt: row.last_synced_at };
      entry.seasons.push(...seasons);
      if (row.last_synced_at < entry.syncedAt) entry.syncedAt = row.last_synced_at;
      grouped.set(league, entry);
    }
    return [...grouped.values()];
  } catch { return []; }
}

/**
 * Reads a preview's canonical athlete link only after the preview route has
 * already authorized the current viewer. The service-only lookup keeps the
 * canonical player id out of the private preview payload and browser bundle.
 */
export async function readPreviewStructuredStats(previewId: string): Promise<StoredStats[]> {
  try {
    const db = createServiceClient();
    const { data, error } = await db
      .from("preview_lockers")
      .select("player_id")
      .eq("id", previewId)
      .maybeSingle();
    if (error || !data?.player_id) return [];
    return readStructuredStats(db, data.player_id);
  } catch {
    return [];
  }
}
