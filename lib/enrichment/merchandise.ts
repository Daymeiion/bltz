import { articleRelevance, identitySearchTerms, normalizeArticleUrl, type NewsIdentity, type SearchProvider } from "./news";
import { SearchProviderError } from "@/lib/search/errors";
import { evaluateSource, remoteAssetReference } from "@/lib/source-policy/policy";
import { canonicalizeTeam, NFL_FULL_NAMES } from "@/lib/pipeline/teams";
import { mentionsSchool } from "@/lib/player/school-identity";
import { previewMerchandise, previewUrl } from "@/lib/preview-lockers/validation";
import { z } from "zod";
import { clean } from "./article-metadata";

export const merchandiseCandidateSchema = previewMerchandise.omit({ id: true, visible: true }).extend({
  canonicalUrl: previewUrl, description: z.string().max(600), matchedAffiliations: z.array(z.string().max(160)).min(1).max(12),
  availability: z.enum(["in_stock", "out_of_stock", "unknown"]),
  evidence: z.enum(["seller_metadata", "search_result"]).optional(),
}).strict();
export const merchandiseResultSchema = z.object({
  items: z.array(merchandiseCandidateSchema).max(12), status: z.enum(["complete", "partial", "unavailable"]),
  candidates: z.number().int().nonnegative(), rejected: z.number().int().nonnegative(), errors: z.array(z.string().max(80)).max(20),
}).strict();
export type MerchandiseCandidate = z.infer<typeof merchandiseCandidateSchema>;
export type ProductMetadata = Omit<MerchandiseCandidate, "matchedAffiliations">;
export interface MerchandiseResult {
  items: MerchandiseCandidate[]; status: "complete" | "partial" | "unavailable";
  candidates: number; rejected: number; errors: string[];
}
export function isProductUrl(value: string): boolean {
  const url = normalizeArticleUrl(value);
  if (!url) return false;
  const parsed = new URL(url);
  return parsed.pathname !== "/" && !/(?:^|\/)(?:search|sch|s|collections?|categor(?:y|ies)|blogs?|news|articles?|players?|athletes?|rosters?)(?:\/|$)/i.test(parsed.pathname)
    && !["q", "query", "search", "_nkw", "searchTerm"].some(key => parsed.searchParams.has(key));
}
export function merchandiseQueries(identity: NewsIdentity): string[] {
  // Alternate college and team context, with a dedicated query for each product
  // kind so plentiful trading cards cannot consume the jersey search budget.
  return identitySearchTerms(identity).slice(0, 6).flatMap(term => [`${term} trading cards`, `${term} jersey`]);
}
export const MERCHANDISE_MARKETPLACES = ["ebay.com", "fanatics.com", "comc.com"] as const;
export function merchandiseSearchPlan(identity: NewsIdentity): Array<{ query: string; includeDomains?: readonly string[] }> {
  const general = merchandiseQueries(identity);
  if (!general.length) return [];
  const colleges = identitySearchTerms({ ...identity, teams: [] });
  const teams = identitySearchTerms({ ...identity, schools: [], searchSchools: [] });
  // Visit every marketplace in the first batch, then the alternate affiliation.
  // COMC gets card queries; eBay/Fanatics split college/team cards and jerseys.
  const targeted = [0, 1].flatMap(pass => MERCHANDISE_MARKETPLACES.map((domain, index) => {
    const contexts = pass === 0 ? (colleges.length ? colleges : teams) : (teams.length ? teams : colleges);
    const term = contexts[index % contexts.length];
    const category = domain === "comc.com" || (index === 0 ? pass === 0 : pass === 1) ? "trading cards" : "jersey";
    return { query: `${term} ${category}`, includeDomains: [domain] };
  }));
  const seen = new Set<string>();
  return [...targeted, ...general.map(query => ({ query }))].filter(search => {
    const key = JSON.stringify(["includeDomains" in search ? search.includeDomains : [], search.query]);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}
const words = (s: string) => ` ${s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
const detailPath = (url: string) => /\/(?:products?|items?|itm|dp|gp\/product|cards)\/[^/]+|\/isynmv1\/aucd\/\d+|(?:[\/+_-])p-\d+/i.test(new URL(url).pathname);
function reviewSuggestion(url: string, title: string | undefined, identity: NewsIdentity): ProductMetadata | null {
  const label = clean(title, 160);
  const category = /\b(?:trading cards?|football cards?|rookie cards?|upper deck|panini|topps|bowman|donruss|prizm)\b/i.test(label) ? "trading_card" : /\bjerseys?\b/i.test(label) ? "jersey" : null;
  if (!category || !detailPath(url)) return null;
  const suggestion: ProductMetadata = { title: label, category, productUrl: url, canonicalUrl: url,
    description: "", retailer: new URL(url).hostname.replace(/^www\./, ""), imageUrl: null,
    priceLabel: null, availability: "unknown", evidence: "search_result" };
  // A title can qualify a link for human review, never verify seller identity.
  return productMatchesIdentity(suggestion, identity) ? suggestion : null;
}
export function productAffiliations(product: ProductMetadata, identity: NewsIdentity): string[] {
  const text = `${product.title} ${product.description}`;
  const normalized = words(text);
  const teams = identity.teams.filter(team => {
    const full = canonicalizeTeam(team);
    return normalized.includes(words(full)) || (NFL_FULL_NAMES.includes(full) && normalized.includes(words(full.split(" ").at(-1)!)));
  });
  return [...new Set([...identity.schools.filter(school => mentionsSchool(text, school)), ...teams])].slice(0, 12);
}
export function productMatchesIdentity(product: ProductMetadata, identity: NewsIdentity): boolean {
  const text = `${product.title} ${product.description}`;
  // A full known NFL franchise is football evidence; a nickname alone is not.
  const fullNflTeam = NFL_FULL_NAMES.some(team => words(text).includes(words(team)));
  return articleRelevance({ headline: product.title, summary: `${product.description}${fullNflTeam ? " football" : ""}` }, identity) >= 0.8;
}
/** Suggestions only. This function cannot write a preview or publish a product. */
export async function discoverMerchandise(identity: NewsIdentity, provider: SearchProvider | null,
  extract: (url: string, signal: AbortSignal) => Promise<ProductMetadata | null>, signal: AbortSignal): Promise<MerchandiseResult> {
  const result: MerchandiseResult = { items: [], status: "complete", candidates: 0, rejected: 0, errors: [] };
  if (!provider) return { ...result, status: "unavailable", errors: ["search_not_configured"] };
  const searchesToRun = merchandiseSearchPlan(identity);
  if (!searchesToRun.length) return { ...result, status: "unavailable", errors: ["merchandise_identity_incomplete"] };
  const groups: string[][] = [], seen = new Set<string>(), titles = new Map<string, string>();
  const searchSignal = AbortSignal.any([signal, AbortSignal.timeout(30_000)]);
  for (let i = 0; i < searchesToRun.length && !searchSignal.aborted; i += 4) {
    const searches = await Promise.allSettled(searchesToRun.slice(i, i + 4).map(({ query, includeDomains }) => provider.search(query, searchSignal, { includeDomains })));
    for (const search of searches) {
      if (search.status === "rejected") {
        result.errors.push(search.reason instanceof SearchProviderError ? search.reason.code : "search_failed");
        continue;
      }
      const group: string[] = [];
      for (const item of search.value.slice(0, 6)) {
        result.candidates++;
        const url = normalizeArticleUrl(item.url);
        if (!url || !isProductUrl(url) || !evaluateSource(url).allowed_actions.includes("EXTRACT_METADATA") || !evaluateSource(url).allowed_actions.includes("PERSIST_METADATA")) { result.rejected++; continue; }
        if (typeof item.title === "string" && !titles.has(url)) titles.set(url, item.title);
        if (!seen.has(url)) { seen.add(url); group.push(url); }
      }
      groups.push(group);
    }
    if (result.errors.length) break;
  }
  if (searchSignal.aborted) result.errors.push("search_timeout");
  const candidates: string[] = [];
  // Search ranking favors profiles, news and catalogs for long-retired players.
  // Give individual listing paths the bounded metadata slots first, across all
  // affiliations/categories. URL shape is scheduling only, never identity proof;
  // metadata-backed results still need seller metadata and the identity gates.
  for (const individual of [true, false]) {
    for (let rank = 0; rank < 6 && candidates.length < 16; rank++) for (const group of groups) {
      const url = group[rank];
      if (url && candidates.length < 16 && detailPath(url) === individual) candidates.push(url);
    }
  }
  const accepted = new Set<string>();
  for (let i = 0; i < candidates.length && !signal.aborted; i += 4) {
    const batch = await Promise.all(candidates.slice(i, i + 4).map(async url => {
      try {
        let product: ProductMetadata | null;
        try { product = await extract(url, signal); }
        catch (error) {
          // Never turn an unsafe destination, policy failure or cancellation into
          // a suggestion. Only a seller's blocked response is eligible here.
          if (!(error instanceof Error) || error.message !== "metadata_blocked" || signal.aborted) throw error;
          product = null; result.errors.push("merchandise_metadata_unavailable");
        }
        if (!product && !signal.aborted) {
          product = reviewSuggestion(url, titles.get(url), identity);
          if (product) result.errors.push("merchandise_metadata_unavailable");
        } else if (product) product = { ...product, evidence: "seller_metadata" };
        if (!product || !isProductUrl(product.productUrl) || !isProductUrl(product.canonicalUrl)
          || ![product.productUrl, product.canonicalUrl].every(value => evaluateSource(value).allowed_actions.includes("PERSIST_METADATA"))
          || !productMatchesIdentity(product, identity)) { result.rejected++; return null; }
        const parsed = merchandiseCandidateSchema.safeParse({ ...product, imageUrl: remoteAssetReference(product.imageUrl), matchedAffiliations: productAffiliations(product, identity) });
        if (!parsed.success) { result.rejected++; return null; }
        return parsed.data;
      } catch { result.rejected++; result.errors.push("merchandise_metadata_unavailable"); return null; }
    }));
    for (const product of batch) if (product && !accepted.has(normalizeArticleUrl(product.canonicalUrl)!)) {
      accepted.add(normalizeArticleUrl(product.canonicalUrl)!); result.items.push(product);
    }
  }
  if (signal.aborted) result.errors.push("search_timeout");
  result.items = result.items.slice(0, 12); result.errors = [...new Set(result.errors)];
  result.status = result.errors.length ? (result.items.length || groups.length ? "partial" : "unavailable") : "complete";
  return result;
}
