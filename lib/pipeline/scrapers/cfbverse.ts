import type { PlayerIdentityInput, ScraperResult } from "../types";

/**
 * cfbverse scraper.
 *
 * Queries the locally-cached `cfb_players` table (synced from
 * CollegeFootballData.com /roster via lib/pipeline/cfbverse/sync_players.ts).
 * Same architectural posture as scrapeNflverse: REST against PostgREST so
 * the function works on any Node runtime without WebSocket polyfills, and
 * tests can mock `globalThis.fetch` like the other scrapers.
 *
 * Coverage is anchored on D1 college rosters back to ~2005 (full bio
 * fields from 2010+, sparser before that). The cache's primary value is
 * resolving any historical college player's name to their ESPN athlete
 * ID — which the structured ESPN scraper can then fetch rich bio data
 * for. So even when this scraper returns a sparse fact set, the ESPN
 * scraper will fill the gaps using the same espn_id key.
 */

interface CfbPlayerRow {
  espn_id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
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
}

const SELECT_COLS =
  "espn_id,display_name,first_name,last_name,jersey,position,height_in," +
  "weight_lbs,home_city,home_state,home_country,team,cfb_team_id," +
  "first_season,last_season";

const CFBD_SOURCE_URL = "https://collegefootballdata.com";

export async function scrapeCfbverse(
  identity: PlayerIdentityInput,
): Promise<ScraperResult> {
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl || !sbKey) {
    return { source: "cfbverse", ok: false, reason: "not_found" };
  }

  const name = identity.full_name.trim();
  if (!name) return { source: "cfbverse", ok: false, reason: "not_found" };

  try {
    const candidates = await queryByName(sbUrl, sbKey, name);
    if (candidates.length === 0) {
      return { source: "cfbverse", ok: false, reason: "not_found" };
    }

    const match = pickMatch(candidates, identity);
    if (!match) {
      return { source: "cfbverse", ok: false, reason: "ambiguous" };
    }

    return toResult(match);
  } catch {
    return { source: "cfbverse", ok: false, reason: "network" };
  }
}

async function queryByName(
  sbUrl: string,
  sbKey: string,
  name: string,
): Promise<CfbPlayerRow[]> {
  const url =
    `${sbUrl}/rest/v1/cfb_players` +
    `?select=${SELECT_COLS}` +
    `&display_name=ilike.${encodeURIComponent(name)}` +
    `&limit=10`;

  const res = await fetch(url, {
    headers: {
      apikey: sbKey,
      Authorization: `Bearer ${sbKey}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`cfbverse query ${res.status}`);
  return (await res.json()) as CfbPlayerRow[];
}

function pickMatch(
  rows: CfbPlayerRow[],
  identity: PlayerIdentityInput,
): CfbPlayerRow | null {
  if (rows.length === 1) return rows[0];

  // Strongest disambiguator: the user already picked their school from
  // the logo-rich autocomplete, which gives us cfb_team_id directly.
  if (identity.cfb_team_id) {
    const exact = rows.filter((r) => r.cfb_team_id === identity.cfb_team_id);
    if (exact.length === 1) return exact[0];
    if (exact.length > 1) rows = exact;
  }

  // Fallback: substring match on the user's free-typed school against
  // the cached team string (CFBD's bare school name).
  const school = identity.school?.trim().toLowerCase();
  if (school) {
    const hits = rows.filter((r) =>
      (r.team ?? "").toLowerCase().includes(school),
    );
    if (hits.length === 1) return hits[0];
    if (hits.length > 1) rows = hits;
  }

  // Last resort: position. Rare that this disambiguates but cheap to try.
  const position = identity.position?.trim().toUpperCase();
  if (position) {
    const hits = rows.filter(
      (r) => (r.position ?? "").toUpperCase() === position,
    );
    if (hits.length === 1) return hits[0];
  }

  return null;
}

function toResult(row: CfbPlayerRow): ScraperResult {
  const facts: NonNullable<ScraperResult["facts"]> = {};

  facts.full_name = row.display_name;
  if (row.position) facts.position = row.position;
  if (row.height_in !== null) facts.height_in = row.height_in;
  if (row.weight_lbs !== null) facts.weight_lbs = row.weight_lbs;
  if (row.team) facts.school = row.team;
  if (row.home_city && row.home_state) {
    facts.hometown = `${row.home_city}, ${row.home_state}`;
  }

  // Provenance: ESPN profile (we know the integer ID matches their
  // athlete ID system, so this URL is reliably valid) + the upstream
  // CFBD source for transparency.
  const urls: string[] = [
    `https://www.espn.com/college-football/player/_/id/${row.espn_id}`,
    CFBD_SOURCE_URL,
  ];

  return {
    source: "cfbverse",
    ok: true,
    facts,
    urls,
  };
}
