import type { PlayerIdentityInput, ScrapedAffiliation, ScraperResult } from "../types";
import { requireSourceAction } from "@/lib/source-policy/policy";
import { schoolsMatch } from "@/lib/player/school-identity";
import { matchSchoolBrand, type SchoolBrandRow } from "@/lib/preview-lockers/branding";

/**
 * College football player discovery.
 *
 * College Football Data's player-search endpoint is the primary source because
 * it returns ordered team stints for transfer athletes. The local cfb_players
 * cache remains the fallback for older or temporarily unavailable API records.
 * School names from either source are resolved through the local cfb_teams
 * directory so the preview builder receives the matching colors and logos.
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

interface PlayerSearchTeamStint {
  team: string;
  startYear?: number | null;
  endYear?: number | null;
}

interface PlayerSearchRow {
  id: string;
  name: string;
  team: string;
  position?: string | null;
  height?: number | null;
  weight?: number | null;
  hometown?: string | null;
  teamColor?: string | null;
  activeStartYear?: number | null;
  activeEndYear?: number | null;
  teamStints?: PlayerSearchTeamStint[] | null;
}

const SELECT_COLS =
  "espn_id,display_name,first_name,last_name,jersey,position,height_in," +
  "weight_lbs,home_city,home_state,home_country,team,cfb_team_id," +
  "first_season,last_season";
const DIRECTORY_COLS = "display_name,location,abbreviation,mascot,primary_color,logo_url,logo_dark_url";
const CFBD_SOURCE_URL = "https://collegefootballdata.com";
const CFBD_SEARCH_URL = "https://api.collegefootballdata.com/player/search";

export async function scrapeCfbverse(identity: PlayerIdentityInput): Promise<ScraperResult> {
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const apiKey = process.env.CFBD_API_KEY;
  const name = identity.full_name.trim();
  if (!name) return { source: "cfbverse", ok: false, reason: "no_match" };
  if (!apiKey && (!sbUrl || !sbKey)) return { source: "cfbverse", ok: false, reason: "unreachable" };

  try {
    let directFailure: ScraperResult["reason"] = "no_match";
    if (apiKey) {
      const search = await queryPlayerSearch(apiKey, name);
      if ("error" in search) directFailure = search.error;
      else {
        const match = pickDirectMatch(search.rows, identity);
        if (match) {
          const directory = sbUrl && sbKey ? await querySchoolDirectory(sbUrl, sbKey) : [];
          return toDirectResult(match, directory);
        }
        directFailure = search.rows.length ? "ambiguous" : "no_match";
      }
    }

    if (!sbUrl || !sbKey) return { source: "cfbverse", ok: false, reason: directFailure };
    const cached = await queryByName(sbUrl, sbKey, name);
    if ("error" in cached) return { source: "cfbverse", ok: false, reason: cached.error };
    if (!cached.rows.length) return { source: "cfbverse", ok: false, reason: directFailure };
    const match = pickCachedMatch(cached.rows, identity);
    if (!match) return { source: "cfbverse", ok: false, reason: "ambiguous" };
    return toCachedResult(match, await querySchoolDirectory(sbUrl, sbKey));
  } catch {
    return { source: "cfbverse", ok: false, reason: "unreachable" };
  }
}

async function queryPlayerSearch(
  apiKey: string,
  name: string,
): Promise<{ rows: PlayerSearchRow[] } | { error: ScraperResult["reason"] }> {
  const url = new URL(CFBD_SEARCH_URL);
  url.searchParams.set("searchTerm", name);
  requireSourceAction(url.toString(), "EXTRACT_FACTS");
  requireSourceAction(url.toString(), "PERSIST_FACTS");
  let response: Response;
  try {
    response = await fetch(url, {
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    });
  } catch {
    return { error: "unreachable" };
  }
  if (response.status === 429) return { error: "blocked" };
  if (!response.ok) return { error: "unreachable" };
  return { rows: (await response.json()) as PlayerSearchRow[] };
}

async function queryByName(
  sbUrl: string,
  sbKey: string,
  name: string,
): Promise<{ rows: CfbPlayerRow[] } | { error: ScraperResult["reason"] }> {
  requireSourceAction(CFBD_SOURCE_URL, "EXTRACT_FACTS");
  requireSourceAction(CFBD_SOURCE_URL, "PERSIST_FACTS");
  const url = `${sbUrl}/rest/v1/cfb_players?select=${SELECT_COLS}&display_name=ilike.${encodeURIComponent(name)}&limit=10`;
  let response: Response;
  try {
    response = await fetch(url, {
      redirect: "error", cache: "no-store", signal: AbortSignal.timeout(8000),
      headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}`, Accept: "application/json" },
    });
  } catch {
    return { error: "unreachable" };
  }
  if (response.status === 429) return { error: "blocked" };
  if (!response.ok) return { error: "unreachable" };
  return { rows: (await response.json()) as CfbPlayerRow[] };
}

async function querySchoolDirectory(sbUrl: string, sbKey: string): Promise<SchoolBrandRow[]> {
  try {
    const response = await fetch(`${sbUrl}/rest/v1/cfb_teams?select=${DIRECTORY_COLS}&limit=1000`, {
      redirect: "error", cache: "no-store", signal: AbortSignal.timeout(5000),
      headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}`, Accept: "application/json" },
    });
    return response.ok ? await response.json() as SchoolBrandRow[] : [];
  } catch {
    return [];
  }
}

function cleanName(value: string): string {
  return value.toLocaleLowerCase("en-US").replace(/\b(jr|sr|ii|iii|iv)\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function pickDirectMatch(rows: PlayerSearchRow[], identity: PlayerIdentityInput): PlayerSearchRow | null {
  let matches = rows.filter(row => cleanName(row.name) === cleanName(identity.full_name));
  if (!matches.length) return null;
  if (matches.length === 1) return matches[0];

  const school = identity.school?.trim();
  if (school) {
    const hits = matches.filter(row => [row.team, ...(row.teamStints ?? []).map(stint => stint.team)].some(team => schoolsMatch(school, team)));
    if (hits.length === 1) return hits[0];
    if (hits.length > 1) matches = hits;
  }
  const position = identity.position?.trim().toUpperCase();
  if (position) {
    const hits = matches.filter(row => row.position?.toUpperCase() === position);
    if (hits.length === 1) return hits[0];
    if (hits.length > 1) matches = hits;
  }
  const cohort = identity.cohort_year;
  if (cohort) {
    const hits = matches.filter(row => (row.activeStartYear ?? cohort) <= cohort && (row.activeEndYear ?? cohort) >= cohort);
    if (hits.length === 1) return hits[0];
  }
  return null;
}

function pickCachedMatch(rows: CfbPlayerRow[], identity: PlayerIdentityInput): CfbPlayerRow | null {
  if (rows.length === 1) return rows[0];
  if (identity.cfb_team_id) {
    const exact = rows.filter(row => row.cfb_team_id === identity.cfb_team_id);
    if (exact.length === 1) return exact[0];
    if (exact.length > 1) rows = exact;
  }
  const school = identity.school?.trim();
  if (school) {
    const hits = rows.filter(row => row.team && schoolsMatch(school, row.team));
    if (hits.length === 1) return hits[0];
    if (hits.length > 1) rows = hits;
  }
  const position = identity.position?.trim().toUpperCase();
  if (position) {
    const hits = rows.filter(row => row.position?.toUpperCase() === position);
    if (hits.length === 1) return hits[0];
  }
  return null;
}

function affiliation(team: string, directory: SchoolBrandRow[], fallbackColor?: string | null, years: Partial<PlayerSearchTeamStint> = {}): ScrapedAffiliation {
  const brand = matchSchoolBrand(team, directory);
  const color = brand?.primaryColor || (/^#[\da-f]{6}$/i.test(fallbackColor ?? "") ? fallbackColor! : "#1A3DCC");
  return {
    label: brand?.abbr || team,
    name: brand?.name || team,
    color,
    logo: brand?.logoUrl || null,
    ...(years.startYear ? { start_year: years.startYear } : {}),
    ...(years.endYear ? { end_year: years.endYear } : {}),
  };
}

function toDirectResult(row: PlayerSearchRow, directory: SchoolBrandRow[]): ScraperResult {
  const stints = row.teamStints?.length ? row.teamStints : [{ team: row.team, startYear: row.activeStartYear, endYear: row.activeEndYear }];
  const schools = stints.filter(stint => stint.team?.trim()).map(stint => affiliation(stint.team.trim(), directory, schoolsMatch(stint.team, row.team) ? row.teamColor : null, stint));
  return {
    source: "cfbverse",
    ok: true,
    facts: {
      full_name: row.name,
      position: row.position || undefined,
      height_in: typeof row.height === "number" ? Math.round(row.height) : undefined,
      weight_lbs: typeof row.weight === "number" ? Math.round(row.weight) : undefined,
      school: row.team || stints.at(-1)?.team,
      schools,
      hometown: row.hometown || undefined,
    },
    urls: [CFBD_SOURCE_URL],
    fact_source_urls: [CFBD_SEARCH_URL],
  };
}

function toCachedResult(row: CfbPlayerRow, directory: SchoolBrandRow[]): ScraperResult {
  const facts: NonNullable<ScraperResult["facts"]> = { full_name: row.display_name };
  if (row.position) facts.position = row.position;
  if (row.height_in !== null) facts.height_in = row.height_in;
  if (row.weight_lbs !== null) facts.weight_lbs = row.weight_lbs;
  if (row.team) {
    facts.school = row.team;
    facts.schools = [affiliation(row.team, directory, null, { startYear: row.first_season, endYear: row.last_season })];
  }
  if (row.home_city && row.home_state) facts.hometown = `${row.home_city}, ${row.home_state}`;
  return {
    source: "cfbverse",
    ok: true,
    facts,
    urls: [`https://www.espn.com/college-football/player/_/id/${row.espn_id}`, CFBD_SOURCE_URL],
    fact_source_urls: [CFBD_SOURCE_URL],
  };
}
