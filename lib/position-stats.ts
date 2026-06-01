/**
 * Position-driven stat configuration + aggregation.
 *
 * Implements docs/planning/position-stats.md: each position has 3 "hero" stats
 * (the big gold callouts on the locker) and a fuller set for the season-by-season
 * modal. Raw season rows come from `player_season_stats` (stats stored as a
 * normalised jsonb map); this module turns them into career totals / peaks /
 * rates and into the table rows the modal renders.
 *
 * Canonical stat keys (produced by the sync jobs, consumed here):
 *   Offense: pass_yards pass_tds pass_int completions attempts rush_yards
 *            rush_tds carries receptions rec_yards rec_tds targets
 *            scrimmage_yards games
 *   Defense: tackles tackles_solo sacks tfl qb_hits interceptions pass_defended
 *            forced_fumbles fumble_rec def_tds int_tds
 *   Kicking: fg_made fg_att long_fg xp_made xp_att points
 */

export type StatMode = "total" | "peak" | "rate" | "count";
export type StatFormat = "integer" | "decimal1" | "percent";

export interface StatDef {
  key: string;
  label: string;
  mode: StatMode;
  format?: StatFormat;
}

export type PositionBucket =
  | "QB" | "RB" | "WR" | "TE" | "OL"
  | "DL" | "LB" | "CB" | "S"
  | "K" | "P" | "RET" | "LS";

export interface SeasonRow {
  season: number;
  season_type: string;
  team: string | null;
  level: "pro" | "college";
  stats: Record<string, number>;
}

/* ── Position buckets ──────────────────────────────────────────────────── */
// Map the many raw position strings (nflverse / CFBD / free text) onto our
// 13 stat buckets. Unknown → null (locker falls back to no stat spotlight).
const POSITION_ALIASES: Record<string, PositionBucket> = {
  QB: "QB",
  RB: "RB", HB: "RB", FB: "RB", TB: "RB",
  WR: "WR", SE: "WR", FL: "WR",
  TE: "TE",
  OL: "OL", C: "OL", G: "OL", OG: "OL", T: "OL", OT: "OL", LT: "OL", RT: "OL", LG: "OL", RG: "OL",
  DL: "DL", DE: "DL", DT: "DL", NT: "DL", EDGE: "DL",
  LB: "LB", OLB: "LB", ILB: "LB", MLB: "LB", WLB: "LB", SLB: "LB",
  CB: "CB", DB: "CB", NB: "CB",
  S: "S", FS: "S", SS: "S", SAF: "S",
  K: "K", PK: "K",
  P: "P",
  KR: "RET", PR: "RET", RET: "RET",
  LS: "LS",
};

export function normalizePosition(raw?: string | null): PositionBucket | null {
  if (!raw) return null;
  const key = raw.trim().toUpperCase();
  if (POSITION_ALIASES[key]) return POSITION_ALIASES[key];
  // Try the first token (e.g. "RB/KR" → "RB").
  const head = key.split(/[\s/\-]+/)[0];
  return POSITION_ALIASES[head] ?? null;
}

/* ── Hero (top-3) + full stat sets per bucket ──────────────────────────── */
const HERO: Record<PositionBucket, StatDef[]> = {
  QB: [
    { key: "pass_yards", label: "Passing Yards", mode: "total" },
    { key: "pass_tds", label: "Passing TDs", mode: "total" },
    { key: "completions", label: "Completions", mode: "total" },
  ],
  RB: [
    { key: "rush_yards", label: "Rushing Yards", mode: "total" },
    { key: "rush_tds", label: "Rushing TDs", mode: "total" },
    { key: "scrimmage_yards", label: "Yards from Scrimmage", mode: "total" },
  ],
  WR: [
    { key: "rec_yards", label: "Receiving Yards", mode: "total" },
    { key: "rec_tds", label: "Receiving TDs", mode: "total" },
    { key: "receptions", label: "Receptions", mode: "total" },
  ],
  TE: [
    { key: "rec_yards", label: "Receiving Yards", mode: "total" },
    { key: "rec_tds", label: "Receiving TDs", mode: "total" },
    { key: "receptions", label: "Receptions", mode: "total" },
  ],
  OL: [
    { key: "games", label: "Games Played", mode: "total" },
    { key: "rush_tds", label: "Rushing TDs Blocked For", mode: "total" },
    { key: "scrimmage_yards", label: "Scrimmage Yards", mode: "total" },
  ],
  DL: [
    { key: "sacks", label: "Sacks", mode: "total", format: "decimal1" },
    { key: "tfl", label: "Tackles for Loss", mode: "total", format: "decimal1" },
    { key: "forced_fumbles", label: "Forced Fumbles", mode: "total" },
  ],
  LB: [
    { key: "tackles", label: "Tackles", mode: "total" },
    { key: "sacks", label: "Sacks", mode: "total", format: "decimal1" },
    { key: "tfl", label: "Tackles for Loss", mode: "total", format: "decimal1" },
  ],
  CB: [
    { key: "interceptions", label: "Interceptions", mode: "total" },
    { key: "pass_defended", label: "Pass Deflections", mode: "total" },
    { key: "def_tds", label: "Defensive TDs", mode: "total" },
  ],
  S: [
    { key: "tackles", label: "Tackles", mode: "total" },
    { key: "interceptions", label: "Interceptions", mode: "total" },
    { key: "forced_fumbles", label: "Forced Fumbles", mode: "total" },
  ],
  K: [
    { key: "fg_pct", label: "FG %", mode: "rate", format: "percent" },
    { key: "long_fg", label: "Long FG", mode: "peak" },
    { key: "fg_made", label: "Career FG Made", mode: "total" },
  ],
  P: [
    { key: "punt_avg", label: "Avg / Punt", mode: "rate", format: "decimal1" },
    { key: "punt_long", label: "Long Punt", mode: "peak" },
    { key: "punts", label: "Punts", mode: "total" },
  ],
  RET: [
    { key: "return_tds", label: "Return TDs", mode: "total" },
    { key: "return_yards", label: "Return Yards", mode: "total" },
    { key: "ypr", label: "Yards / Return", mode: "rate", format: "decimal1" },
  ],
  LS: [
    { key: "games", label: "Games Played", mode: "total" },
    { key: "seasons", label: "Seasons", mode: "count" },
    { key: "snaps", label: "Snaps", mode: "total" },
  ],
};

