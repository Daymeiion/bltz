import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeAward, normalizeAwards, catalogImage, type CatalogAward, type NormalizedAward } from "@/lib/enrichment/awards";
import type { EnrichmentDatabase } from "@/types/enrichment.generated";
import type { Json } from "@/types/database.generated";
import { discoverNews, headlineKey, type NewsIdentity, type NewsResult, type PlayerArticle } from "@/lib/enrichment/news";
import { extractArticleMetadata } from "@/lib/enrichment/article-metadata";
import { fetchArticleHtml } from "@/lib/enrichment/safe-fetch";
import { configuredSearchProvider } from "@/lib/enrichment/search-provider";
import { isNewsArticleUrl } from "@/lib/enrichment/news-classification";
import type { PreviewContent } from "./validation";

export function previewNewsIdentity(content: Pick<PreviewContent, "full_name" | "position" | "pro_teams" | "school" | "schools">): NewsIdentity {
  return { fullName: content.full_name, sport: "football", position: content.position ?? undefined,
    teams: content.pro_teams.map(t => t.label), schools: [...new Set([content.school, ...content.schools.map(t => t.label)].filter((s): s is string => !!s))] };
}
export function previewIdentityKey(content: Pick<PreviewContent, "full_name" | "position" | "pro_teams" | "school" | "schools">): string {
  return createHash("sha256").update(JSON.stringify(previewNewsIdentity(content))).digest("hex");
}
export interface EnrichmentReport {
  news_status?: NewsResult["status"] | "skipped";
  last_news_success?: Omit<EnrichmentReport, "last_news_success"> | null;
  status: "complete" | "partial" | "unavailable";
  awards_discovered: number; awards_normalized: number; unmapped_awards: string[];
  article_candidates: number; articles_accepted: number; articles_rejected: number; article_duplicates: number;
  errors: string[]; updated_at: string;
}
export interface EnrichmentSnapshot {
  awards: NormalizedAward[] | null; news: NewsResult | null; report: EnrichmentReport;
}
/** Independent optional stages: neither stage is allowed to fail preview creation. */
export async function buildEnrichment(content: PreviewContent, dependencies: {
  awards: () => Promise<NormalizedAward[]>;
  news: () => Promise<NewsResult>;
}): Promise<EnrichmentSnapshot> {
  const [awards, news] = await Promise.allSettled([Promise.resolve().then(dependencies.awards), Promise.resolve().then(dependencies.news)]);
  const normalized = awards.status === "fulfilled" ? awards.value : null;
  const articles = news.status === "fulfilled" ? news.value : null;
  const newsError = news.status === "rejected" && news.reason instanceof Error && news.reason.message === "news_rate_limited" ? "news_rate_limited" : "news_unavailable";
  const errors = [...(normalized ? [] : ["awards_unavailable"]), ...(articles?.errors ?? [newsError])];
  return { awards: normalized, news: articles, report: {
    status: errors.length ? (normalized || articles?.articles.length ? "partial" : "unavailable") : "complete",
    awards_discovered: content.awards.length, awards_normalized: normalized?.filter(a => a.award_id).length ?? 0,
    unmapped_awards: normalized?.filter(a => !a.award_id).map(a => a.raw_label) ?? [],
    article_candidates: articles?.candidates ?? 0, articles_accepted: articles?.articles.length ?? 0,
    articles_rejected: articles?.rejected ?? 0, article_duplicates: articles?.duplicates ?? 0,
    errors, updated_at: new Date().toISOString(),
  } };
}

