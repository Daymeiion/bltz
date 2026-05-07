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
const DOB_DMY_RE = /\b(?:born[: ]+)?(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i;
const DOB_MDY_RE = /\b(?:born[: ]+)?(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})\b/i;

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

function extractHometown(text: string): string | undefined {
  const fromMatch = text.match(/\bfrom\s+([A-Z][A-Za-z .'-]+,\s+[A-Z][A-Za-z .'-]+?)(?:\.|;|,?\s+(?:and|where|who|he|she|they)\b)/);
  if (fromMatch) return fromMatch[1].replace(/\s+/g, " ").trim();
  const bornMatch = text.match(/\bborn\s+(?:in\s+)?([A-Z][A-Za-z .'-]+,\s+[A-Z][A-Za-z .'-]+?)(?:\.|;|,?\s+(?:and|where|who|he|she|they)\b)/);
  return bornMatch?.[1]?.replace(/\s+/g, " ").trim();
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
