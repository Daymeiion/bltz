import { decodeHTML } from "entities";
import { stripHtml } from "../fetch";
import { uniqueJerseys, type JerseyHistory } from "@/lib/player/jersey-history";
import { requireSourceAction } from "@/lib/source-policy/policy";
import { fetchSourceFacts } from "@/lib/source-policy/fetch";

/** Team/year references in this matched biography's career history only.
 * Extract this athlete's linked roster entry, never a roster dataset. */
export async function discoverWikipediaJerseys(html: string, teams: string[], playerUrl: string): Promise<JerseyHistory[]> {
  const heading = /Career history/i.exec(html);
  if (!heading) return [];
  const cell = /<td\b[^>]*>([\s\S]*?)<\/td>/i.exec(html.slice(heading.index, heading.index + 30000))?.[1] ?? "";
  const sources = new Map<string, string>();
  const teamSources: Array<{ team: string; urls: string[] }> = [];
  for (const list of cell.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)) {
    const text = decodeHTML(stripHtml(list[1]));
    const team = teams.find(team => text.startsWith(team));
    if (!team) continue;
    const years = [...text.matchAll(/\b((?:19|20)\d{2})\b/g)].map(match => Number(match[1]));
    if (!years.length) continue;
    const first = Math.min(...years), last = /present/i.test(text) ? new Date().getUTCFullYear() : Math.max(...years);
    if (last < first || last - first > 30) continue;
    const seasons = Array.from({ length: last - first + 1 }, (_, index) => last - index);
    teamSources.push({ team, urls: seasons.map(year => `https://en.wikipedia.org/wiki/${year}_${encodeURIComponent(team.replace(/ /g, "_"))}_season`) });
  }
  // Give each stint a lookup before spending the remaining budget on older years.
  for (let index = 0; index < 31 && sources.size < 12; index++) for (const stint of teamSources) {
    if (stint.urls[index] && sources.size < 12) sources.set(stint.urls[index], stint.team);
  }
  const result: JerseyHistory[] = [];
  const entries = [...sources];
  const deadline = AbortSignal.timeout(4000);
  for (let index = 0; index < entries.length; index += 4) {
    const batch = await Promise.all(entries.slice(index, index + 4).map(async ([url, team]) => {
      try {
        const response = await fetchSourceFacts(url, { signal: AbortSignal.any([deadline, AbortSignal.timeout(2500)]), headers: { Accept: "text/html" } });
        if (!response.ok || Number(response.headers.get("content-length")) > 1_500_000) return [];
        const reader = response.body?.getReader(); if (!reader) return [];
        const chunks: Uint8Array[] = []; let size = 0;
        try { while (true) { const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.length; if (size > 1_500_000) { await reader.cancel(); return []; } chunks.push(chunk.value); } } finally { reader.releaseLock(); }
        const body = Buffer.concat(chunks).toString("utf8");
        return extractRosterJerseys(body, team, playerUrl, url);
      } catch { return []; }
    }));
    result.push(...batch.flat());
  }
  return uniqueJerseys(result);
}

export function extractRosterJerseys(html: string, team: string, playerUrl: string, sourceUrl: string): JerseyHistory[] {
  requireSourceAction(sourceUrl, "EXTRACT_FACTS"); requireSourceAction(sourceUrl, "PERSIST_FACTS");
  const result: JerseyHistory[] = [];
  const headings = [...html.matchAll(/<h([2-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)];
  const rosterIndex = headings.findIndex(heading => /^(?:(?:final|opening|regular season)\s+)?roster(?:\s*\[edit\])?$/i.test(stripHtml(heading[2]).trim()));
  if (rosterIndex < 0) return [];
  const roster = headings[rosterIndex];
  const next = headings.slice(rosterIndex + 1).find(heading => Number(heading[1]) <= Number(roster[1]));
  const rosterHtml = html.slice(roster.index! + roster[0].length, next?.index ?? html.length);
  for (const row of rosterHtml.matchAll(/<(li|tr)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    // A single roster entry must link to the exact matched biography. A same-name
    // athlete, incidental mention or opposing roster cannot supply a number.
    const links = [...row[2].matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
    const player = links.find(link => { try { return new URL(decodeHTML(link[1]), sourceUrl).href.split("#")[0] === playerUrl; } catch { return false; } });
    if (!player) continue;
    const before = decodeHTML(stripHtml(row[2].slice(0, player.index))).trim();
    const number = /(?:^|\s)#?(\d{1,2})$/.exec(before)?.[1];
    if (number) result.push({ team, number, sourceUrl });
  }
  return uniqueJerseys(result);
}

// Called only after the Wikipedia adapter has matched a football biography.
// Never zip an unassociated infobox number list to the career-team list.
export function extractJerseyHistory(html: string, fullName: string, teams: string[], sourceUrl: string): JerseyHistory[] {
  requireSourceAction(sourceUrl, "EXTRACT_FACTS");
  requireSourceAction(sourceUrl, "PERSIST_FACTS");
  const result: JerseyHistory[] = [];
  const clean = (value: string) => decodeHTML(stripHtml(value)).replace(/\[\d+\]/g, "").trim();
  const surname = fullName.trim().split(/\s+/).at(-1)?.toLowerCase();
  // Explicit team/number table rows, not whole-page proximity or list order.
  for (const table of html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)) {
    const rows = [...table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(row => [...row[1].matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)].map(cell => clean(cell[1])));
    const header = rows.find(row => row.some(cell => /^(?:jersey|uniform|number|no\.?|#)$/i.test(cell)) && row.some(cell => /^(?:team|school)$/i.test(cell)));
    if (!header) continue;
    const numberIndex = header.findIndex(cell => /^(?:jersey|uniform|number|no\.?|#)$/i.test(cell));
    const teamIndex = header.findIndex(cell => /^(?:team|school)$/i.test(cell));
    for (const row of rows) {
      const team = teams.find(team => team.toLowerCase() === row[teamIndex]?.toLowerCase());
      if (team && row[numberIndex]) result.push({ team, number: row[numberIndex], sourceUrl });
    }
  }
  // A named career section supplies team context. Only affirmative statements
  // about this athlete wearing a number count; opponent and retired numbers do not.
  const headings = [...html.matchAll(/<h([2-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)];
  let team: string | undefined;
  let teamLevel = 7;
  for (let index = 0; index < headings.length; index++) {
    const heading = headings[index]; const level = Number(heading[1]);
    const headingName = clean(heading[2]).replace(/\s*\[edit\]\s*$/i, "");
    const matched = teams.find(value => value.toLowerCase() === headingName.toLowerCase());
    if (matched) { team = matched; teamLevel = level; }
    else if (level <= teamLevel) team = undefined;
    if (!team) continue;
    const body = html.slice(heading.index! + heading[0].length, headings[index + 1]?.index ?? html.length);
    for (const paragraph of body.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
      const text = clean(paragraph[1]);
      for (const sentence of text.split(/(?<=[.!?])\s+/)) {
        const match = /\b(he|[A-Za-z'-]+)\s+(?:(?:decided|chose)\s+to\s+)?(?:wears?|wore|was\s+assigned)\s+(?:jersey\s+)?(?:number\s*|No\.?\s*|#\s*)(\d{1,2})\b/i.exec(sentence);
        if (match && ["he", surname].includes(match[1].toLowerCase())) result.push({ team, number: match[2], sourceUrl });
      }
    }
  }
  return uniqueJerseys(result).slice(0, 64);
}
