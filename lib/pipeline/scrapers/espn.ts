import type { PlayerIdentityInput, ScraperResult } from "../types";

/**
 * ESPN scraper. Uses ESPN's public JSON endpoints (the same backend that
 * powers espn.com search and player pages) instead of HTML scraping. Two
 * stages:
 *
 *   1. Search   — `site.web.api.espn.com/apis/search/v2` returns players
 *                 across NCAAF + NFL with their integer athlete ID and the
 *                 league slug embedded in the player-page URL.
 *
 *   2. Profile  — `sports.core.api.espn.com/v2/sports/football/leagues/
 *                 <league>/athletes/<id>` returns full structured data
 *                 (height, weight, DOB, birthplace, position, jersey,
 *                 experience, status).
 *
 * Why this is a step change over the old HTML-scrape: ESPN's search-page
 * HTML demotes inactive / historical D1 players (Joe Ayoob, Wendell
 * Hunter), so the old regex would miss them entirely. The structured
 * search endpoint indexes the full athletes table including retired and
 * non-NFL college players.
 */

const SEARCH_TIMEOUT_MS = 8_000;
const PROFILE_TIMEOUT_MS = 6_000;

interface SearchResult {
  results?: {
    type?: string;
    contents?: {
      type?: string;
      displayName?: string;
      uid?: string;
      subtitle?: string;
      description?: string;
      link?: { web?: string };
    }[];
  }[];
}

interface AthleteProfile {
  displayName?: string;
  fullName?: string;
  jersey?: string;
  weight?: number;
  height?: number;
  displayHeight?: string;
  displayWeight?: string;
  dateOfBirth?: string;
  birthPlace?: { city?: string; state?: string; country?: string };
  active?: boolean;
  position?: { displayName?: string; abbreviation?: string };
  experience?: { years?: number };
  college?: { name?: string };
  headshot?: { href?: string };
  team?: { displayName?: string };
}

export async function scrapeESPN(
  identity: PlayerIdentityInput,
): Promise<ScraperResult> {
  try {
    const candidates = await searchAthletes(identity.full_name);
    if (candidates.length === 0) {
      return { source: "espn", ok: false, reason: "no_match" };
    }

    const match = pickBestMatch(candidates, identity);
    if (!match) {
      return { source: "espn", ok: false, reason: "ambiguous" };
    }

    const profile = await fetchAthleteProfile(match.athleteId, match.league);
    if (!profile) {
      // Found in search but profile fetch failed. Return a partial hit
      // with the search summary rather than dropping the match entirely.
      return {
        source: "espn",
        ok: true,
        facts: {
          full_name: match.displayName,
        },
        urls: [match.webUrl],
      };
    }

    return {
      source: "espn",
      ok: true,
      facts: factsFromProfile(profile),
      urls: [match.webUrl],
    };
  } catch {
    return { source: "espn", ok: false, reason: "unreachable" };
  }
}

interface SearchMatch {
  displayName: string;
  athleteId: string;
  league: "college-football" | "nfl";
  subtitle: string; // school or team — used for disambiguation
  webUrl: string;
}

async function searchAthletes(name: string): Promise<SearchMatch[]> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), SEARCH_TIMEOUT_MS);
  try {
    const url =
      `https://site.web.api.espn.com/apis/search/v2` +
      `?region=us&lang=en&limit=10&query=${encodeURIComponent(name)}`;
    const res = await fetch(url, {
      signal: ctl.signal,
      headers: { "User-Agent": "BLTZ-OnboardBot/1.0" },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as SearchResult;
    const out: SearchMatch[] = [];
    for (const r of json.results ?? []) {
      if (r.type !== "player") continue;
      for (const c of r.contents ?? []) {
        if (c.type !== "player") continue;
        const web = c.link?.web ?? "";
        const idMatch = c.uid?.match(/~a:(\d+)/);
        const athleteId = idMatch?.[1];
        if (!athleteId || !c.displayName) continue;
        // Description filters non-football sports (the search is global)
        // and link.web tells us which football league (college vs NFL).
        const isFootball =
          (c.description ?? "").toUpperCase().includes("NCAAF") ||
          (c.description ?? "").toUpperCase().includes("NFL") ||
          web.includes("/college-football/") ||
          web.includes("/nfl/");
        if (!isFootball) continue;
        const league: "college-football" | "nfl" = web.includes("/nfl/")
          ? "nfl"
          : "college-football";
        out.push({
          displayName: c.displayName,
          athleteId,
          league,
          subtitle: c.subtitle ?? "",
          webUrl: web,
        });
      }
    }
    return out;
  } finally {
    clearTimeout(timer);
  }
}

function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0 && !["jr", "sr", "ii", "iii", "iv"].includes(t));
}