// Columns shown in the season-by-season modal table per bucket.
const TABLE_COLS: Record<PositionBucket, StatDef[]> = {
  QB: [
    { key: "attempts", label: "Att", mode: "total" },
    { key: "completions", label: "Comp", mode: "total" },
    { key: "pass_yards", label: "Yds", mode: "total" },
    { key: "pass_tds", label: "TD", mode: "total" },
    { key: "pass_int", label: "INT", mode: "total" },
  ],
  RB: [
    { key: "carries", label: "Att", mode: "total" },
    { key: "rush_yards", label: "Yds", mode: "total" },
    { key: "rush_tds", label: "TD", mode: "total" },
    { key: "receptions", label: "Rec", mode: "total" },
    { key: "rec_yards", label: "RecYds", mode: "total" },
  ],
  WR: [
    { key: "receptions", label: "Rec", mode: "total" },
    { key: "rec_yards", label: "Yds", mode: "total" },
    { key: "rec_tds", label: "TD", mode: "total" },
    { key: "targets", label: "Tgt", mode: "total" },
  ],
  TE: [
    { key: "receptions", label: "Rec", mode: "total" },
    { key: "rec_yards", label: "Yds", mode: "total" },
    { key: "rec_tds", label: "TD", mode: "total" },
    { key: "targets", label: "Tgt", mode: "total" },
  ],
  OL: [
    { key: "games", label: "G", mode: "total" },
  ],
  DL: [
    { key: "tackles", label: "Tkl", mode: "total" },
    { key: "sacks", label: "Sacks", mode: "total" },
    { key: "tfl", label: "TFL", mode: "total" },
    { key: "forced_fumbles", label: "FF", mode: "total" },
  ],
  LB: [
    { key: "tackles", label: "Tkl", mode: "total" },
    { key: "sacks", label: "Sacks", mode: "total" },
    { key: "tfl", label: "TFL", mode: "total" },
    { key: "interceptions", label: "INT", mode: "total" },
  ],
  CB: [
    { key: "tackles", label: "Tkl", mode: "total" },
    { key: "interceptions", label: "INT", mode: "total" },
    { key: "pass_defended", label: "PD", mode: "total" },
    { key: "def_tds", label: "TD", mode: "total" },
  ],
  S: [
    { key: "tackles", label: "Tkl", mode: "total" },
    { key: "interceptions", label: "INT", mode: "total" },
    { key: "pass_defended", label: "PD", mode: "total" },
    { key: "forced_fumbles", label: "FF", mode: "total" },
  ],
  K: [
    { key: "fg_made", label: "FGM", mode: "total" },
    { key: "fg_att", label: "FGA", mode: "total" },
    { key: "long_fg", label: "Long", mode: "peak" },
    { key: "points", label: "Pts", mode: "total" },
  ],
  P: [
    { key: "punts", label: "Punts", mode: "total" },
    { key: "punt_yards", label: "Yds", mode: "total" },
    { key: "punt_long", label: "Long", mode: "peak" },
  ],
  RET: [
    { key: "returns", label: "Ret", mode: "total" },
    { key: "return_yards", label: "Yds", mode: "total" },
    { key: "return_tds", label: "TD", mode: "total" },
  ],
  LS: [{ key: "games", label: "G", mode: "total" }],
};

