import { createServiceClient } from "@/lib/supabase/service";

/**
 * College season-stats sync.
 *
 * CFBD exposes season stats at /stats/player/season?year=&team= as long-format
 * rows ({ playerId, category, statType, stat }). We:
 *   1. take our college players (players.cfb_team_id set),
 *   2. resolve each to their CFBD playerId (== cfb_players.espn_id) by matching
 *      name within the same team,
 *   3. pull season stats for the involved (team, season) pairs,
 *   4. fold the long rows into normalised per-season stat maps,
 *   5. upsert into `player_season_stats` (source 'cfbverse', level 'college').
 *
 * CFBD player-stat coverage effectively starts ~2004, so older college careers
 * legitimately return nothing (the locker shows "—").
 *
 * Source: https://api.collegefootballdata.com/stats/player/season
 * Trigger: app/api/dev/cfbverse-stats-sync.
 */

const CFBD_BASE = "https://api.collegefootballdata.com";
const FETCH_TIMEOUT_MS = 20_000;
const UPSERT_BATCH_SIZE = 500;
const REQUESTS_PER_MINUTE = 100;
const REQUEST_INTERVAL_MS = Math.ceil(60_000 / REQUESTS_PER_MINUTE);
const EARLIEST_SEASON = 2004;

// `${category}|${statType}` (lowercased category, raw statType) → canonical key.
// peak keys take the season max instead of summing across categories.
interface StatTarget {
  key: string;
  peak?: boolean;
}
const STAT_MAP: Record<string, StatTarget> = {
  "passing|COMPLETIONS": { key: "completions" },
  "passing|ATT": { key: "attempts" },
  "passing|YDS": { key: "pass_yards" },
  "passing|TD": { key: "pass_tds" },
  "passing|INT": { key: "pass_int" },
  "rushing|CAR": { key: "carries" },
  "rushing|YDS": { key: "rush_yards" },
  "rushing|TD": { key: "rush_tds" },
  "rushing|LONG": { key: "long_rush", peak: true },
  "receiving|REC": { key: "receptions" },
  "receiving|YDS": { key: "rec_yards" },
  "receiving|TD": { key: "rec_tds" },
  "defensive|TOT": { key: "tackles" },
  "defensive|SOLO": { key: "tackles_solo" },
  "defensive|SACKS": { key: "sacks" },
  "defensive|TFL": { key: "tfl" },
  "defensive|PD": { key: "pass_defended" },
  "defensive|QB HUR": { key: "qb_hurries" },
  "defensive|TD": { key: "def_tds" },
  "interceptions|INT": { key: "interceptions" },
  "interceptions|YDS": { key: "int_yards" },
  "interceptions|TD": { key: "int_tds" },
  "fumbles|REC": { key: "fumble_rec" },
  "kicking|FGM": { key: "fg_made" },
  "kicking|FGA": { key: "fg_att" },
  "kicking|LONG": { key: "long_fg", peak: true },
  "kicking|XPM": { key: "xp_made" },
  "kicking|XPA": { key: "xp_att" },
  "kicking|PTS": { key: "points" },
  "punting|NO": { key: "punts" },
  "punting|YDS": { key: "punt_yards" },
  "punting|LONG": { key: "punt_long", peak: true },
  "kickReturns|NO": { key: "returns" },
  "kickReturns|YDS": { key: "return_yards" },
  "kickReturns|TD": { key: "return_tds" },
  "puntReturns|NO": { key: "returns" },
  "puntReturns|YDS": { key: "return_yards" },
  "puntReturns|TD": { key: "return_tds" },
};

export interface SyncCfbStatsOptions {
  /** Restrict to a single school (matches cfb_teams.location/display_name). */
  team?: string;
  fromSeason?: number;
  toSeason?: number;
}

export interface SyncCfbStatsResult {
  ok: boolean;
  players_matched: number;
  api_calls: number;
  rows_total: number;
  rows_upserted: number;
  duration_ms: number;
  error?: string;
}

