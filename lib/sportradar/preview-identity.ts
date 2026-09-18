import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { StatsError } from "./errors";

const PLAYER_COLUMNS = "id,full_name,slug,position,school,team,dob";

/** Resolve persisted identity references only; names are never identity proof. */
export async function resolvePreviewAthlete(db: SupabaseClient, previewId: string) {
  const preview = await db.from("preview_lockers").select("player_id").eq("id", previewId).maybeSingle();
  if (preview.error) throw new StatsError("preview_identity_unavailable", 503);
  if (!preview.data) throw new StatsError("preview_not_found", 404);
  let playerId = preview.data.player_id as string | null;
  if (!playerId) {
    const link = await db.from("gtm_player_preview_lockers").select("gsis_id").eq("preview_locker_id", previewId).maybeSingle();
    if (link.error) throw new StatsError("preview_identity_unavailable", 503);
    if (!link.data) return { player: null, linked: false, message: null };
    const matches = await db.from("players").select(PLAYER_COLUMNS).eq("gsis_id", link.data.gsis_id).limit(2);
    if (matches.error) throw new StatsError("player_search_failed", 503);
    if (!matches.data?.length) {
      const master = await db.from("nfl_players").select("gsis_id,display_name,position,college_name,latest_team,birth_date").eq("gsis_id", link.data.gsis_id).single();
      if (master.error || !master.data) throw new StatsError("preview_identity_unavailable", 503);
      const candidates = await db.from("players").select(PLAYER_COLUMNS).ilike("full_name", master.data.display_name.replace(/[%_]/g, "")).limit(20);
      if (candidates.error) throw new StatsError("player_search_failed", 503);
      return { player: null, linked: true, master: master.data, candidates: candidates.data,
        message: "Review the linked Player Master record, then connect an existing BLTZ athlete or create its private identity." };
    }
    if (matches.data.length !== 1) return {
      player: null, linked: true,
      message: "This Player Master record has multiple BLTZ athlete identities. Resolve the duplicate identity before importing statistics.",
    };
    playerId = matches.data[0].id;
  }
  const player = await db.from("players").select(PLAYER_COLUMNS).eq("id", playerId).maybeSingle();
  if (player.error || !player.data) throw new StatsError("preview_identity_unavailable", 503);
  const mappings = await db.from("player_external_ids").select("league,provider_player_id,verified_at").eq("player_id", playerId).eq("provider", "sportradar");
  if (mappings.error) throw new StatsError("stats_storage_unavailable", 503);
  return { player: player.data, linked: true, mappings: mappings.data, message: null };
}
