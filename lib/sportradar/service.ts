import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { fetchProfile, profileEndpoint, responseError } from "./client";
import { normalizeProfile, hasStatistics } from "./normalize";
import { StatsError } from "./errors";
import type { League } from "./types";

function checked<T>({ data, error }: { data: T; error: unknown }): T {
  if (error) throw new StatsError("stats_storage_unavailable", 503);
  return data;
}
export async function previewProfile(playerId: string, providerId: string, league: League, refresh: boolean) {
  if (league !== "nfl") throw new StatsError("ncaa_calls_disabled_for_cohort", 403);
  const db = createServiceClient();
  const player = checked(await db.from("players").select("id,full_name,position,school,dob,team").eq("id", playerId).maybeSingle());
  if (!player) throw new StatsError("bltz_player_not_found", 404);
  const endpoint = profileEndpoint(league, providerId);
  const access = process.env.SPORTRADAR_ACCESS_LEVEL || "trial";
  const cached = checked(await db.from("player_stat_ingestions").select("*")
    .eq("player_id", playerId).eq("league", league).eq("provider_player_id", providerId)
    .order("fetched_at", { ascending: false }).limit(1).maybeSingle());
  // Historical data stays cached indefinitely until an admin explicitly refreshes.
  if (cached && !refresh) {
    checked(await db.from("provider_request_logs").insert({ player_id: playerId, provider_player_id: providerId,
      endpoint, access_level: access, cache_hit: true, response_status: 200, duration_ms: 0, completed_at: new Date().toISOString() }));
    return { ...cached, cacheHit: true, player };
  }
  if (cached && Date.now() - Date.parse(cached.fetched_at) < 60_000) throw new StatsError("refresh_cooldown", 429);
  if (!process.env.SPORTRADAR_API_KEY) throw new StatsError("provider_key_not_configured", 503);
  const configuredBudget = Number(process.env.SPORTRADAR_REQUEST_BUDGET || 20);
  if (!Number.isInteger(configuredBudget) || configuredBudget < 1 || configuredBudget > 1000) throw new StatsError("invalid_budget");
  for (let attempt = 0; attempt < 2; attempt++) {
    const reservation = await db.rpc("reserve_sportradar_request", {
      p_player_id: playerId, p_provider_id: providerId, p_endpoint: endpoint,
      p_access: access, p_budget: configuredBudget,
    });
    if (reservation.error) {
      const code = ["trial_budget_exhausted", "provider_cooldown", "request_throttled", "request_in_progress"]
        .find(c => reservation.error.message.includes(c));
      throw new StatsError(code || "request_reservation_failed", code ? 429 : 503);
    }
    const started = Date.now();
    let status = 0;
    let failure: StatsError | null = null;
    let result: Record<string, unknown> | null = null;
    try {
      const response = await fetchProfile(endpoint);
      status = response.status;
      if (status !== 200) throw responseError(status);
      const fetchedAt = new Date().toISOString();
      const normalized = normalizeProfile(response.raw, playerId, providerId, league, fetchedAt);
      // Immutable review IDs ensure approval always imports exactly what was shown.
      result = checked(await db.from("player_stat_ingestions").insert({
        player_id: playerId, provider_player_id: providerId, league,
        status: hasStatistics(normalized) ? "MANUAL_REVIEW" : "NO_DATA",
        raw_profile: response.raw, normalized, fetched_at: fetchedAt,
      }).select("*").single());
    } catch (error) {
      failure = error instanceof StatsError ? error : new StatsError("stats_ingestion_failed", 503);
    }
    // Never allow an unlogged retry. Pending reservations survive process death.
    checked(await db.from("provider_request_logs").update({ response_status: status,
      duration_ms: Date.now() - started, error_code: failure?.code ?? null, completed_at: new Date().toISOString(),
    }).eq("id", reservation.data));
    if (!failure) return { ...result, cacheHit: false, player };
    if (attempt === 0 && status >= 500) { await new Promise(resolve => setTimeout(resolve, 2000)); continue; }
    throw failure;
  }
  throw new StatsError("provider_unavailable", 502);
}

export async function importProfile(db: SupabaseClient, ingestionId: string, previewId: string, actorId: string) {
  const result = await db.rpc("import_sportradar_stats", {
    p_ingestion_id: ingestionId, p_preview_id: previewId, p_actor_id: actorId,
  });
  if (result.error) {
    const conflict = result.error.code === "23505" || /conflict|stale_review/.test(result.error.message);
    throw new StatsError(conflict ? "mapping_or_review_conflict" : "stats_import_failed", conflict ? 409 : 503);
  }
  return result.data;
}

export async function getTrialUsage() {
  const db = createServiceClient();
  const results = await Promise.all([
    db.from("provider_request_logs").select("id", { count: "exact", head: true }).eq("provider", "sportradar").eq("access_level", "trial").eq("cache_hit", false).gte("response_status", 200).lt("response_status", 300).is("error_code", null),
    db.from("provider_request_logs").select("id", { count: "exact", head: true }).eq("provider", "sportradar").eq("access_level", "trial").eq("cache_hit", false).not("error_code", "is", null),
    db.from("provider_request_logs").select("id", { count: "exact", head: true }).eq("provider", "sportradar").eq("access_level", "trial").eq("cache_hit", false),
    db.from("player_external_ids").select("player_id").eq("provider", "sportradar").limit(1000),
    db.from("provider_request_logs").select("requested_at,response_status,error_code,cache_hit").eq("provider", "sportradar").order("requested_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (results.some(r => r.error)) throw new StatsError("stats_storage_unavailable", 503);
  return { successful: results[0].count ?? 0, failed: results[1].count ?? 0, reserved: results[2].count ?? 0,
    playersImported: new Set((results[3].data ?? []).map(p => p.player_id)).size, lastRequest: results[4].data };
}
