import "server-only";

import { safeSourceUrl } from "@/lib/intelligence/lab-format";

export const GETTY_HEADERS = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" };

type GettyAsset = { id?: unknown; title?: unknown; caption?: unknown; date_created?: unknown; artist?: unknown; collection_name?: unknown; clip_length?: unknown; display_sizes?: Array<{ name?: unknown; uri?: unknown }> };

export type GettyResult = { id: string; title: string; caption: string | null; date: string | null; artist: string | null; collection: string | null; thumb: string; comp: string | null; detailUrl: string; duration?: string | null };
export type GettySearch =
  | { state: "ready"; total: number; images: GettyResult[] }
  | { state: "not_configured" | "unavailable" | "rate_limited"; images: [] };

/** Editorial search per asset type; video results use their own fields and response key. */
const SEARCH = {
  image: { path: "images", fields: "id,title,caption,date_created,artist,collection_name,thumb,comp", fallback: "Getty Images photo" },
  video: { path: "videos", fields: "id,title,caption,date_created,clip_length,collection_name,thumb,comp", fallback: "Getty Images video" },
} as const;

/** "00:00:19:12" timecode → "0:19"; anything else is dropped. */
function clipDuration(value: unknown): string | null {
  const match = typeof value === "string" ? /^(\d{2}):(\d{2}):(\d{2})(?::\d{2})?$/.exec(value) : null;
  if (!match) return null;
  const [hours, minutes, seconds] = match.slice(1).map(Number);
  const total = hours * 3600 + minutes * 60 + seconds;
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * Read-only Getty editorial search for photos or video, using the server-side
 * GETTY_API_KEY. Returns display metadata, never the key or raw payload.
 * Results are discovery, not licensing: usage rights are confirmed on Getty.
 * Callers authorize first.
 */
export async function searchGetty(phrase: string, type: "image" | "video"): Promise<GettySearch> {
  const key = process.env.GETTY_API_KEY?.trim();
  if (!key) return { state: "not_configured", images: [] };
  const search = SEARCH[type];
  const url = new URL(`https://api.gettyimages.com/v3/search/${search.path}/editorial`);
  url.search = new URLSearchParams({ phrase, page_size: "30", sort_order: "best_match", fields: search.fields }).toString();
  try {
    const response = await fetch(url, { headers: { "Api-Key": key, Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (response.status === 429) return { state: "rate_limited", images: [] };
    if (!response.ok) return { state: "unavailable", images: [] };
    const body = await response.json() as { images?: GettyAsset[]; videos?: GettyAsset[]; result_count?: unknown };
    const assets = (type === "video" ? body.videos : body.images) ?? [];
    const images = assets.flatMap((asset): GettyResult[] => {
      const id = typeof asset.id === "string" && /^[0-9A-Za-z-]{1,40}$/.test(asset.id) ? asset.id : null;
      const size = (name: string) => { const uri = asset.display_sizes?.find(row => row.name === name)?.uri; return typeof uri === "string" ? safeSourceUrl(uri) : null; };
      const thumb = size("thumb") ?? (type === "image" ? size("comp") : null);
      if (!id || !thumb) return [];
      const text = (value: unknown) => typeof value === "string" ? value.slice(0, 300) : null;
      return [{ id, title: text(asset.title) ?? search.fallback, caption: text(asset.caption), date: text(asset.date_created)?.slice(0, 10) ?? null, artist: text(asset.artist), collection: text(asset.collection_name), thumb, comp: size("comp"),
        detailUrl: `https://www.gettyimages.com/detail/${encodeURIComponent(id)}`, ...(type === "video" ? { duration: clipDuration(asset.clip_length) } : {}) }];
    });
    return { state: "ready", total: typeof body.result_count === "number" ? body.result_count : images.length, images };
  } catch {
    return { state: "unavailable", images: [] };
  }
}

const SEARCH_STATUS: Record<GettySearch["state"], number> = { ready: 200, not_configured: 200, rate_limited: 503, unavailable: 502 };

export function gettyResponse(result: GettySearch): Response {
  return Response.json(result, { status: SEARCH_STATUS[result.state], headers: GETTY_HEADERS });
}

export { gettyAssetFromLink } from "./link";
