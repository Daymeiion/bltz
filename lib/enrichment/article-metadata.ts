import { isPreviewUrl } from "@/lib/preview-lockers/validation";
import { decodeHTML } from "entities";
import { normalizeArticleUrl, type ArticleMetadata } from "./news";

type ObjectValue = Record<string, unknown>;
const object = (v: unknown): ObjectValue => v && typeof v === "object" && !Array.isArray(v) ? v as ObjectValue : {};
const clean = (v: unknown, max = 500): string => typeof v === "string" ? decodeHTML(v.replace(/<[^>]*>/g, " ")).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";
function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) out[match[1].toLowerCase()] = decodeHTML(match[2] ?? match[3] ?? match[4]);
  return out;
}
function nodes(value: unknown, depth = 0): ObjectValue[] {
  if (depth > 12) return [];
  if (Array.isArray(value)) return value.slice(0, 100).flatMap(v => nodes(v, depth + 1));
  const item = object(value);
  return Object.keys(item).length ? [item, ...nodes(item["@graph"], depth + 1), ...nodes(item.mainEntity, depth + 1)] : [];
}
function imageValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(imageValue).find(Boolean) ?? "";
  return typeof value === "string" ? value : clean(object(value).url || object(value).contentUrl, 2048);
}
// CDN signatures and transforms depend on the exact path and query order.
function imageUrl(value: string | undefined, base: string): string | null {
  if (!value) return null;
  try { const url = new URL(value, base); return isPreviewUrl(url.href) ? url.href : null; } catch { return null; }
}
function nameValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(nameValue).filter(Boolean).join(", ").slice(0, 200);
  return typeof value === "string" ? clean(value, 200) : clean(object(value).name, 200);
}

/** Reads metadata only. Article body fields and HTML are never returned or persisted. */
export function extractArticleMetadata(html: string, articleUrl: string): ArticleMetadata | null {
  const url = normalizeArticleUrl(articleUrl); if (!url) return null;
  const meta: Record<string, string> = {}; const structured: ObjectValue[] = [];
  let canonical = "";
  const document = html.replace(/<!--[\s\S]*?-->/g, "");
  for (const script of document.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (attrs(script[1]).type?.toLowerCase() !== "application/ld+json") continue;
    try { structured.push(...nodes(JSON.parse(script[2]))); } catch { /* malformed JSON-LD falls back to metadata */ }
  }
  // Avoid treating tag-like strings inside scripts as actual page metadata.
  const tags = document.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "");
  for (const tag of tags.matchAll(/<(meta|link)\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi)) {
    const a = attrs(tag[0]);
    if (tag[1].toLowerCase() === "meta") {
      const key = (a.property || a.name || "").toLowerCase();
      if (key && a.content && !meta[key]) meta[key] = a.content;
    } else if (a.rel?.toLowerCase().split(/\s+/).includes("canonical")) canonical ||= a.href || "";
  }
  const ofType = (node: ObjectValue, type: string) => [node["@type"]].flat().some(t => typeof t === "string" && t.replace(/^https?:\/\/schema.org\//, "") === type);
  const news = structured.find(n => ofType(n, "NewsArticle"));
  const article = structured.find(n => ofType(n, "Article"));
  const pick = (key: string) => news?.[key] || article?.[key];
  const title = clean(pick("headline") || meta["og:title"] || meta["twitter:title"] || /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(tags)?.[1], 300);
  if (!title) return null;
  const canonicalCandidate = normalizeArticleUrl(canonical || clean(pick("url"), 2048) || clean(object(pick("mainEntityOfPage"))["@id"], 2048) || meta["og:url"] || url, url);
  // Cross-domain canonical hints are untrusted. Keep the fetched publisher URL.
  const canonicalUrl = canonicalCandidate && new URL(canonicalCandidate).hostname.replace(/^www\./, "") === new URL(url).hostname.replace(/^www\./, "") ? canonicalCandidate : url;
  const rawDate = clean(pick("datePublished") || meta["article:published_time"] || meta["date"], 80);
  const date = rawDate ? new Date(rawDate) : null;
  const thumbnail = [meta["og:image:secure_url"], meta["og:image"], meta["og:image:url"], meta["twitter:image"], meta["twitter:image:src"], imageValue(news?.image), imageValue(article?.image)]
    .map(value => imageUrl(value, url)).find(Boolean) ?? null;
  return {
    headline: title, article_url: url, canonical_url: canonicalUrl, source_domain: new URL(canonicalUrl).hostname.replace(/^www\./, ""),
    publisher: nameValue(pick("publisher")) || clean(meta["og:site_name"], 200) || new URL(url).hostname.replace(/^www\./, ""),
    author: nameValue(pick("author")) || clean(meta.author, 200) || null,
    published_at: date && Number.isFinite(date.getTime()) ? date.toISOString() : null,
    thumbnail_url: thumbnail,
    summary: clean(pick("description") || meta["og:description"] || meta["twitter:description"] || meta.description, 500),
    metadata: { extraction: news ? "NewsArticle" : article ? "Article" : meta["og:title"] ? "OpenGraph" : meta["twitter:title"] ? "Twitter" : "HTML" },
  };
}
