import { gunzipSync } from "node:zlib";

import { createServiceClient } from "@/lib/supabase/service";
import { parseCsv } from "./sync";

/**
 * NFL season-stats sync.
 *
 * Pulls the nflverse `player_stats` release (weekly offense + defense + kicking
 * lines, 1999→present), keeps only the rows whose `player_id` (gsis_id) matches
 * a BLTZ player we already store, aggregates weekly → season totals, and upserts
 * one row per (player, season, season_type) into `player_season_stats`.
 *
 * Join key: players.gsis_id  ←→  nflverse player_stats.player_id.
 * Idempotent: re-running upserts in place by (player_id, source, season, type).
 *
 * Source: https://github.com/nflverse/nflverse-data/releases/tag/player_stats
 * Trigger: app/api/dev/nflverse-stats-sync.
 */

const BASE =
  "https://github.com/nflverse/nflverse-data/releases/download/player_stats";
const FILES = {
  offense: `${BASE}/player_stats.csv.gz`,
  defense: `${BASE}/player_stats_def.csv.gz`,
  kicking: `${BASE}/player_stats_kicking.csv.gz`,
};

const FETCH_TIMEOUT_MS = 120_000;
const UPSERT_BATCH_SIZE = 500;

// nflverse column → our canonical key. `peak: true` means the season value is
// the MAX across weeks (e.g. longest FG), not the sum.
interface ColMap {
  col: string;
  key: string;
  peak?: boolean;
}
const OFFENSE_COLS: ColMap[] = [
  { col: "completions", key: "completions" },
  { col: "attempts", key: "attempts" },
  { col: "passing_yards", key: "pass_yards" },
  { col: "passing_tds", key: "pass_tds" },
  { col: "interceptions", key: "pass_int" },
  { col: "sacks", key: "sacks_taken" },
  { col: "carries", key: "carries" },
  { col: "rushing_yards", key: "rush_yards" },
  { col: "rushing_tds", key: "rush_tds" },
  { col: "receptions", key: "receptions" },
  { col: "targets", key: "targets" },
  { col: "receiving_yards", key: "rec_yards" },
  { col: "receiving_tds", key: "rec_tds" },
];
const DEFENSE_COLS: ColMap[] = [
  { col: "def_tackles", key: "tackles" },
  { col: "def_tackles_solo", key: "tackles_solo" },
  { col: "def_sacks", key: "sacks" },
  { col: "def_tackles_for_loss", key: "tfl" },
  { col: "def_qb_hits", key: "qb_hits" },
  { col: "def_interceptions", key: "interceptions" },
  { col: "def_pass_defended", key: "pass_defended" },
  { col: "def_fumbles_forced", key: "forced_fumbles" },
  { col: "def_tds", key: "def_tds" },
];
const KICKING_COLS: ColMap[] = [
  { col: "fg_made", key: "fg_made" },
  { col: "fg_att", key: "fg_att" },
  { col: "fg_long", key: "long_fg", peak: true },
  { col: "pat_made", key: "xp_made" },
  { col: "pat_att", key: "xp_att" },
];

export interface NflStatsSyncResult {
  ok: boolean;
  players_matched: number;
  rows_total: number;
  rows_upserted: number;
  files_loaded: string[];
  duration_ms: number;
  error?: string;
}

interface SeasonAcc {
  season: number;
  season_type: string;
  team: string | null;
  weeks: Set<number>;
  stats: Record<string, number>;
}