interface CfbdSeasonStatRow {
  season: number;
  playerId: string;
  player: string;
  team: string;
  category: string;
  statType: string;
  stat: string;
}

interface SeasonAcc {
  player_id: string;
  season: number;
  team: string | null;
  stats: Record<string, number>;
}

export async function syncCfbStats(
  opts: SyncCfbStatsOptions = {},
): Promise<SyncCfbStatsResult> {
  const start = Date.now();
  const apiKey = process.env.CFBD_API_KEY;
  if (!apiKey) {
    return blank(start, "CFBD_API_KEY not set in environment");
  }

  try {
    const sb = createServiceClient();

    // 1) Our college players (with a resolved school).
    let pq = sb
      .from("players")
      .select("id, full_name, name, cfb_team_id")
      .not("cfb_team_id", "is", null);
    const { data: players, error: pErr } = await pq;
    if (pErr) throw new Error(`players query failed: ${pErr.message}`);
    if (!players || players.length === 0) return ok0(start);

    // cfb_team_id → CFBD team name (location) + display, optionally filtered.
    const teamIds = Array.from(
      new Set(players.map((p: any) => String(p.cfb_team_id)).filter(Boolean)),
    );
    let tq = sb
      .from("cfb_teams")
      .select("espn_id, location, display_name")
      .in("espn_id", teamIds);
    const { data: teams, error: tErr } = await tq;
    if (tErr) throw new Error(`cfb_teams query failed: ${tErr.message}`);
    const teamName = new Map<string, string>(); // cfb_team_id → CFBD location
    for (const t of teams ?? []) {
      const name = (t.location || t.display_name || "").trim();
      if (!name) continue;
      if (
        opts.team &&
        !name.toLowerCase().includes(opts.team.toLowerCase()) &&
        !(t.display_name || "").toLowerCase().includes(opts.team.toLowerCase())
      ) {
        continue;
      }
      teamName.set(String(t.espn_id), name);
    }

    // 2) Resolve each player → CFBD playerId via cfb_players (name within team).
    const { data: cfbPlayers, error: cErr } = await sb
      .from("cfb_players")
      .select("espn_id, display_name, cfb_team_id, first_season, last_season")
      .in("cfb_team_id", Array.from(teamName.keys()));
    if (cErr) throw new Error(`cfb_players query failed: ${cErr.message}`);

    // (cfb_team_id|lower name) → { espn_id, first, last }
    const roster = new Map<
      string,
      { espn_id: string; first: number | null; last: number | null }
    >();
    for (const cp of cfbPlayers ?? []) {
      const k = `${cp.cfb_team_id}|${(cp.display_name || "").trim().toLowerCase()}`;
      roster.set(k, {
        espn_id: String(cp.espn_id),
        first: cp.first_season ?? null,
        last: cp.last_season ?? null,
      });
    }

    const espnToPlayer = new Map<string, string>(); // CFBD playerId → our player id
    const teamSeasons = new Map<string, Set<number>>(); // team location → seasons to pull
    const currentYear = new Date().getFullYear();

    for (const p of players as any[]) {
      const tName = teamName.get(String(p.cfb_team_id));
      if (!tName) continue;
      const nm = (p.full_name || p.name || "").trim().toLowerCase();
      const match = roster.get(`${p.cfb_team_id}|${nm}`);
      if (!match) continue;
      espnToPlayer.set(match.espn_id, String(p.id));

      const from = Math.max(opts.fromSeason ?? match.first ?? EARLIEST_SEASON, EARLIEST_SEASON);
      const to = Math.min(opts.toSeason ?? match.last ?? currentYear, currentYear);
      const set = teamSeasons.get(tName) ?? new Set<number>();
      for (let y = from; y <= to; y++) set.add(y);
      teamSeasons.set(tName, set);
    }

    if (espnToPlayer.size === 0) return ok0(start);

    // 3) Pull (team, season) season stats; fold matching rows.
    const acc = new Map<string, SeasonAcc>(); // `${espn}|${season}`
    let apiCalls = 0;
    let lastReq = 0;

    for (const [tName, seasons] of teamSeasons) {
      for (const season of seasons) {
        const elapsed = Date.now() - lastReq;
        if (elapsed < REQUEST_INTERVAL_MS) {
          await new Promise((r) => setTimeout(r, REQUEST_INTERVAL_MS - elapsed));
        }
        lastReq = Date.now();
        apiCalls++;

        const rows = await fetchSeasonStats(apiKey, tName, season);
        for (const row of rows) {
          const pid = espnToPlayer.get(String(row.playerId));
          if (!pid) continue;
          const target = STAT_MAP[`${row.category}|${row.statType}`];
          if (!target) continue;
          const val = Number(row.stat);
          if (!Number.isFinite(val)) continue;

          const key = `${row.playerId}|${season}`;
          let a = acc.get(key);
          if (!a) {
            a = { player_id: pid, season, team: row.team ?? null, stats: {} };
            acc.set(key, a);
          }
          if (target.peak) {
            a.stats[target.key] = Math.max(a.stats[target.key] ?? 0, val);
          } else {
            a.stats[target.key] = (a.stats[target.key] ?? 0) + val;
          }
        }
      }
    }

    // 4) Finalise + upsert.
    const upsertRows = Array.from(acc.values()).map((a) => {
      if (a.stats.rush_yards != null || a.stats.rec_yards != null) {
        a.stats.scrimmage_yards = (a.stats.rush_yards || 0) + (a.stats.rec_yards || 0);
      }
      return {
        player_id: a.player_id,
        source: "cfbverse",
        level: "college",
        season: a.season,
        season_type: "REG",
        team: a.team,
        stats: a.stats,
        last_synced_at: new Date().toISOString(),
      };
    });

    let upserted = 0;
    for (let i = 0; i < upsertRows.length; i += UPSERT_BATCH_SIZE) {
      const batch = upsertRows.slice(i, i + UPSERT_BATCH_SIZE);
      const { error } = await sb
        .from("player_season_stats")
        .upsert(batch, { onConflict: "player_id,source,season,season_type" });
      if (error) {
        return {
          ok: false,
          players_matched: espnToPlayer.size,
          api_calls: apiCalls,
          rows_total: upsertRows.length,
          rows_upserted: upserted,
          duration_ms: Date.now() - start,
          error: `upsert failed: ${error.message}`,
        };
      }
      upserted += batch.length;
    }

    return {
      ok: true,
      players_matched: espnToPlayer.size,
      api_calls: apiCalls,
      rows_total: upsertRows.length,
      rows_upserted: upserted,
      duration_ms: Date.now() - start,
    };
  } catch (e) {
    return blank(start, e instanceof Error ? e.message : String(e));
  }
}

