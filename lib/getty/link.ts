import { safeSourceUrl } from "@/lib/intelligence/lab-format";

/** Getty asset ID from a gettyimages.com link, e.g. /detail/news-photo/...-news-photo/72137869. */
export function gettyAssetFromLink(value: string): { id: string; url: string } | null {
  const url = safeSourceUrl(value.trim());
  if (!url) return null;
  const parsed = new URL(url);
  if (!/(^|\.)gettyimages\.[a-z.]+$/.test(parsed.hostname)) return null;
  const id = parsed.pathname.match(/\/detail\/(?:[^/]+\/)*?(?:[^/]*?-)?(\d{5,})(?:\/|$)/)?.[1] ?? parsed.pathname.match(/(\d{5,})\/?$/)?.[1];
  return id ? { id, url: `https://www.gettyimages.com/detail/${id}` } : null;
}
