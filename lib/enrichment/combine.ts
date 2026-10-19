import { identitySearchTerms, normalizeArticleUrl, type NewsIdentity, type SearchProvider } from "./news";
import { evaluateSource } from "@/lib/source-policy/policy";
import { combineSearchSchema, type CombineSearch } from "@/lib/player/combine-review";
import type { CombineResult } from "@/lib/player/combine";

export function combineSearchPlan(identity: NewsIdentity) {
  const terms = identitySearchTerms(identity).slice(0, 2);
  return ["wikipedia.org", "pro-football-reference.com", "nfl.com", "draftscout.com"].flatMap(domain => terms.map(term => ({
    query: `${term} ${domain === "wikipedia.org" ? '"pre-draft measurables"' : domain === "nfl.com" ? '"pro day"' : 'combine results'}`, includeDomains: [domain],
  })));
}
/** Search is read-only. Review and the existing draft save remain explicit. */
export async function discoverCombine(identity: NewsIdentity, provider: SearchProvider,
  extract: (url: string, identity: NewsIdentity, signal: AbortSignal) => Promise<CombineResult[]>, signal: AbortSignal): Promise<CombineSearch> {
  const result: CombineSearch = { suggestions: [], sources: [], status: "complete" };
  const urls = new Set<string>(); let failed = false;
  const plan = combineSearchPlan(identity);
  if (!plan.length) return { ...result, status: "unavailable" };
  // Search every source before scheduling extraction, preserving source diversity.
  const searches = await Promise.allSettled(plan.map(query => provider.search(query.query, signal, { includeDomains: query.includeDomains })));
  const groups: string[][] = [];
  const nameKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
  // Fixed, bounded Wikipedia profile lookups avoid relying entirely on search
  // ranking for retired players. These are candidates, never identity evidence.
  const profile = identity.fullName.trim().replace(/\s+/g, "_");
  const profiles = [profile, `${profile}_(American_football)`].map(title => `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`);
  for (const search of searches) {
    if (search.status === "rejected") { failed = true; continue; }
    groups.push(search.value.slice(0, 6).flatMap(item => {
      const url = normalizeArticleUrl(item.url);
      if (!url || urls.has(url) || !evaluateSource(url).allowed_actions.includes("EXTRACT_COMBINE")) return [];
      const host = new URL(url).hostname;
      let pathname: string;
      try { pathname = decodeURIComponent(new URL(url).pathname); } catch { return []; }
      if (host === "en.wikipedia.org" && !nameKey(pathname).includes(nameKey(identity.fullName))) return [];
      if (host.replace(/^www\./, "") === "draftscout.com" && item.title && !nameKey(item.title).includes(nameKey(identity.fullName))) return [];
      urls.add(url); return [url];
    }));
  }
  const candidates = [normalizeArticleUrl(profiles[0])!];
  for (let rank = 0; rank < 6; rank++) for (const group of groups) if (group[rank] && !candidates.includes(group[rank]) && candidates.length < 7) candidates.push(group[rank]);
  if (!candidates.includes(profiles[1]) && candidates.length < 8) candidates.push(profiles[1]);
  for (let index = 0; index < candidates.length && !signal.aborted; index += 4) {
    const batch = await Promise.all(candidates.slice(index, index + 4).map(async (url, offset) => {
      const label = new URL(url).hostname.replace(/^www\./, "");
      try {
        const events = await extract(url, identity, signal);
        return { source: { url, label, status: events.length ? "results" as const : "no_match" as const }, suggestions: events.slice(0, 3).map((event, eventIndex) => ({
          id: `source-${index + offset}-${eventIndex}`, sourceLabel: label, event,
        })) };
      } catch { failed = true; return { source: { url, label, status: "unavailable" as const }, suggestions: [] }; }
    }));
    for (const item of batch) { result.sources.push(item.source); result.suggestions.push(...item.suggestions); }
  }
  result.status = signal.aborted || failed ? result.sources.length ? "partial" : "unavailable" : "complete";
  return combineSearchSchema.parse(result);
}
