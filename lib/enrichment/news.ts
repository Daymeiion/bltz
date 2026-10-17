import { isPreviewUrl } from "@/lib/preview-lockers/validation";
import { SearchProviderError } from "@/lib/search/errors";
import { isNewsArticleUrl } from "./news-classification";
import { evaluateSource, requireSourceAction, remoteAssetReference, sourceProvenance, policyDiagnostics, type SourceProvenance, type PolicyDiagnostics } from "@/lib/source-policy/policy";
import { mentionsSchool, schoolDisplayName, schoolsMatch } from "@/lib/player/school-identity";
import { canonicalizeTeam, NFL_FULL_NAMES } from "@/lib/pipeline/teams";

export interface NewsIdentity {
  fullName: string; aliases?: string[]; sport: string; league?: string;
  teams: string[]; schools: string[]; position?: string; activeYears?: string[];
  /** Saved schools before directory aliases are expanded for metadata matching. */
  searchSchools?: string[];
}
export interface SearchProvider {
  name: string;
  search(query: string, signal: AbortSignal): Promise<Array<{ url: string; title?: string }>>;
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
  articles: PlayerArticle[]; candidates: number; rejected: number; duplicates: number;
  errors: string[]; status: "complete" | "partial" | "unavailable";
  source_policy?: PolicyDiagnostics;
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
export const headlineKey = (article: Pick<ArticleMetadata, "source_domain" | "headline">) => `${article.source_domain.replace(/^www\./, "")}|${words(article.headline)}`;
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
  return identitySearchTerms(identity).map(term => `${term} news interviews`);
}
/** Shared, bounded college/team queries; never permits a name-only search. */
export function identitySearchTerms(identity: NewsIdentity): string[] {
  const clean = (value: string) => value.replace(/["\\\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim();
  const name = clean(identity.fullName);
  if (words(name).split(" ").filter(Boolean).length < 2) return [];
  const schools: string[] = [];
  for (const school of identity.searchSchools ?? identity.schools) {
    const label = schoolDisplayName(clean(school));
    if (label && !schools.some(saved => schoolsMatch(saved, label))) schools.push(label);
  }
  const teams = [...new Set(identity.teams.map(team => canonicalizeTeam(clean(team))).filter(Boolean))];
  // Alternate college and pro history so one category cannot consume the budget.
  const context: string[] = [];
  for (let i = 0; i < Math.max(schools.length, teams.length); i++) {
    if (schools[i]) context.push(schools[i]);
    if (teams[i]) context.push(teams[i]);
  }
  // No name-only searches: saved affiliations are necessary to disambiguate.
  return [...new Set(context)].slice(0, 8).map(term => `"${name}" ${clean(identity.sport)} ${term}`);
}
export function articleRelevance(article: Pick<ArticleMetadata, "headline" | "summary">, identity: NewsIdentity): number {
  const text = ` ${words(`${article.headline} ${article.summary}`)} `;
  const has = (value: string) => value.trim().length >= 2 && text.includes(` ${words(value)} `);
  if (![identity.fullName, ...(identity.aliases ?? [])].some(has)) return 0;
  const sport = has(identity.sport) || (words(identity.sport) === "football" &&
    ["NFL", "Super Bowl", "quarterback", "cornerback", "linebacker", "wide receiver", "tight end", "running back", "defensive back", "offensive tackle", "defensive tackle"].some(has));
  const affiliation = identity.teams.some(team => {
    const full = canonicalizeTeam(team);
    if (has(full)) return true;
    // Publisher metadata commonly omits the franchise city. Only derive nicknames
    // from known NFL teams, and still require independent football evidence.
    const known = NFL_FULL_NAMES.find(name => words(name) === words(full));
    return known ? has(known.split(" ").at(-1)!) : false;
  }) || identity.schools.some(school => mentionsSchool(`${article.headline} ${article.summary}`, school));
  // Names, sport, league and position can all be shared by different athletes.
  // This workflow requires an explicit saved affiliation in publisher metadata.
  if (!affiliation || !sport) return 0.35;
  return 0.95;
}
export async function discoverNews(identity: NewsIdentity, provider: SearchProvider | null,
  extract: (url: string, signal: AbortSignal) => Promise<ArticleMetadata | null>, signal: AbortSignal, knownUrls: string[] = []): Promise<NewsResult> {
  const result: NewsResult = { articles: [], candidates: 0, rejected: 0, duplicates: 0, errors: [], status: "complete" };
  if (!provider) return { ...result, status: "unavailable", errors: ["search_not_configured"] };
  const queries = identityQueries(identity);
  if (!queries.length) return { ...result, status: "unavailable", errors: ["news_identity_incomplete"] };
  const urls = new Set<string>();
  const discovered: string[] = [];
  const permitsMetadata = (url: string) => {
    discovered.push(url);
    result.source_policy = policyDiagnostics(discovered, "EXTRACT_METADATA");
    return evaluateSource(url).allowed_actions.includes("EXTRACT_METADATA");
  };
  // Previously accepted URLs are candidates, never automatic retained evidence.
  // Re-fetch their publisher metadata and apply the same current identity gates.
  for (const candidate of [...new Set(knownUrls)].slice(0, 6)) {
    const url = normalizeArticleUrl(candidate);
    if (!url || !isNewsArticleUrl(url)) continue;
    result.candidates++;
    if (!permitsMetadata(url)) { result.rejected++; continue; }
    urls.add(url);
  }
  const candidateGroups: string[][] = [[...urls]];
  for (let i = 0; i < queries.length; i += 3) {
    if (signal.aborted) break;
    const searches = await Promise.allSettled(queries.slice(i, i + 3).map(query => provider.search(query, signal)));
    for (const search of searches) {
      if (search.status === "rejected") {
        result.errors.push(search.reason instanceof SearchProviderError ? search.reason.code : "search_failed");
        continue;
      }
      const group: string[] = [];
      for (const candidate of search.value.slice(0, 8)) {
        result.candidates++;
        if (!permitsMetadata(candidate.url)) { result.rejected++; continue; }
        const url = normalizeArticleUrl(candidate.url);
        if (!url) { result.rejected++; continue; }
        if (!isNewsArticleUrl(url)) { result.rejected++; continue; }
        if (urls.has(url)) result.duplicates++; else { urls.add(url); group.push(url); }
      }
      candidateGroups.push(group);
    }
    // Preserve the last successful saved set if any query failed. Do not spend
    // another batch on invalid credentials, an exhausted budget or an outage.
    if (result.errors.length) return { ...result, errors: [...new Set(result.errors)], status: "unavailable" };
  }
  // Small bounded batches, no background jobs. Keep data only after metadata and identity gates.
  // Round-robin prevents the first team or six old URLs from starving later teams.
  const candidates: string[] = [];
  for (let rank = 0; rank < 8 && candidates.length < 12; rank++) {
    for (const group of candidateGroups) {
      if (group[rank] && candidates.length < 12) candidates.push(group[rank]);
    }
  }
  for (let i = 0; i < candidates.length && !signal.aborted; i += 4) {
    const batch = await Promise.all(candidates.slice(i, i + 4).map(async (url): Promise<PlayerArticle | null> => {
      try {
        requireSourceAction(url, "EXTRACT_METADATA");
        requireSourceAction(url, "PERSIST_METADATA");
        const article = await extract(url, signal);
        if (!article) { result.rejected++; return null; }
        requireSourceAction(article.article_url, "EXTRACT_METADATA");
        requireSourceAction(article.article_url, "PERSIST_METADATA");
        requireSourceAction(article.canonical_url, "EXTRACT_METADATA");
        requireSourceAction(article.canonical_url, "PERSIST_METADATA");
        if (!isNewsArticleUrl(article.article_url) || !isNewsArticleUrl(article.canonical_url)) { result.rejected++; return null; }
        const confidence = articleRelevance(article, identity);
        if (confidence < 0.8) { result.rejected++; return null; }
        return { ...article, thumbnail_url: remoteAssetReference(article.thumbnail_url),
          metadata: { extraction: article.metadata.extraction, provenance: sourceProvenance(article.canonical_url, provider.name, confidence) },
          discovery_source: provider.name, discovered_at: new Date().toISOString(),
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
