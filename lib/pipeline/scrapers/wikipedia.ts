import { fetchHtml, stripHtml } from "../fetch";
import type { PlayerIdentityInput, ScraperResult, ScrapedAward } from "../types";
import { NFL_FULL_NAMES } from "../teams";

/**
 * Wikipedia scraper. We use the public REST API — no auth required and
 * extremely consistent HTML structure for athlete biographies.
 */

interface SearchHit {
  title: string;
  pageid: number;
  snippet: string;
}

interface SummaryResponse {
  extract?: string;
  description?: string;
  type?: string;
  content_urls?: { desktop?: { page?: string } };
  thumbnail?: { source?: string };
}

async function searchCandidates(
  identity: PlayerIdentityInput,
): Promise<SearchHit[]> {
  // Two passes, in this order:
  //   1. Bare name. For obscure athletes (Traye Simmons, Joe Ayoob,
  //      etc.) the bare-name search reliably surfaces their personal
  //      Wikipedia article as the top hit. Adding school/position
  //      keywords *up-front* drowns the article out with team-season
  //      recaps that incidentally mention them.
  //   2. Name + school + position. Helps disambiguate when multiple
  //      athletes share a name and the bare query returns the wrong
  //      person at #1 (e.g. two "Brandon Williams" entries).
  // Results are merged in order with title-dedupe, so the bare-name
  // hits show up first and the augmented hits backfill the candidate
  // list. The article-validation step downstream picks the first
  // candidate that looks like a real player article.
  const queries: string[] = [identity.full_name];
  if (identity.school || identity.position) {
    queries.push(
      [identity.full_name, identity.school, identity.position]
        .filter(Boolean)
        .join(" "),
    );
  }
  const seen = new Set<string>();
  const out: SearchHit[] = [];
  for (const q of queries) {
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*&srlimit=5&srsearch=${encodeURIComponent(q)}`;
    const r = await fetch(url, {
      headers: { "User-Agent": "BLTZ-OnboardBot/1.0" },
    });
    if (!r.ok) continue;
    const data = (await r.json()) as { query?: { search?: SearchHit[] } };
    for (const h of data.query?.search ?? []) {
      if (!seen.has(h.title)) {
        seen.add(h.title);
        out.push(h);
      }
    }
  }
  return out;
}

async function fetchSummary(title: string): Promise<{
  extract: string;
  description: string;
  type: string;
  title: string;
  url: string;
  thumbnail?: string;
} | null> {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const r = await fetch(url, {
    headers: { "User-Agent": "BLTZ-OnboardBot/1.0" },
  });
  if (!r.ok) return null;
  const j = (await r.json()) as SummaryResponse;
  if (!j?.extract) return null;
  return {
    extract: j.extract,
    description: j.description ?? "",
    type: j.type ?? "",
    title,
    url: j.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    thumbnail: j.thumbnail?.source,
  };
}

/**
 * Reject Wikipedia summaries that aren't actually about the athlete. The
 * search endpoint will happily return team-season articles ("2011 San
 * Diego Chargers season") or rivalry pages when a player has no
 * dedicated article — and the previous code blindly accepted whichever
 * came back first, treating those as the athlete's bio. The bar here:
 *
 *   1. The article title must include the player's last name token, so
 *      a "Traye Simmons" search can't latch onto a team-season recap
 *      that incidentally mentions him.
 *   2. The article description must suggest the subject is a person
 *      (preferably a football player). Wikipedia's summary endpoint
 *      sets `description` to a short label like "American football
 *      linebacker" or "American basketball coach"; team-season pages
 *      get descriptions like "Season of the NFL team". Requiring the
 *      description to mention "football", "athlete", "player", or
 *      "coach" filters those out without hand-listing every variation.
 *   3. Disambiguation pages are skipped — they're never the bio.
 */
function looksLikePlayerArticle(
  summary: NonNullable<Awaited<ReturnType<typeof fetchSummary>>>,
  identity: PlayerIdentityInput,
): boolean {
  if (summary.type === "disambiguation") return false;

  const titleLower = summary.title.toLowerCase();
  const descLower = summary.description.toLowerCase();
  const nameTokens = identity.full_name
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 3);
  if (nameTokens.length === 0) return true;

  const lastToken = nameTokens[nameTokens.length - 1];
  if (!titleLower.includes(lastToken)) return false;

  // Description signal: athlete/player/coach/etc. Empty descriptions
  // also fail — we don't want to accept on ambiguous evidence.
  const isPerson =
    /\b(football|athlete|player|coach|quarterback|linebacker|cornerback|safety|tackle|guard|receiver|tight end|defensive|offensive|running back|punter|kicker|nfl|nba|mlb|olympic)\b/.test(
      descLower,
    );
  return isPerson;
}

const HEIGHT_RE = /(\d)\s*ft\s*(\d{1,2})\s*in/i;
const WEIGHT_RE = /(\d{2,3})\s*lb/i;
// "born" is REQUIRED, not optional. With it optional the regex matched any
// date phrase in the article (e.g. "1 March 2026" referring to article
// metadata) and the synthesis layer would treat that as the DOB. Wikipedia
// bios reliably use one of these two patterns near the lede:
//   "(born August 8, 1984)"      → MDY
//   "(born 8 August 1984)"       → DMY (less common but legal)
//   "born on August 8, 1984"     → MDY with optional "on"
const DOB_DMY_RE = /\bborn\s+(?:on\s+)?(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i;
const DOB_MDY_RE = /\bborn\s+(?:on\s+)?(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})\b/i;

function parseDob(text: string): string | undefined {
  const dmy = text.match(DOB_DMY_RE);
  const mdy = text.match(DOB_MDY_RE);
  const day = dmy?.[1] ?? mdy?.[2];
  const monthName = dmy?.[2] ?? mdy?.[1];
  const year = dmy?.[3] ?? mdy?.[3];
  if (!day || !monthName || !year) return undefined;
  const months = [
    "january","february","march","april","may","june","july","august",
    "september","october","november","december",
  ];
  const monthNum = String(months.indexOf(monthName.toLowerCase()) + 1).padStart(2, "0");
  return `${year}-${monthNum}-${day.padStart(2, "0")}`;
}

function parseHeightInches(text: string): number | undefined {
  const m = text.match(HEIGHT_RE);
  if (!m) return undefined;
  const ft = parseInt(m[1], 10);
  const inch = parseInt(m[2], 10);
  if (Number.isNaN(ft) || Number.isNaN(inch)) return undefined;
  return ft * 12 + inch;
}

function parseWeight(text: string): number | undefined {
  const m = text.match(WEIGHT_RE);
  if (!m) return undefined;
  const w = parseInt(m[1], 10);
  return Number.isNaN(w) ? undefined : w;
}

function extractAwards(text: string, sourceUrl: string): ScrapedAward[] {
  const awards: ScrapedAward[] = [];
  // Very conservative — Wikipedia bios mention these by name. We pull
  // each match as a candidate; the synthesis step will dedupe.
  const patterns: { name: string; re: RegExp }[] = [
    { name: "All-American", re: /All-American/g },
    { name: "Pro Bowl", re: /Pro Bowl/g },
    { name: "Heisman Trophy", re: /Heisman Trophy/g },
    { name: "Lott Trophy", re: /Lott Trophy/g },
    { name: "Super Bowl Champion", re: /Super Bowl champion/gi },
  ];
  for (const { name, re } of patterns) {
    if (re.test(text)) {
      awards.push({ name, source_url: sourceUrl });
    }
  }
  return awards;
}

// US state allow-list. Hometown must end with a real state (or D.C.), otherwise
// the old regex was fooled by phrases like "from Texas Tech, Rice University…"
// where neither part is a city.
const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
  "New Hampshire","New Jersey","New Mexico","New York","North Carolina",
  "North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island",
  "South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming",
] as const;
const US_STATES_RE = `(?:${US_STATES.join("|")}|D\\.C\\.)`;
const CITY_RE = `[A-Z][A-Za-z.'\\- ]+?`;

// Keywords use [Bb]orn etc. to allow sentence-start capitalization
// without an `i` flag, which would relax CITY_RE's "starts with uppercase"
// anchor and let things like "from a, california" match.
const HOMETOWN_PATTERNS: RegExp[] = [
  // "Born ... in Tyler, Texas" (covers "born September 17, 1995, in X, Y")
  new RegExp(`\\b[Bb]orn\\b[^.]{0,120}?\\bin\\s+(${CITY_RE}),\\s+(${US_STATES_RE})\\b`),
  // "grew up in San Diego, California"
  new RegExp(`\\b[Gg]rew\\s+up\\s+in\\s+(${CITY_RE}),\\s+(${US_STATES_RE})\\b`),
  // "raised in Compton, California"
  new RegExp(`\\b[Rr]aised\\s+in\\s+(${CITY_RE}),\\s+(${US_STATES_RE})\\b`),
  // "attended Fairfield High School in Fairfield, California". This pattern
  // catches the most common Wikipedia phrasing for athletes whose lede
  // doesn't include an explicit birthplace — high school location is a
  // strong proxy for hometown and is mentioned in virtually every NFL
  // bio. Allows "High School", "high school", and "HS".
  new RegExp(`\\battended\\s+[A-Z][^.]{0,80}?(?:[Hh]igh\\s+[Ss]chool|HS)\\s+in\\s+(${CITY_RE}),\\s+(${US_STATES_RE})\\b`),
  // "from Compton, California"
  new RegExp(`\\b[Ff]rom\\s+(${CITY_RE}),\\s+(${US_STATES_RE})\\b`),
  // "native of Houston, Texas"
  new RegExp(`\\b[Nn]ative\\s+of\\s+(${CITY_RE}),\\s+(${US_STATES_RE})\\b`),
];

function extractHometown(text: string): string | undefined {
  // Wikipedia articles open with a long navigation/TOC prefix before the
  // actual lede prose. The "Early life" section (where birthplace lives)
  // typically lands within the first ~8000 chars after stripping. Searching
  // the whole article risks picking up other people's hometowns mentioned
  // later, but the US-state allow-list keeps that risk low.
  const window = text.slice(0, 8000);
  for (const re of HOMETOWN_PATTERNS) {
    const m = window.match(re);
    if (m) {
      const city = m[1].replace(/\s+/g, " ").trim();
      const state = m[2];
      return `${city}, ${state}`;
    }
  }
  return undefined;
}

// Verbs that signal "team X is HIS team" rather than an opponent or
// incidental mention. Each pattern captures the trailing phrase after
// "the " — we then validate each chunk against the known NFL team list
// before accepting it, so "over the Pittsburgh Steelers" (an opponent)
// never sneaks through.
const PRO_TEAM_VERB_PATTERNS: RegExp[] = [
  /\bplayed for the\s+([^.;:()]+)/gi,
  /\b(?:was\s+)?drafted by the\s+([^.;:()]+)/gi,
  /\b(?:was\s+)?selected by the\s+([^.;:()]+)/gi,
  /\bsigned (?:with|by|as a free agent (?:with|by)) the\s+([^.;:()]+)/gi,
  /\bjoined the\s+([^.;:()]+)/gi,
  /\btraded to the\s+([^.;:()]+)/gi,
  /\bclaimed (?:off waivers )?by the\s+([^.;:()]+)/gi,
  /\bwon (?:Super Bowl|the Super Bowl|a Super Bowl|championship|the championship|a championship)\b[^.;]*?with the\s+([^.;:()]+)/gi,
  /\bspent\s+[^.;]{0,40}?with the\s+([^.;:()]+)/gi,
  /\b(?:released|cut|waived) by the\s+([^.;:()]+)/gi,
];

function extractProTeams(text: string): string[] {
  // Pass 1 — verb gate. Collect every team that appears after one of the
  // career verbs. We don't care WHERE in the text the verb matched here,
  // only WHICH teams the article positively asserts the athlete played
  // for. Without this gate, opponents (e.g. "over the Pittsburgh
  // Steelers" in a Super Bowl recap) sneak in.
  const valid = new Set<string>();
  for (const re of PRO_TEAM_VERB_PATTERNS) {
    for (const m of text.matchAll(re)) {
      const tail = m[1];
      // Tails can be lists: "Minnesota Vikings and San Francisco 49ers"
      // or "Vikings, Cardinals, and 49ers". Split, then prefix-match each
      // chunk against the known NFL team set.
      for (const chunkRaw of tail.split(/\s+and\s+|,\s*/)) {
        const chunk = chunkRaw.replace(/^the\s+/i, "").trim();
        if (!chunk) continue;
        for (const team of NFL_FULL_NAMES) {
          if (chunk.startsWith(team)) {
            valid.add(team);
            break;
          }
        }
      }
    }
  }

  // Pass 2 — chronological sort. Wikipedia infoboxes list teams in
  // career order ("Green Bay Packers (2007–2012) · Minnesota Vikings
  // (2013) · Arizona Cardinals (2014) · San Francisco 49ers (2014)"),
  // and that's typically the first place each team is named in the
  // stripped article text. So the team's earliest indexOf() position is
  // a reliable chronological anchor — far more so than the order of the
  // verb-pattern regexes themselves.
  const positions: { team: string; idx: number }[] = [];
  for (const team of valid) {
    const idx = text.indexOf(team);
    if (idx >= 0) positions.push({ team, idx });
  }
  positions.sort((a, b) => a.idx - b.idx);
  return positions.map((p) => p.team).slice(0, 8);
}

export async function scrapeWikipedia(
  identity: PlayerIdentityInput,
): Promise<ScraperResult> {
  try {
    const hits = await searchCandidates(identity);
    if (!hits.length) return { source: "wikipedia", ok: false, reason: "no_match" };

    // Walk the search results in relevance order and accept the first
    // one that looks like a real athlete article. Without this loop, a
    // player with no dedicated Wikipedia page (e.g. Traye Simmons) ends
    // up "matched" against an incidental mention in a team-season recap
    // and we end up rendering that as their bio.
    let summary: NonNullable<Awaited<ReturnType<typeof fetchSummary>>> | null =
      null;
    for (const hit of hits) {
      const s = await fetchSummary(hit.title);
      if (s && looksLikePlayerArticle(s, identity)) {
        summary = s;
        break;
      }
    }
    if (!summary) return { source: "wikipedia", ok: false, reason: "no_match" };

    // Pull a longer excerpt by reading the article HTML for stat extraction.
    const articleUrl = summary.url;
    const articleHtml = await fetchHtml(articleUrl, { timeoutMs: 7000 });
    const fullText = articleHtml.ok ? stripHtml(articleHtml.html) : summary.extract;

    return {
      source: "wikipedia",
      ok: true,
      facts: {
        bio_text: summary.extract,
        dob: parseDob(fullText),
        height_in: parseHeightInches(fullText),
        weight_lbs: parseWeight(fullText),
        hometown: extractHometown(fullText),
        pro_teams: extractProTeams(fullText),
        awards: extractAwards(fullText, summary.url),
        photos: summary.thumbnail
          ? [{ url: summary.thumbnail, credits: "Wikipedia" }]
          : [],
      },
      urls: [summary.url],
    };
  } catch {
    return { source: "wikipedia", ok: false, reason: "unreachable" };
  }
}
