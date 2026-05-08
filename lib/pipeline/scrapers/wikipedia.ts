import { fetchHtml, stripHtml } from "../fetch";
import type { PlayerIdentityInput, ScraperResult, ScrapedAward } from "../types";

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
  content_urls?: { desktop?: { page?: string } };
  thumbnail?: { source?: string };
}

async function searchCandidates(
  identity: PlayerIdentityInput,
): Promise<SearchHit[]> {
  const q = [identity.full_name, identity.school, identity.position]
    .filter(Boolean)
    .join(" ");
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*&srlimit=5&srsearch=${encodeURIComponent(q)}`;
  const r = await fetch(url, {
    headers: { "User-Agent": "BLTZ-OnboardBot/1.0" },
  });
  if (!r.ok) return [];
  const data = (await r.json()) as { query?: { search?: SearchHit[] } };
  return data.query?.search ?? [];
}

async function fetchSummary(title: string): Promise<{
  extract: string;
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
    url: j.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    thumbnail: j.thumbnail?.source,
  };
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

function extractProTeams(text: string): string[] {
  const teams = new Set<string>();
  const playedFor = text.match(/\bplayed for the\s+([^.;]+)/i);
  if (playedFor?.[1]) {
    for (const chunk of playedFor[1].split(/\s+and\s+|,\s*/)) {
      const team = chunk.replace(/^the\s+/i, "").trim();
      if (team && /^[A-Z]/.test(team)) teams.add(team);
    }
  }
  return Array.from(teams).slice(0, 8);
}

export async function scrapeWikipedia(
  identity: PlayerIdentityInput,
): Promise<ScraperResult> {
  try {
    const hits = await searchCandidates(identity);
    if (!hits.length) return { source: "wikipedia", ok: false, reason: "not_found" };
    // Pick the first hit — for a tighter pass we'd score by snippet match
    // against identity.school + identity.position.
    const top = hits[0];
    const summary = await fetchSummary(top.title);
    if (!summary) return { source: "wikipedia", ok: false, reason: "not_found" };

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
    return { source: "wikipedia", ok: false, reason: "network" };
  }
}
