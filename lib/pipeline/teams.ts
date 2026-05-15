/**
 * NFL team name canonicalization.
 *
 * Different scrapers report the same team in different shapes:
 *   - nflverse (the official NFL roster cache) returns short codes:
 *     "SF", "MIN", "KC", "WAS"
 *   - Wikipedia narrates with full names: "San Francisco 49ers",
 *     "Minnesota Vikings"
 *   - ESPN uses display names that mostly match Wikipedia
 *
 * Without normalization, a player who appears in both sources ends up
 * with duplicate entries in `pro_teams` (e.g. `["SF", "San Francisco
 * 49ers"]`). This module folds every short code into its current full
 * name so the dedupe pass actually catches it.
 *
 * Historical franchises (Oakland Raiders → Las Vegas Raiders, St. Louis
 * Rams → Los Angeles Rams, etc.) are intentionally kept distinct here:
 * if a player's career spanned the rebrand, both stints belong on the
 * locker page. We only map the short code to the matching-era full name.
 */

const NFL_CODE_TO_FULL_NAME: Record<string, string> = {
  ARI: "Arizona Cardinals",
  ATL: "Atlanta Falcons",
  BAL: "Baltimore Ravens",
  BUF: "Buffalo Bills",
  CAR: "Carolina Panthers",
  CHI: "Chicago Bears",
  CIN: "Cincinnati Bengals",
  CLE: "Cleveland Browns",
  DAL: "Dallas Cowboys",
  DEN: "Denver Broncos",
  DET: "Detroit Lions",
  GB: "Green Bay Packers",
  HOU: "Houston Texans",
  IND: "Indianapolis Colts",
  JAC: "Jacksonville Jaguars",
  JAX: "Jacksonville Jaguars",
  KC: "Kansas City Chiefs",
  LA: "Los Angeles Rams",
  LAC: "Los Angeles Chargers",
  LAR: "Los Angeles Rams",
  LV: "Las Vegas Raiders",
  LVR: "Las Vegas Raiders",
  MIA: "Miami Dolphins",
  MIN: "Minnesota Vikings",
  NE: "New England Patriots",
  NO: "New Orleans Saints",
  NYG: "New York Giants",
  NYJ: "New York Jets",
  OAK: "Oakland Raiders",
  PHI: "Philadelphia Eagles",
  PIT: "Pittsburgh Steelers",
  SD: "San Diego Chargers",
  SEA: "Seattle Seahawks",
  SF: "San Francisco 49ers",
  STL: "St. Louis Rams",
  TB: "Tampa Bay Buccaneers",
  TEN: "Tennessee Titans",
  WAS: "Washington Commanders",
  WSH: "Washington Commanders",
};

/**
 * Map a scraper-reported team name to the canonical full team name.
 * Pass-through for anything that doesn't look like an NFL short code so
 * we don't accidentally rewrite college team names or partial strings.
 */
export function canonicalizeTeam(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  // Short codes are 2-4 uppercase letters (LAC, NYG, KC, JAX). Anything
  // longer or mixed-case is already a full name — leave it alone.
  if (/^[A-Z]{2,4}$/.test(trimmed)) {
    return NFL_CODE_TO_FULL_NAME[trimmed] ?? trimmed;
  }
  return trimmed;
}

/**
 * Canonicalize a list and dedupe while preserving insertion order. The
 * orchestrator feeds nflverse facts first, so the natural ordering is
 * "most authoritative → narrative fill-in", which we keep.
 */
export function canonicalizeTeams(teams: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of teams) {
    const c = canonicalizeTeam(t);
    if (!c) continue;
    if (seen.has(c)) continue;
    seen.add(c);
    out.push(c);
  }
  return out;
}

/**
 * All canonical NFL full names (current + historical). Used by prose
 * scrapers to validate "is this string actually an NFL team" before
 * accepting it as a pro team — keeps opponents, colleges, and incidental
 * city names from sneaking into `pro_teams`.
 *
 * Sorted longest-first so a prefix-match against article text picks the
 * most specific team. ("Los Angeles Chargers" before "Los Angeles Rams"
 * doesn't matter here, but the principle generalizes if we add codes
 * with overlapping prefixes later.)
 */
export const NFL_FULL_NAMES: readonly string[] = Array.from(
  new Set(Object.values(NFL_CODE_TO_FULL_NAME)),
).sort((a, b) => b.length - a.length);