async function fetchSeasonStats(
  apiKey: string,
  team: string,
  year: number,
): Promise<CfbdSeasonStatRow[]> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  try {
    const url =
      `${CFBD_BASE}/stats/player/season` +
      `?team=${encodeURIComponent(team)}&year=${year}`;
    const res = await fetch(url, {
      signal: ctl.signal,
      headers: { Authorization: `Bearer ${apiKey}`, "User-Agent": "BLTZ-OnboardBot/1.0" },
    });
    if (!res.ok) {
      console.warn(`cfbd /stats/player/season ${team} ${year} -> ${res.status}`);
      return [];
    }
    return (await res.json()) as CfbdSeasonStatRow[];
  } catch (e) {
    console.warn(`cfbd /stats/player/season ${team} ${year} fetch failed`, e);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function blank(start: number, error: string): SyncCfbStatsResult {
  return {
    ok: false,
    players_matched: 0,
    api_calls: 0,
    rows_total: 0,
    rows_upserted: 0,
    duration_ms: Date.now() - start,
    error,
  };
}
function ok0(start: number): SyncCfbStatsResult {
  return {
    ok: true,
    players_matched: 0,
    api_calls: 0,
    rows_total: 0,
    rows_upserted: 0,
    duration_ms: Date.now() - start,
  };
}
