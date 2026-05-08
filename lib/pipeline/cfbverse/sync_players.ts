import { createServiceClient } from "@/lib/supabase/service";

/**
 * Historical college football player sync — backfills `cfb_players` from
 * the CollegeFootballData.com /roster endpoint. CFBD requires a year
 * parameter, so we iterate (team × season). Per-player data is then
 * aggregated across years (first non-null wins per field) before upsert.
 *
 * Architecture: same sink/cache pattern as nflverse. The scraper
 * (lib/pipeline/scrapers/cfbverse.ts) reads from this table; this
 * module is the writer.
 *
 * Scope control: caller can restrict by `team` or `seasons` to keep a
 * single run small. Full backfill (754 teams × 20 seasons ≈ 15k API
 * calls) is meant to run once during initial population, not every
 * sync.
 */

const CFBD_BASE = "https://api.collegefootballdata.com";
const FETCH_TIMEOUT_MS = 20_000;
const UPSERT_BATCH_SIZE = 500;

// CFBD's free tier is 200 req/min. We throttle below that so concurrent
// syncs / dev experimentation don't burn the quota.
const REQUESTS_PER_MINUTE = 100;
const REQUEST_INTERVAL_MS = Math.ceil(60_000 / REQUESTS_PER_MINUTE);

export interface SyncCfbPlayersOptions {
  /** CFBD team name. Scopes the sync to one program. Omit for all teams. */
  team?: string;
  /** Inclusive season range. Defaults to 2010..currentYear (full bio
   *  fields exist from ~2010 onward; pre-2010 rows are sparser). */
  fromSeason?: number;
  toSeason?: number;
}

export interface SyncCfbPlayersResult {
  ok: boolean;
  teams_processed: number;
  seasons_processed: number;
  api_calls: number;
  rows_total: number;
  rows_upserted: number;
  duration_ms: number;
  error?: string;
}

interface CfbdRosterRow {
  id: string;
  firstName: string | null;
  lastName: string | null;
  jersey: number | null;
  position: string | null;
  height: number | null;
  weight: number | null;
  homeCity: string | null;
  homeState: string | null;
  homeCountry: string | null;
  team: string | null;
  year: number | null;
  recruitIds: string[] | null;
}

interface CfbPlayerRow {
  espn_id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string;
  jersey: number | null;
  position: string | null;
  height_in: number | null;
  weight_lbs: number | null;
  home_city: string | null;
  home_state: string | null;
  home_country: string | null;
  team: string | null;
  cfb_team_id: string | null;
  first_season: number | null;
  last_season: number | null;
  recruit_ids: string[] | null;
  last_synced_at: string;
}

