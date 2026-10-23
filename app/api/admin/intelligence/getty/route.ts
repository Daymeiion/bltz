import { authorizeIntelligenceLab, IntelligenceAccessError } from "@/lib/intelligence/lab-server";
import { safeSourceUrl } from "@/lib/intelligence/lab-format";

export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" };
type GettyAsset = { id?: unknown; title?: unknown; caption?: unknown; date_created?: unknown; artist?: unknown; collection_name?: unknown; clip_length?: unknown; display_sizes?: Array<{ name?: unknown; uri?: unknown }> };

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
 * Mockup-only, read-only Getty editorial search for photos (default) or video (`type=video`).
 * Runs only for internal admins and only when a server-side GETTY_API_KEY exists. Returns
 * display metadata, never the key or raw payload. Search results are discovery, not
 * licensing: usage rights are confirmed on Getty Images.
 */
export async function GET(request: Request) {
  try { await authorizeIntelligenceLab(); }
  catch (error) { return Response.json({ state: "forbidden" }, { status: error instanceof IntelligenceAccessError ? error.status : 403, headers: HEADERS }); }
  const params = new URL(request.url).searchParams;
  const phrase = params.get("q")?.trim().slice(0, 80) ?? "";
  const type = params.get("type") === "video" ? "video" : "image";
  if (!phrase) return Response.json({ state: "invalid" }, { status: 400, headers: HEADERS });
  const key = process.env.GETTY_API_KEY?.trim();
  if (!key) return Response.json({ state: "not_configured", images: [] }, { headers: HEADERS });
  const search = SEARCH[type];
  const url = new URL(`https://api.gettyimages.com/v3/search/${search.path}/editorial`);
  url.search = new URLSearchParams({ phrase, page_size: "30", sort_order: "best_match", fields: search.fields }).toString();
  try {
    const response = await fetch(url, { headers: { "Api-Key": key, Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (response.status === 429) return Response.json({ state: "rate_limited", images: [] }, { status: 503, headers: HEADERS });
    if (!response.ok) return Response.json({ state: "unavailable", images: [] }, { status: 502, headers: HEADERS });
    const body = await response.json() as { images?: GettyAsset[]; videos?: GettyAsset[]; result_count?: unknown };
    const assets = (type === "video" ? body.videos : body.images) ?? [];
    const images = assets.flatMap(asset => {
      const id = typeof asset.id === "string" && /^[0-9A-Za-z-]{1,40}$/.test(asset.id) ? asset.id : null;
      const size = (name: string) => { const uri = asset.display_sizes?.find(row => row.name === name)?.uri; return typeof uri === "string" ? safeSourceUrl(uri) : null; };
      const thumb = size("thumb") ?? (type === "image" ? size("comp") : null);
      if (!id || !thumb) return [];
      const text = (value: unknown) => typeof value === "string" ? value.slice(0, 300) : null;
      return [{ id, title: text(asset.title) ?? search.fallback, caption: text(asset.caption), date: text(asset.date_created)?.slice(0, 10) ?? null, artist: text(asset.artist), collection: text(asset.collection_name), thumb, comp: size("comp"),
        detailUrl: `https://www.gettyimages.com/detail/${encodeURIComponent(id)}`, ...(type === "video" ? { duration: clipDuration(asset.clip_length) } : {}) }];
    });
    return Response.json({ state: "ready", total: typeof body.result_count === "number" ? body.result_count : images.length, images }, { headers: HEADERS });
  } catch { return Response.json({ state: "unavailable", images: [] }, { status: 502, headers: HEADERS }); }
}
