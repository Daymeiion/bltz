import "server-only";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { fetchLookup, lookupEndpoint, responseError } from "./client";
import { StatsError } from "./errors";

const Team = z.object({ id: z.string().uuid(), alias: z.string(), name: z.string(), market: z.string().optional() });
const Candidate = z.object({ id: z.string().uuid(), name: z.string(), position: z.string().nullish(), birth_date: z.string().nullish(), college: z.string().nullish() });
export type ProviderCandidate = z.infer<typeof Candidate> & { team: string; season: number };
const normalize = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();

export function matchPlayers(raw: unknown, name: string, team: string, season: number): ProviderCandidate[] {
  const parsed = z.object({ players: z.array(z.unknown()) }).safeParse(raw);
  if (!parsed.success) throw new StatsError("provider_lookup_invalid", 502);
  const tokens = normalize(name).split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const candidates = new Map<string, ProviderCandidate>();
  for (const row of parsed.data.players) {
    const player = Candidate.safeParse(row);
    if (player.success && tokens.every(token => normalize(player.data.name).includes(token))) candidates.set(player.data.id, { ...player.data, team, season });
  }
  return [...candidates.values()].slice(0, 20);
}

async function lookupFeed(playerId: string, endpoint: string) {
  const db = createServiceClient();
  const cache = await db.from("sportradar_lookup_cache").select("payload,expires_at").eq("endpoint", endpoint).maybeSingle();
  if (cache.error) throw new StatsError("lookup_storage_unavailable", 503);
  if (cache.data && Date.parse(cache.data.expires_at) > Date.now()) return cache.data.payload as unknown;
  if (!process.env.SPORTRADAR_API_KEY) throw new StatsError("provider_key_not_configured", 503);
  const budget = Number(process.env.SPORTRADAR_REQUEST_BUDGET || 20);
  if (!Number.isInteger(budget) || budget < 1 || budget > 1000) throw new StatsError("invalid_budget");
  const reservation = await db.rpc("reserve_sportradar_request", { p_player_id: playerId, p_provider_id: null, p_endpoint: endpoint,
    p_access: process.env.SPORTRADAR_ACCESS_LEVEL || "trial", p_budget: budget });
  if (reservation.error) {
    const code = ["trial_budget_exhausted", "provider_cooldown", "request_throttled", "request_in_progress"].find(code => reservation.error.message.includes(code));
    throw new StatsError(code || "request_reservation_failed", code ? 429 : 503);
  }
  let status = 0; let failure: StatsError | null = null; let payload: unknown;
  const started = Date.now();
  try {
    const result = await fetchLookup(endpoint); status = result.status;
    if (status !== 200) throw responseError(status);
    // Cache only recognized provider feeds; strip statistics and unrelated metadata.
    const schema = endpoint.endsWith("/teams.json")
      ? z.object({ teams: z.array(Team) })
      : z.object({ players: z.array(Candidate) });
    const parsed = schema.safeParse(result.raw);
    if (!parsed.success) throw new StatsError("provider_lookup_invalid", 502);
    payload = parsed.data;
    const saved = await db.from("sportradar_lookup_cache").upsert({ endpoint, payload,
      fetched_at: new Date().toISOString(), expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() });
    if (saved.error) throw new StatsError("lookup_storage_unavailable", 503);
  } catch (error) { failure = error instanceof StatsError ? error : new StatsError("provider_lookup_failed", 502); }
  const logged = await db.from("provider_request_logs").update({ response_status: status, duration_ms: Date.now() - started,
    error_code: failure?.code ?? null, completed_at: new Date().toISOString() }).eq("id", reservation.data);
  if (logged.error) throw new StatsError("stats_storage_unavailable", 503);
  if (failure) throw failure;
  return payload;
}

export async function searchProviderPlayers(playerId: string, name: string, requestedTeam?: string, requestedSeason?: number) {
  const db = createServiceClient();
  const player = await db.from("players").select("gsis_id,team,full_name").eq("id", playerId).maybeSingle();
  if (player.error) throw new StatsError("lookup_storage_unavailable", 503);
  if (!player.data) throw new StatsError("bltz_player_not_found", 404);
  let team = requestedTeam || player.data.team;
  let season = requestedSeason;
  if (player.data.gsis_id && (!requestedTeam || !season)) {
    const master = await db.from("nfl_players").select("latest_team,last_season").eq("gsis_id", player.data.gsis_id).maybeSingle();
    if (master.error) throw new StatsError("lookup_storage_unavailable", 503);
    team = requestedTeam || master.data?.latest_team || team;
    season = season ?? master.data?.last_season;
  }
  season ??= new Date().getUTCFullYear();
  if (!team) throw new StatsError("lookup_team_required");
  const catalog = z.object({ teams: z.array(Team) }).parse(await lookupFeed(playerId, lookupEndpoint("teams")));
  const aliases: Record<string, string> = { JAX: "JAC", OAK: "LV", SD: "LAC", STL: "LA" };
  const wanted = aliases[team.toUpperCase()] || team;
  const matchedTeam = catalog.teams.find(t => [t.alias, t.name, `${t.market || ""} ${t.name}`].some(value => normalize(value) === normalize(wanted)));
  if (!matchedTeam) return { candidates: [], team, season, teams: catalog.teams, message: "Choose the athlete’s NFL team and try again." };
  // Respect the provider's shared one-request-per-second trial throttle.
  await new Promise(resolve => setTimeout(resolve, 1200));
  const raw = await lookupFeed(playerId, lookupEndpoint("season", season, matchedTeam.id));
  const candidates = matchPlayers(raw, name, `${matchedTeam.market || ""} ${matchedTeam.name}`.trim(), season);
  return { candidates, team: matchedTeam.alias, season, teams: catalog.teams,
    message: candidates.length ? "Select the matching player to load their profile for review." : "No matching player in this team’s regular-season data. Try another career team, season, or name spelling." };
}
