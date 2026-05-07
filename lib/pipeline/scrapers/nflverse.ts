import type { PlayerIdentityInput, ScraperResult } from "../types";

/**
 * nflverse scraper.
 *
 * Queries the locally-cached `nfl_players` table (synced from
 * https://github.com/nflverse/nflverse-data/releases/tag/players) via
 * Supabase's PostgREST endpoint. We hit REST directly rather than
 * importing the JS client so this scraper is consistent with the others
 * (all of which mock `globalThis.fetch` in tests) and so it works on any
 * Node runtime without WebSocket polyfills.
 *
 * Coverage: NFL + major-college (combine/draft) only. High-school and
 * non-FBS college players will miss here and fall back to Wikipedia/ESPN.
 */

interface NflPlayerRow {
  gsis_id: string;
  display_name: string;
  birth_date: string | null;
  position: string | null;
  position_group: string | null;
  height_in: number | null;
  weight_lbs: number | null;
  headshot_url: string | null;
  college_name: string | null;
  latest_team: string | null;
  espn_id: string | null;
  pfr_id: string | null;
}

const SELECT_COLS =
  "gsis_id,display_name,birth_date,position,position_group,height_in,weight_lbs,headshot_url,college_name,latest_team,espn_id,pfr_id";

const NFLVERSE_SOURCE_URL =
  "https://github.com/nflverse/nflverse-data/releases/tag/players";

export async function scrapeNflverse(
  identity: PlayerIdentityInput,
): Promise<ScraperResult> {
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl || !sbKey) {
    return { source: "nflverse", ok: false, reason: "not_found" };
  }

  const name = identity.full_name.trim();
  if (!name) return { source: "nflverse", ok: false, reason: "not_found" };

  try {
    const candidates = await queryByName(sbUrl, sbKey, name);
    if (candidates.length === 0) {
      return { source: "nflverse", ok: false, reason: "not_found" };
    }

    const match = pickMatch(candidates, identity);
    if (!match) {
      return { source: "nflverse", ok: false, reason: "ambiguous" };
    }

    return toResult(match);
  } catch {
    return { source: "nflverse", ok: false, reason: "network" };
  }
}

async function queryByName(
  sbUrl: string,
  sbKey: string,
  name: string,
): Promise<NflPlayerRow[]> {
  // ilike with no wildcards = case-insensitive equality. Caps at 5 rows so
  // a wildly common name doesn't blow up the response.
  const url =
    `${sbUrl}/rest/v1/nfl_players` +
    `?select=${SELECT_COLS}` +
    `&display_name=ilike.${encodeURIComponent(name)}` +
    `&limit=5`;

  const res = await fetch(url, {
    headers: {
      apikey: sbKey,
      Authorization: `Bearer ${sbKey}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`nflverse query ${res.status}`);
  return (await res.json()) as NflPlayerRow[];
}

function pickMatch(
  rows: NflPlayerRow[],
  identity: PlayerIdentityInput,
): NflPlayerRow | null {
  if (rows.length === 1) return rows[0];

  // Multiple players share this name. Disambiguate by college first, then
  // by position group. Two real-world examples we've already seen in the
  // synced data:
  //  - "Justin Jefferson" → Vikings WR (LSU) vs Browns LB (Alabama)
  //  - any common first/last name combination
  const school = identity.school?.trim().toLowerCase();
  if (school) {
    const collegeHits = rows.filter((r) =>
      (r.college_name ?? "").toLowerCase().includes(school),
    );
    if (collegeHits.length === 1) return collegeHits[0];
    if (collegeHits.length > 1) rows = collegeHits;
  }

  const position = identity.position?.trim().toUpperCase();
  if (position) {
    const positionHits = rows.filter(
      (r) =>
        (r.position ?? "").toUpperCase() === position ||
        (r.position_group ?? "").toUpperCase() === position,
    );
    if (positionHits.length === 1) return positionHits[0];
  }

  return null;
}

function toResult(row: NflPlayerRow): ScraperResult {
  const proTeams = row.latest_team ? [row.latest_team] : [];
  const photos = row.headshot_url
    ? [{ url: row.headshot_url, credits: "NFL via nflverse" }]
    : [];

  // Provenance URL: prefer the player's ESPN profile if we have the ID
  // (most stable, end-user clickable), otherwise the nflverse release.
  const espnUrl = row.espn_id
    ? `https://www.espn.com/nfl/player/_/id/${row.espn_id}`
    : null;
  const urls = [espnUrl, NFLVERSE_SOURCE_URL].filter(
    (u): u is string => typeof u === "string",
  );

  return {
    source: "nflverse",
    ok: true,
    facts: {
      full_name: row.display_name,
      dob: row.birth_date ?? undefined,
      position: row.position ?? undefined,
      height_in: row.height_in ?? undefined,
      weight_lbs: row.weight_lbs ?? undefined,
      school: row.college_name ?? undefined,
      pro_teams: proTeams,
      photos,
      gsis_id: row.gsis_id,
    },
    urls,
  };
}