export async function enrichSavedPreview(client: SupabaseClient, id: string, content: PreviewContent, revision: number, refreshNews = true, knownUrls: string[] = []): Promise<EnrichmentReport> {
  const startedAt = new Date().toISOString();
  const identityKey = previewIdentityKey(content);
  const previous = await client.from("preview_enrichments").select("report,identity_key").eq("preview_id", id).maybeSingle();
  // Never spend the discovery budget on a result that cannot be persisted.
  // This also keeps base preview saves available while an additive migration is pending.
  if (previous.error) return {
    status: "unavailable", news_status: "unavailable", awards_discovered: content.awards.length,
    awards_normalized: 0, unmapped_awards: [], article_candidates: 0, articles_accepted: 0,
    articles_rejected: 0, article_duplicates: 0, errors: ["enrichment_unavailable", "enrichment_not_saved"], updated_at: startedAt,
  };
  const needsNews = refreshNews || (!previous.error && (!previous.data || previous.data.identity_key !== identityKey));
  const snapshot = await buildEnrichment(content, {
    async awards() {
      const { data, error } = await client.from("award_catalog").select("*").eq("active", true);
      if (error || !data) throw new Error("catalog_unavailable");
      return normalizeAwards(content.awards, data as CatalogAward[]);
    },
    async news() {
      if (!needsNews) return { articles: [], candidates: 0, rejected: 0, duplicates: 0, errors: [], status: "complete" };
      const provider = configuredSearchProvider();
      if (!provider) return discoverNews(previewNewsIdentity(content), null, async () => null, AbortSignal.timeout(1));
      // Reuse the existing per-admin daily budget and identity cooldown.
      const admission = await client.rpc("admit_preview_discovery", { p_identity_hash: createHash("sha256").update(`news:${identityKey}`).digest("hex") });
      if (admission.error || !admission.data) throw new Error("news_rate_limited");
      let succeeded = false;
      try {
        const result = await discoverNews(previewNewsIdentity(content), provider, async (url, signal) => {
          const page = await fetchArticleHtml(url, signal);
          return extractArticleMetadata(page.html, page.url);
        }, AbortSignal.timeout(50_000), knownUrls);
        succeeded = result.status !== "unavailable";
        return result;
      } finally { await client.rpc("finalize_preview_discovery", { p_request_id: admission.data, p_succeeded: succeeded }); }
    },
  });
  snapshot.report.news_status = !needsNews ? "skipped" : snapshot.news?.status ?? "unavailable";
  const { data, error } = await (client as SupabaseClient<EnrichmentDatabase>).rpc("save_preview_enrichment", {
    p_preview_id: id, p_revision: revision, p_identity_key: identityKey, p_started_at: startedAt,
    p_awards: snapshot.awards as unknown as Json,
    p_articles: (needsNews && snapshot.news && snapshot.news.status !== "unavailable"
      ? snapshot.news.articles.map(a => ({ ...a, headline_key: headlineKey(a) })) : null) as unknown as Json,
    p_report: snapshot.report as unknown as Json,
  });
  if (error) return { ...snapshot.report, status: "unavailable", errors: [...snapshot.report.errors, ["PT409", "40001"].includes(error.code) ? "preview_changed" : "enrichment_not_saved"] };
  return data as unknown as EnrichmentReport;
}

/** Caller already has the RLS-protected preview. No discovery, fetch, or mutation. */
export async function readPreviewEnrichment(client: SupabaseClient, id: string, content: PreviewContent, revision: number, identityKey = previewIdentityKey(content)) {
  const [awardResult, articleResult] = await Promise.all([
    client.from("preview_award_links").select("raw_label,year,edition,source_url,award_catalog(*)").eq("preview_id", id).eq("source_revision", revision),
    client.from("player_articles").select("headline,article_url,canonical_url,publisher,source_domain,author,published_at,thumbnail_url,summary,metadata,discovery_source,discovered_at,relevance_score,confidence,featured,status")
      .eq("preview_id", id).eq("source_revision", revision).eq("identity_key", identityKey).eq("status", "accepted").order("published_at", { ascending: false, nullsFirst: false }).limit(24),
  ]);
  const links = (awardResult.error ? [] : awardResult.data ?? []) as unknown as Array<{ raw_label: string; year: string; edition: string; source_url: string | null; award_catalog: CatalogAward | null }>;
  const seen = new Set<string>();
  const linkedCatalog = [...new Map(links.flatMap(link => link.award_catalog ? [[link.award_catalog.id, link.award_catalog] as const] : [])).values()];
  return {
    awards: content.awards.flatMap(input => {
      const normalized = normalizeAward(input, linkedCatalog);
      const link = links.find(a => (a.raw_label === input.label || (normalized.award_id && a.award_catalog?.id === normalized.award_id)) && a.year === normalized.year && a.edition === normalized.edition);
      const award = link?.award_catalog;
      if (!award?.active) return [{ ...input, evidenceStatus: "unverified" as const }];
      const key = JSON.stringify([award.id, link?.year, link?.edition]);
      if (seen.has(key)) return [];
      seen.add(key);
      return [{ ...input, evidenceStatus: "unverified" as const, label: award.name, year: link?.year || input.year,
        // A placeholder catalog entry must not erase an admin-selected preview image.
        imageUrl: catalogImage(award) || input.imageUrl, photoId: catalogImage(award) ? null : input.photoId, attribution: award.attribution,
        description: input.description || award.description || undefined }];
    }),
    articles: ((articleResult.error ? [] : articleResult.data ?? []) as PlayerArticle[]).filter(article => isNewsArticleUrl(article.article_url)),
  };
}

/** A saved base preview remains a successful operation even when enrichment fails. */
export async function tryEnrichSavedPreview(...args: Parameters<typeof enrichSavedPreview>): Promise<EnrichmentReport | { status: "unavailable"; errors: string[] }> {
  try { return await enrichSavedPreview(...args); }
  catch { return { status: "unavailable", errors: ["enrichment_unavailable"] }; }
}



/** Server-only admin caller supplies a client after authorizing the saved preview. */
export async function readPreviewNewsCandidates(client: SupabaseClient, id: string, content: PreviewContent, revision: number): Promise<string[]> {
  const { data, error } = await client.from("player_articles").select("article_url")
    .eq("preview_id", id).eq("source_revision", revision).eq("identity_key", previewIdentityKey(content))
    .in("status", ["accepted", "inactive"]).order("discovered_at", { ascending: false }).limit(24);
  if (error) throw new Error("saved_news_unavailable");
  return [...new Set((data ?? []).map(row => row.article_url as string).filter(isNewsArticleUrl))].slice(0, 6);
}