/* ── Aggregation ───────────────────────────────────────────────────────── */
// Rate stats are recomputed from their components across the whole span rather
// than averaging per-season rates (which would be wrong). Anything not listed
// falls back to a games-weighted mean of the per-season values.
const RATE_COMPONENTS: Record<string, [string, string, number]> = {
  // key: [numeratorKey, denominatorKey, multiplier]
  fg_pct: ["fg_made", "fg_att", 100],
  comp_pct: ["completions", "attempts", 100],
  ypc: ["rush_yards", "carries", 1],
  ypr: ["return_yards", "returns", 1],
  punt_avg: ["punt_yards", "punts", 1],
  rec_ypr: ["rec_yards", "receptions", 1],
};

function sumKey(rows: SeasonRow[], key: string): number {
  return rows.reduce((acc, r) => acc + (Number(r.stats[key]) || 0), 0);
}

export function aggregate(rows: SeasonRow[], def: StatDef): number | null {
  if (rows.length === 0) return null;
  if (def.mode === "total") {
    const present = rows.some((r) => r.stats[def.key] != null);
    return present ? sumKey(rows, def.key) : null;
  }
  if (def.mode === "peak") {
    const vals = rows.map((r) => Number(r.stats[def.key])).filter((n) => Number.isFinite(n));
    return vals.length ? Math.max(...vals) : null;
  }
  if (def.mode === "count") {
    if (def.key === "seasons") return new Set(rows.map((r) => r.season)).size;
    // count of seasons in which the stat was non-zero
    return rows.filter((r) => Number(r.stats[def.key]) > 0).length || null;
  }
  // rate
  const comp = RATE_COMPONENTS[def.key];
  if (comp) {
    const [num, den, mult] = comp;
    const d = sumKey(rows, den);
    if (!d) return null;
    return (sumKey(rows, num) / d) * mult;
  }
  const vals = rows.map((r) => Number(r.stats[def.key])).filter((n) => Number.isFinite(n));
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function formatStat(value: number | null, format: StatFormat = "integer"): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (format === "percent") return `${value.toFixed(1)}%`;
  if (format === "decimal1") return value.toFixed(1);
  return Math.round(value).toLocaleString("en-US");
}

export interface HeroStat {
  key: string;
  label: string;
  value: number | null;
  display: string;
}

/**
 * The 3 hero stats for a player, computed from their REG-season rows for the
 * given level. Returns null when the position is unknown or none of the hero
 * stats have any backing data (so the locker can hide the spotlight cleanly).
 */
export function heroStats(
  position: string | null | undefined,
  rows: SeasonRow[],
): HeroStat[] | null {
  const bucket = normalizePosition(position);
  if (!bucket) return null;
  const defs = HERO[bucket];
  const reg = rows.filter((r) => r.season_type === "REG" || r.season_type === "ALL");
  const used = reg.length ? reg : rows;
  const out = defs.map((d) => {
    const value = aggregate(used, d);
    return { key: d.key, label: d.label, value, display: formatStat(value, d.format) };
  });
  return out.some((h) => h.value != null) ? out : null;
}

export interface SeasonTableRow {
  season: number;
  team: string | null;
  cells: string[];
  isPeak: boolean;
}

export interface SeasonTable {
  columns: string[];
  rows: SeasonTableRow[];
  totals: string[];
}

/**
 * Builds the season-by-season table (+ a totals row) for the full-stats modal.
 * The "peak" season is the one with the highest value in the first counting
 * column (yards/tackles/etc.) — the row the modal highlights in gold.
 */
export function seasonTable(
  position: string | null | undefined,
  rows: SeasonRow[],
): SeasonTable | null {
  const bucket = normalizePosition(position);
  if (!bucket) return null;
  const cols = TABLE_COLS[bucket];
  if (!cols.length) return null;

  const reg = rows
    .filter((r) => r.season_type === "REG" || r.season_type === "ALL")
    .sort((a, b) => a.season - b.season);
  if (!reg.length) return null;

  const peakKey = cols[bucket === "QB" ? 2 : 1]?.key ?? cols[0].key;
  let peakVal = -Infinity;
  for (const r of reg) {
    const v = Number(r.stats[peakKey]) || 0;
    if (v > peakVal) peakVal = v;
  }

  const tableRows: SeasonTableRow[] = reg.map((r) => ({
    season: r.season,
    team: r.team,
    cells: cols.map((c) => formatStat(Number(r.stats[c.key]) ?? null, c.format)),
    isPeak: (Number(r.stats[peakKey]) || 0) === peakVal && peakVal > 0,
  }));

  const totals = cols.map((c) => formatStat(aggregate(reg, c), c.format));

  return { columns: cols.map((c) => c.label), rows: tableRows, totals };
}