function pickBestMatch(
  candidates: SearchMatch[],
  identity: PlayerIdentityInput,
): SearchMatch | null {
  // Name gate FIRST. ESPN's search is fuzzy ("Desmond Bishop" returns both
  // "Devin Bishop" and "Desmond Bishop") and the old code's school filter
  // would happily pick the wrong-named player when their school matched.
  // Require every input token (first + last name) to appear in the
  // candidate's displayName tokens. This passes "Patrick Mahomes" against
  // "Patrick Mahomes II" (candidate is a superset) and "Desmond Bishop"
  // against "Desmond Bishop" (exact), but rejects "Devin Bishop".
  const inputTokens = nameTokens(identity.full_name);
  if (inputTokens.length > 0) {
    const nameHits = candidates.filter((c) => {
      const candTokens = new Set(nameTokens(c.displayName));
      return inputTokens.every((t) => candTokens.has(t));
    });
    if (nameHits.length > 0) candidates = nameHits;
  }

  if (candidates.length === 1) return candidates[0];

  // Prefer a candidate whose ESPN team/school subtitle matches the
  // identity's school. Common when two same-named athletes both pass the
  // name gate (e.g. father/son or two college players).
  const school = identity.school?.trim().toLowerCase();
  if (school) {
    const schoolHits = candidates.filter((c) =>
      c.subtitle.toLowerCase().includes(school),
    );
    if (schoolHits.length === 1) return schoolHits[0];
    if (schoolHits.length > 1) candidates = schoolHits;
  }

  // Prefer a candidate whose league matches the user's stated level.
  // pro/former → NFL; hs/college → college-football.
  const wantNfl = identity.level === "pro" || identity.level === "former";
  const leagueHits = candidates.filter((c) =>
    wantNfl ? c.league === "nfl" : c.league === "college-football",
  );
  if (leagueHits.length === 1) return leagueHits[0];
  if (leagueHits.length > 1) candidates = leagueHits;

  // Fall back to the first remaining candidate; ESPN's search ranks by
  // relevance, and at this point we've already filtered by name.
  return candidates[0] ?? null;
}

async function fetchAthleteProfile(
  athleteId: string,
  league: "college-football" | "nfl",
): Promise<AthleteProfile | null> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), PROFILE_TIMEOUT_MS);
  try {
    // Note: this is the `core` API on http (not https). It's the only
    // one that returns full athlete profiles for inactive/historical
    // players; the `site` API errors out for them.
    const url = `http://sports.core.api.espn.com/v2/sports/football/leagues/${league}/athletes/${athleteId}`;
    const res = await fetch(url, {
      signal: ctl.signal,
      headers: { "User-Agent": "BLTZ-OnboardBot/1.0" },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as AthleteProfile & { code?: number };
    // Error responses come back with `code` and no athlete fields.
    if (json.code !== undefined && !json.displayName) return null;
    return json;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function factsFromProfile(p: AthleteProfile): NonNullable<ScraperResult["facts"]> {
  const facts: NonNullable<ScraperResult["facts"]> = {};

  if (p.displayName) facts.full_name = p.displayName;
  if (p.position?.abbreviation) facts.position = p.position.abbreviation;
  if (p.college?.name) facts.school = p.college.name;
  if (p.headshot?.href) {
    facts.photos = [{ url: p.headshot.href, credits: "ESPN" }];
  }

  // Heights from this API come as inches (a number) plus a display string.
  if (typeof p.height === "number" && p.height > 0) {
    facts.height_in = Math.round(p.height);
  } else if (p.displayHeight) {
    const hi = parseDisplayHeight(p.displayHeight);
    if (hi !== undefined) facts.height_in = hi;
  }

  if (typeof p.weight === "number" && p.weight > 0) {
    facts.weight_lbs = Math.round(p.weight);
  } else if (p.displayWeight) {
    const wm = p.displayWeight.match(/(\d{2,3})/);
    if (wm) facts.weight_lbs = parseInt(wm[1], 10);
  }

  if (p.dateOfBirth) {
    // ESPN returns ISO timestamp ("1984-08-08T07:00Z"); we only need the date.
    const m = p.dateOfBirth.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) facts.dob = m[1];
  }

  if (p.birthPlace?.city && p.birthPlace?.state) {
    facts.hometown = `${p.birthPlace.city}, ${p.birthPlace.state}`;
  }

  return facts;
}

function parseDisplayHeight(s: string): number | undefined {
  // "6' 3\"" or "6'3\""
  const m = s.match(/(\d)\s*'\s*(\d{1,2})/);
  if (!m) return undefined;
  return parseInt(m[1], 10) * 12 + parseInt(m[2], 10);
}
