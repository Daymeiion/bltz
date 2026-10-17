import { dedupeArticles, normalizeArticleUrl, type PlayerArticle } from "@/lib/enrichment/news";
import { remoteAssetReference } from "@/lib/source-policy/policy";
import type { PreviewContent } from "./validation";

export type ArticleEdit = PreviewContent["article_edits"][number];
export function editScrapedArticle(article: PlayerArticle, id: string): ArticleEdit {
  return { id, sourceUrl: article.article_url, visible: true, headline: article.headline,
    publisher: article.publisher, articleUrl: article.article_url, imageUrl: article.thumbnail_url,
    summary: article.summary, publishedAt: article.published_at?.slice(0, 10) ?? null };
}

/** Editorial additions/overrides survive refresh; the scraped evidence stays separate. */
export function curatedArticles(scraped: PlayerArticle[], edits: ArticleEdit[] = [], updatedAt = ""): PlayerArticle[] {
  if (!edits.length) return scraped;
  const controlled = new Set(edits.flatMap(edit => [normalizeArticleUrl(edit.articleUrl), ...(edit.sourceUrl ? [normalizeArticleUrl(edit.sourceUrl)] : [])]));
  const articles = edits.filter(edit => edit.visible).map((edit): PlayerArticle => ({
    headline: edit.headline, publisher: edit.publisher, article_url: edit.articleUrl, canonical_url: edit.articleUrl,
    source_domain: new URL(edit.articleUrl).hostname.replace(/^www\./, ""), thumbnail_url: remoteAssetReference(edit.imageUrl),
    summary: edit.summary, published_at: edit.publishedAt ? `${edit.publishedAt}T00:00:00.000Z` : null,
    author: null, metadata: { extraction: "Admin" }, discovery_source: "admin",
    discovered_at: updatedAt, relevance_score: 0, confidence: 0, featured: false, status: "accepted",
  }));
  return dedupeArticles([...articles, ...scraped.filter(article => !controlled.has(normalizeArticleUrl(article.article_url)) && !controlled.has(normalizeArticleUrl(article.canonical_url)))]);
}

export function lockerMerchandise(items: PreviewContent["merchandise"] = []) {
  return items.filter(item => item.visible).map(item => ({ ...item, imageUrl: remoteAssetReference(item.imageUrl) }));
}