export async function syncCfbPlayers(
  opts: SyncCfbPlayersOptions = {},
): Promise<SyncCfbPlayersResult> {
  const start = Date.now();
  const apiKey = process.env.CFBD_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      teams_processed: 0,
      seasons_processed: 0,
      api_calls: 0,
      rows_total: 0,
      rows_upserted: 0,
      duration_ms: Date.now() - start,
      error: "CFBD_API_KEY not set in environment",
    };
  }

  try {
    const sb = createServiceClient();

    const teams = await pickTeams(sb, opts.team);
    if (teams.length === 0) {
      return {
        ok: false,
        teams_processed: 0,
        seasons_processed: 0,
        api_calls: 0,
        rows_total: 0,
        rows_upserted: 0,
        duration_ms: Date.now() - start,
        error: `No teams matched (team filter: ${opts.team ?? "<all>"})`,
      };
    }

    const currentYear = new Date().getFullYear();
    const fromSeason = opts.fromSeason ?? 2010;
    const toSeason = opts.toSeason ?? currentYear;
    const seasons: number[] = [];
    for (let y = fromSeason; y <= toSeason; y++) seasons.push(y);

    // Aggregate every (team, season) snapshot into one row per espn_id.
    // Players who appear on multiple rosters get the first non-null
    // value for each field plus a span [first_season, last_season].
    const aggregate = new Map<string, CfbPlayerRow>();
    let apiCalls = 0;
    let lastReq = 0;

    for (const team of teams) {
      for (const season of seasons) {
        // throttle
        const elapsed = Date.now() - lastReq;
        if (elapsed < REQUEST_INTERVAL_MS) {
          await new Promise((r) => setTimeout(r, REQUEST_INTERVAL_MS - elapsed));
        }
        lastReq = Date.now();
        apiCalls++;

        const rows = await fetchRoster(apiKey, team.name, season);
        for (const r of rows) {
          mergePlayerRow(aggregate, r, team.cfb_team_id);
        }
      }
    }

    const rows = Array.from(aggregate.values());
    let upserted = 0;
    for (let i = 0; i < rows.length; i += UPSERT_BATCH_SIZE) {
      const batch = rows.slice(i, i + UPSERT_BATCH_SIZE);
      const { error } = await sb
        .from("cfb_players")
        .upsert(batch, { onConflict: "espn_id" });
      if (error) {
        return {
          ok: false,
          teams_processed: teams.length,
          seasons_processed: seasons.length,
          api_calls: apiCalls,
          rows_total: rows.length,
          rows_upserted: upserted,
          duration_ms: Date.now() - start,
          error: `supabase upsert failed: ${error.message}`,
        };
      }
      upserted += batch.length;
    }

    return {
      ok: true,
      teams_processed: teams.length,
      seasons_processed: seasons.length,
      api_calls: apiCalls,
      rows_total: rows.length,
      rows_upserted: upserted,
      duration_ms: Date.now() - start,
    };
  } catch (e) {
    return {
      ok: false,
      teams_processed: 0,
      seasons_processed: 0,
      api_calls: 0,
      rows_total: 0,
      rows_upserted: 0,
      duration_ms: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

interface TeamSelector {
  name: string; // CFBD-side team name (matches their /roster?team= input)
  cfb_team_id: string | null; // Our cfb_teams.espn_id, null if unmatched
}

async function pickTeams(
  sb: ReturnType<typeof createServiceClient>,
  filter: string | undefined,
): Promise<TeamSelector[]> {
  // Pull cfb_teams to map CFBD team names back to our cfb_team_id.
  // CFBD uses the bare school name ("California"), not the display name
  // ("California Golden Bears"); the closest column on cfb_teams is
  // `location`.
  let q = sb
    .from("cfb_teams")
    .select("espn_id, location, display_name")
    .not("location", "is", null);
  if (filter) {
    // ilike matches both "California" and "California Golden Bears".
    q = q.or(`location.ilike.%${filter}%,display_name.ilike.%${filter}%`);
  }
  const { data, error } = await q;
  if (error || !data) return [];
  // CFBD's /roster endpoint takes the location string. Dedup teams that
  // share the same location (rare, but happens with affiliate programs).
  const seen = new Set<string>();
  const out: TeamSelector[] = [];
  for (const row of data) {
    const name = (row.location ?? "").trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push({ name, cfb_team_id: row.espn_id });
  }
  return out;
}

async function fetchRoster(
  apiKey: string,
  team: string,
  year: number,
): Promise<CfbdRosterRow[]> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  try {
    const url =
      `${CFBD_BASE}/roster` +
      `?team=${encodeURIComponent(team)}&year=${year}`;
    const res = await fetch(url, {
      signal: ctl.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "User-Agent": "BLTZ-OnboardBot/1.0",
      },
    });
    if (!res.ok) {
      // Most non-200 results here are 401 (bad key) or 429 (throttle).
      // Logging the status to console makes the cause discoverable in dev.
      console.warn(`cfbd /roster ${team} ${year} -> ${res.status}`);
      return [];
    }
    return (await res.json()) as CfbdRosterRow[];
  } catch (e) {
    console.warn(`cfbd /roster ${team} ${year} fetch failed`, e);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function mergePlayerRow(
  agg: Map<string, CfbPlayerRow>,
  r: CfbdRosterRow,
  cfbTeamId: string | null,
) {
  const espn = String(r.id ?? "").trim();
  if (!espn) return;
  const first = (r.firstName ?? "").trim();
  const last = (r.lastName ?? "").trim();
  const display = [first, last].filter(Boolean).join(" ");
  if (!display) return;

  const season = r.year ?? null;
  const existing = agg.get(espn);
  if (!existing) {
    agg.set(espn, {
      espn_id: espn,
      first_name: first || null,
      last_name: last || null,
      display_name: display,
      jersey: r.jersey ?? null,
      position: r.position ?? null,
      height_in: r.height ?? null,
      weight_lbs: r.weight ?? null,
      home_city: r.homeCity ?? null,
      home_state: r.homeState ?? null,
      home_country: r.homeCountry ?? null,
      team: r.team ?? null,
      cfb_team_id: cfbTeamId,
      first_season: season,
      last_season: season,
      recruit_ids: r.recruitIds ?? null,
      last_synced_at: new Date().toISOString(),
    });
    return;
  }
  // Aggregate: prefer first non-null per bio field; widen the season span.
  if (existing.jersey === null && r.jersey !== null) existing.jersey = r.jersey;
  if (!existing.position && r.position) existing.position = r.position;
  if (existing.height_in === null && r.height !== null) existing.height_in = r.height;
  if (existing.weight_lbs === null && r.weight !== null) existing.weight_lbs = r.weight;
  if (!existing.home_city && r.homeCity) existing.home_city = r.homeCity;
  if (!existing.home_state && r.homeState) existing.home_state = r.homeState;
  if (!existing.home_country && r.homeCountry) existing.home_country = r.homeCountry;
  if (!existing.team && r.team) existing.team = r.team;
  if (cfbTeamId && !existing.cfb_team_id) existing.cfb_team_id = cfbTeamId;
  if (season !== null) {
    if (existing.first_season === null || season < existing.first_season) {
      existing.first_season = season;
    }
    if (existing.last_season === null || season > existing.last_season) {
      existing.last_season = season;
    }
  }
  existing.last_synced_at = new Date().toISOString();
}
