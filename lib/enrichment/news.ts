import { isPreviewUrl } from "@/lib/preview-lockers/validation";
import { SearchProviderError } from "@/lib/search/errors";
import { isNewsArticleUrl } from "./news-classification";

export interface NewsIdentity {
  fullName: string; aliases?: string[]; sport: string; league?: string;
  teams: string[]; schools: string[]; position?: string; activeYears?: string[];
}
export interface SearchProvider {
  name: string;
  search(query: string, signal: AbortSignal): Promise<Array<{ url: string }>>;
}
export interface ArticleMetadata {
  headline: string; article_url: string; canonical_url: string; publisher: string;
  source_domain: string; author: string | null; published_at: string | null;
  thumbnail_url: string | null; summary: string; metadata: { extraction: string };
}
export interface PlayerArticle extends ArticleMetadata {
  discovery_source: string; discovered_at: string; relevance_score: number; confidence: number;
  featured: boolean; status: "accepted";
}
export interface NewsResult {
  articles: PlayerArticle[]; candidates: number; rejected: number; duplicates: number;
  errors: string[]; status: "complete" | "partial" | "unavailable";
}
export function normalizeArticleUrl(value: string, base?: string): string | null {
  try {
    const url = new URL(value, base);
    if (!isPreviewUrl(url.href)) return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) if (/^(utm_|fbclid$|gclid$|mc_cid$|mc_eid$)/i.test(key)) url.searchParams.delete(key);
    url.searchParams.sort();
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url.href;
  } catch { return null; }
}
const words = (s: string) => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export const headlineKey = (article: ArticleMetadata) => `${article.source_domain.replace(/^www\./, "")}|${words(article.headline)}`;
export function dedupeArticles<T extends ArticleMetadata>(articles: T[]): T[] {
  const urls = new Set<string>();
  const headlines = new Set<string>();
  return articles.filter(article => {
    const keys = [normalizeArticleUrl(article.canonical_url), normalizeArticleUrl(article.article_url)].filter((v): v is string => !!v);
    const title = headlineKey(article);
    const duplicate = keys.some(key => urls.has(key)) || headlines.has(title);
    keys.forEach(key => urls.add(key)); headlines.add(title);
    return !duplicate;
  });
}
export function identityQueries(identity: NewsIdentity): string[] {
  const context = [identity.teams[0] || identity.sport, ...identity.schools.slice(0, 1)];
  if (!context.length) context.push(identity.sport);
  return [...new Set(context.map(term => `${identity.fullName.replace(/["\\]/g, "")} ${identity.sport} ${term} news interviews`))].slice(0, 2);
}
export function articleRelevance(article: ArticleMetadata, identity: NewsIdentity): number {
  const text = ` ${words(`${article.headline} ${article.summary}`)} `;
  const has = (value: string) => value.trim().length >= 2 && text.includes(` ${words(value)} `);
  if (![identity.fullName, ...(identity.aliases ?? [])].some(has)) return 0;
  const sport = has(identity.sport) || (identity.sport === "football" && (has("NFL") || has("Super Bowl")));
  const rams = identity.teams.some(team => /^(?:Los Angeles|St\.? Louis) Rams$/i.test(team));
  const affiliation = [...identity.teams, ...identity.schools].some(has) || (rams && sport && has("Rams"));
  // Names, sport, league and position can all be shared by different athletes.
  // This workflow requires an explicit saved affiliation in publisher metadata.
  if (!affiliation) return 0.35;
  return Math.min(0.98, 0.8 + Number(affiliation) * 0.1 + Number(sport) * 0.05);
}
export async function discoverNews(identity: NewsIdentity, provider: SearchProvider | null,
  extract: (url: string, signal: AbortSignal) => Promise<ArticleMetadata | null>, signal: AbortSignal, knownUrls: string[] = []): Promise<NewsResult> {
  const result: NewsResult = { articles: [], candidates: 0, rejected: 0, duplicates: 0, errors: [], status: "complete" };
  if (!provider) return { ...result, status: "unavailable", errors: ["search_not_configured"] };
  const urls = new Set<string>();
  // Previously accepted URLs are candidates, never automatic retained evidence.
  // Re-fetch their publisher metadata and apply the same current identity gates.
  for (const candidate of [...new Set(knownUrls)].slice(0, 6)) {
    const url = normalizeArticleUrl(candidate);
    if (!url || !isNewsArticleUrl(url)) continue;
    urls.add(url);
    result.candidates++;
  }
  for (const query of identityQueries(identity)) {
    if (signal.aborted) break;
    try {
      const candidates = await provider.search(query, signal);
      for (const candidate of candidates.slice(0, 8)) {
        result.candidates++;
        const url = normalizeArticleUrl(candidate.url);
        if (!url) { result.rejected++; continue; }
        if (!isNewsArticleUrl(url)) { result.rejected++; continue; }
        if (urls.has(url)) result.duplicates++; else urls.add(url);
      }
    } catch (error) {
      result.errors.push(error instanceof SearchProviderError ? error.code : "search_failed");
      // An incomplete search must not replace the last successful article set.
      // Stop rather than repeating an invalid, exhausted or unavailable request.
      return { ...result, status: "unavailable" };
    }
  }
  // Small bounded batches, no background jobs. Keep data only after metadata and identity gates.
  const candidates = [...urls].slice(0, 12);
  for (let i = 0; i < candidates.length && !signal.aborted; i += 4) {
    const batch = await Promise.all(candidates.slice(i, i + 4).map(async url => {
      try {
        const article = await extract(url, signal);
        if (!article) { result.rejected++; return null; }
        const confidence = articleRelevance(article, identity);
        if (confidence < 0.8) { result.rejected++; return null; }
        return { ...article, discovery_source: provider.name, discovered_at: new Date().toISOString(),
          confidence, relevance_score: confidence, featured: false, status: "accepted" as const };
      } catch { result.rejected++; result.errors.push("metadata_unavailable"); return null; }
    }));
    result.articles.push(...batch.filter((a): a is PlayerArticle => a !== null));
  }
  const unique = dedupeArticles(result.articles);
  result.duplicates += result.articles.length - unique.length;
  result.articles = unique;
  if (signal.aborted) return { ...result, articles: [], status: "unavailable", errors: [...new Set([...result.errors, "time_budget_exceeded"])] };
  result.errors = [...new Set(result.errors)];
  result.status = result.errors.length ? (unique.length ? "partial" : "unavailable") : "complete";
  return result;
}
