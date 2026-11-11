import { mentionsSchool, schoolDisplayName } from "@/lib/player/school-identity";
import { evaluateSource, requireSourceAction, sourceProvenance, remoteAssetReference, policyDiagnostics, type SourceProvenance, type PolicyDiagnostics } from "@/lib/source-policy/policy";
import { isPreviewUrl } from "@/lib/preview-lockers/validation";
import { SearchProviderError } from "@/lib/search/errors";

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
  thumbnail_url: string | null; summary: string; metadata: { extraction: string; provenance?: SourceProvenance };
}
export interface PlayerArticle extends ArticleMetadata {
  discovery_source: string; discovered_at: string; relevance_score: number; confidence: number;
  featured: boolean; status: "accepted";
}
export interface NewsResult {
  source_policy?: PolicyDiagnostics;
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
  const names = [identity.fullName, ...(identity.aliases ?? [])].slice(0, 2);
  const primarySchool = identity.schools[0];
  const terms = [identity.sport, primarySchool, primarySchool ? schoolDisplayName(primarySchool) : undefined,
    identity.teams[0], ...identity.schools.slice(1), identity.league, ...identity.teams.slice(1)].filter((term): term is string => !!term?.trim());
  const seen = new Set<string>();
  const context = terms.filter(term => { const key = words(term); if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, 4);
  return [...new Set(names.flatMap(name => context.map(term => `"${name.replace(/["\\]/g, "")}" ${term} news interview -stats -roster`)))].slice(0, 4);
}
export function articleRelevance(article: ArticleMetadata, identity: NewsIdentity): number {
  const text = ` ${words(`${article.headline} ${article.summary}`)} `;
  const has = (value: string) => value.trim().length >= 2 && text.includes(` ${words(value)} `);
  if (![identity.fullName, ...(identity.aliases ?? [])].some(has)) return 0;
  const affiliation = identity.teams.some(has) || identity.schools.some(school => mentionsSchool(`${article.headline} ${article.summary}`, school));
  const sport = has(identity.sport) || (identity.sport === "football" && has("NFL"));
  // Names, sport, league and position can all be shared by different athletes.
  // This workflow requires an explicit saved affiliation in publisher metadata.
  if (!affiliation) return 0.35;
  return Math.min(0.98, 0.8 + Number(affiliation) * 0.1 + Number(sport) * 0.05);
}
export async function discoverNews(identity: NewsIdentity, provider: SearchProvider | null,
  extract: (url: string, signal: AbortSignal) => Promise<ArticleMetadata | null>, signal: AbortSignal): Promise<NewsResult> {
  const result: NewsResult = { articles: [], candidates: 0, rejected: 0, duplicates: 0, errors: [], status: "complete" };
  if (!provider) return { ...result, status: "unavailable", errors: ["search_not_configured"] };
  const urls = new Set<string>();
  const discovered: string[] = [];
  for (const query of identityQueries(identity)) {
    if (signal.aborted) break;
    try {
      const candidates = await provider.search(query, signal);
      for (const candidate of candidates.slice(0, 8)) {
        result.candidates++;
        discovered.push(candidate.url);
        result.source_policy = policyDiagnostics(discovered, "EXTRACT_METADATA");
        if (!evaluateSource(candidate.url).allowed_actions.includes("EXTRACT_METADATA")) { result.rejected++; continue; }
        const url = normalizeArticleUrl(candidate.url);
        if (!url) { result.rejected++; continue; }
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
  for (let i = 0; i < candidates.length && !signal.aborted; i += 3) {
    const batch = await Promise.all(candidates.slice(i, i + 3).map(async (url): Promise<PlayerArticle | null> => {
      try {
        requireSourceAction(url, "EXTRACT_METADATA");
        const article = await extract(url, signal);
        if (!article) { result.rejected++; return null; }
        requireSourceAction(article.article_url, "EXTRACT_METADATA");
        requireSourceAction(article.canonical_url, "EXTRACT_METADATA");
        requireSourceAction(article.canonical_url, "PERSIST_METADATA");
        const confidence = articleRelevance(article, identity);
        if (confidence < 0.8) {
          console.info("preview_news_identity_rejected", { domain: article.source_domain, headline: article.headline.slice(0, 300), confidence });
          result.rejected++; return null;
        }
        return { ...article, thumbnail_url: remoteAssetReference(article.thumbnail_url),
          metadata: { extraction: article.metadata.extraction, provenance: sourceProvenance(article.canonical_url, provider.name, confidence) }, discovery_source: provider.name, discovered_at: new Date().toISOString(),
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