export async function syncNflverseStats(): Promise<NflStatsSyncResult> {
  const start = Date.now();
  const filesLoaded: string[] = [];
  try {
    const sb = createServiceClient();

    // 1) Which gsis_ids do we actually care about? Map them to our player ids.
    const gsisToPlayer = new Map<string, string>();
    const { data: players, error: pErr } = await sb
      .from("players")
      .select("id, gsis_id")
      .not("gsis_id", "is", null);
    if (pErr) throw new Error(`players query failed: ${pErr.message}`);
    for (const p of players ?? []) {
      if (p.gsis_id) gsisToPlayer.set(String(p.gsis_id), String(p.id));
    }
    if (gsisToPlayer.size === 0) {
      return {
        ok: true,
        players_matched: 0,
        rows_total: 0,
        rows_upserted: 0,
        files_loaded: filesLoaded,
        duration_ms: Date.now() - start,
      };
    }

    // 2) Pull each stat file and fold its weekly rows into season accumulators,
    //    keyed by `${gsis}|${season}|${season_type}`.
    const acc = new Map<string, SeasonAcc>();
    const matchedGsis = new Set<string>();

    for (const [name, url] of Object.entries(FILES)) {
      const csv = await fetchCsvGz(url).catch((e) => {
        console.warn(`nflverse stats: ${name} fetch failed`, e);
        return null;
      });
      if (csv == null) continue;
      filesLoaded.push(name);
      const cols =
        name === "offense" ? OFFENSE_COLS : name === "defense" ? DEFENSE_COLS : KICKING_COLS;
      foldFile(csv, cols, gsisToPlayer, acc, matchedGsis);
    }

    // 3) Finalise derived stats and build upsert rows.
    const rows = Array.from(acc.entries()).map(([key, a]) => {
      const gsis = key.split("|")[0];
      const stats = a.stats;
      stats.games = a.weeks.size;
      if (stats.rush_yards != null || stats.rec_yards != null) {
        stats.scrimmage_yards = (stats.rush_yards || 0) + (stats.rec_yards || 0);
      }
      return {
        player_id: gsisToPlayer.get(gsis)!,
        source: "nflverse",
        level: "pro",
        season: a.season,
        season_type: a.season_type,
        team: a.team,
        stats,
        last_synced_at: new Date().toISOString(),
      };
    });

    // 4) Upsert.
    let upserted = 0;
    for (let i = 0; i < rows.length; i += UPSERT_BATCH_SIZE) {
      const batch = rows.slice(i, i + UPSERT_BATCH_SIZE);
      const { error } = await sb
        .from("player_season_stats")
        .upsert(batch, { onConflict: "player_id,source,season,season_type" });
      if (error) {
        return {
          ok: false,
          players_matched: matchedGsis.size,
          rows_total: rows.length,
          rows_upserted: upserted,
          files_loaded: filesLoaded,
          duration_ms: Date.now() - start,
          error: `upsert failed: ${error.message}`,
        };
      }
      upserted += batch.length;
    }

    return {
      ok: true,
      players_matched: matchedGsis.size,
      rows_total: rows.length,
      rows_upserted: upserted,
      files_loaded: filesLoaded,
      duration_ms: Date.now() - start,
    };
  } catch (e) {
    return {
      ok: false,
      players_matched: 0,
      rows_total: 0,
      rows_upserted: 0,
      files_loaded: filesLoaded,
      duration_ms: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function foldFile(
  csv: string,
  cols: ColMap[],
  gsisToPlayer: Map<string, string>,
  acc: Map<string, SeasonAcc>,
  matchedGsis: Set<string>,
) {
  const records = parseCsv(csv);
  if (records.length === 0) return;
  const [header, ...rows] = records;
  const at = (name: string) => header.indexOf(name);

  const idPlayer = at("player_id");
  const idSeason = at("season");
  const idWeek = at("week");
  const idType = at("season_type");
  const idTeam = at("recent_team") >= 0 ? at("recent_team") : at("team");
  if (idPlayer < 0 || idSeason < 0) return;

  const colIdx = cols
    .map((c) => ({ ...c, i: at(c.col) }))
    .filter((c) => c.i >= 0);

  for (const r of rows) {
    if (r.length <= idPlayer) continue;
    const gsis = (r[idPlayer] ?? "").trim();
    if (!gsis || !gsisToPlayer.has(gsis)) continue;
    matchedGsis.add(gsis);

    const season = toNum(r[idSeason]);
    if (season == null) continue;
    const seasonType = (idType >= 0 ? r[idType]?.trim() : "") || "REG";
    const week = idWeek >= 0 ? toNum(r[idWeek]) : null;
    const team = idTeam >= 0 ? r[idTeam]?.trim() || null : null;

    const key = `${gsis}|${season}|${seasonType}`;
    let a = acc.get(key);
    if (!a) {
      a = { season, season_type: seasonType, team, weeks: new Set(), stats: {} };
      acc.set(key, a);
    }
    if (team) a.team = team;
    if (week != null) a.weeks.add(week);

    for (const c of colIdx) {
      const val = toNum(r[c.i]);
      if (val == null) continue;
      if (c.peak) {
        a.stats[c.key] = Math.max(a.stats[c.key] ?? 0, val);
      } else {
        a.stats[c.key] = (a.stats[c.key] ?? 0) + val;
      }
    }
  }
}

async function fetchCsvGz(url: string): Promise<string> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    return gunzipSync(buf).toString("utf-8");
  } finally {
    clearTimeout(t);
  }
}

function toNum(v: string | undefined): number | null {
  if (v === undefined) return null;
  const s = v.trim();
  if (s === "" || s === "NA") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
