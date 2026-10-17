import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { articleRelevance } from "@/lib/enrichment/news";
import { isNewsArticleUrl } from "@/lib/enrichment/news-classification";
import { previewIdentityKey, previewNewsIdentity, withSchoolAliases } from "./enrichment";
import type { PreviewContent } from "./validation";
import { newsReviewSchema } from "./news-review";
import { PreviewError } from "./server";

/** Admin caller only. No discovery or mutation, and never used by Locker readers. */
export async function readNewsReview(client: SupabaseClient, id: string, content: PreviewContent, dismissedOffset = 0) {
  const identityKey = previewIdentityKey(content);
  const [articles, dismissed, state] = await Promise.all([
    client.from("player_articles").select("headline,article_url,canonical_url,publisher,source_domain,author,published_at,thumbnail_url,summary,metadata,discovery_source,discovered_at,relevance_score,confidence,featured,review_keys")
      .eq("preview_id", id).eq("identity_key", identityKey).eq("status", "review").order("created_at", { ascending: true }).order("id", { ascending: true }).limit(200),
    client.from("player_articles").select("headline,article_url,canonical_url,publisher,source_domain,author,published_at,thumbnail_url,summary,metadata,discovery_source,discovered_at,relevance_score,confidence,featured,review_keys")
      .eq("preview_id", id).eq("identity_key", identityKey).eq("status", "rejected").order("created_at", { ascending: false }).order("id", { ascending: false }).range(dismissedOffset, dismissedOffset + 200),
    client.from("preview_enrichments").select("news_review_version,news_searched_at,identity_key").eq("preview_id", id).maybeSingle(),
  ]);
  if (articles.error || dismissed.error || state.error) throw new PreviewError("news_review_unavailable", 503);
  const parsed = newsReviewSchema.safeParse({ articles: articles.data ?? [], dismissed_articles: (dismissed.data ?? []).slice(0, 200), dismissed_offset: dismissedOffset, dismissed_has_more: (dismissed.data?.length ?? 0) > 200, version: state.data?.news_review_version ?? 1,
    searched_at: state.data?.identity_key === identityKey ? state.data.news_searched_at : null, identity_key: identityKey });
  if (!parsed.success) throw new PreviewError("news_review_unavailable", 503);
  const identity = parsed.data.articles.length ? await withSchoolAliases(client, previewNewsIdentity(content)) : previewNewsIdentity(content);
  return { ...parsed.data, articles: parsed.data.articles.filter(article => isNewsArticleUrl(article.article_url) && isNewsArticleUrl(article.canonical_url) && articleRelevance(article, identity) >= 0.8) };
}
