import { authorizeIntelligenceLab, IntelligenceAccessError } from "@/lib/intelligence/lab-server";
import { safeSourceUrl } from "@/lib/intelligence/lab-format";

export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" };
type GettyImage = { id?: unknown; title?: unknown; caption?: unknown; date_created?: unknown; artist?: unknown; collection_name?: unknown; display_sizes?: Array<{ name?: unknown; uri?: unknown }> };

/**
 * Mockup-only, read-only Getty editorial search. Runs only for internal admins and only when a
 * server-side GETTY_API_KEY exists. Returns display metadata, never the key or raw payload.
 * Search results are discovery, not licensing: usage rights are confirmed on Getty Images.
 */
export async function GET(request: Request) {
  try { await authorizeIntelligenceLab(); }
  catch (error) { return Response.json({ state: "forbidden" }, { status: error instanceof IntelligenceAccessError ? error.status : 403, headers: HEADERS }); }
  const phrase = new URL(request.url).searchParams.get("q")?.trim().slice(0, 80) ?? "";
  if (!phrase) return Response.json({ state: "invalid" }, { status: 400, headers: HEADERS });
  const key = process.env.GETTY_API_KEY?.trim();
  if (!key) return Response.json({ state: "not_configured", images: [] }, { headers: HEADERS });
  const url = new URL("https://api.gettyimages.com/v3/search/images/editorial");
  url.search = new URLSearchParams({ phrase, page_size: "30", sort_order: "best_match", fields: "id,title,caption,date_created,artist,collection_name,thumb,comp" }).toString();
  try {
    const response = await fetch(url, { headers: { "Api-Key": key, Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (response.status === 429) return Response.json({ state: "rate_limited", images: [] }, { status: 503, headers: HEADERS });
    if (!response.ok) return Response.json({ state: "unavailable", images: [] }, { status: 502, headers: HEADERS });
    const body = await response.json() as { images?: GettyImage[]; result_count?: unknown };
    const images = (body.images ?? []).flatMap(image => {
      const id = typeof image.id === "string" && /^[0-9A-Za-z-]{1,40}$/.test(image.id) ? image.id : null;
      const size = (name: string) => { const uri = image.display_sizes?.find(row => row.name === name)?.uri; return typeof uri === "string" ? safeSourceUrl(uri) : null; };
      const thumb = size("thumb") ?? size("comp");
      if (!id || !thumb) return [];
      const text = (value: unknown) => typeof value === "string" ? value.slice(0, 300) : null;
      return [{ id, title: text(image.title) ?? "Getty Images photo", caption: text(image.caption), date: text(image.date_created)?.slice(0, 10) ?? null, artist: text(image.artist), collection: text(image.collection_name), thumb, comp: size("comp"), detailUrl: `https://www.gettyimages.com/detail/${encodeURIComponent(id)}` }];
    });
    return Response.json({ state: "ready", total: typeof body.result_count === "number" ? body.result_count : images.length, images }, { headers: HEADERS });
  } catch { return Response.json({ state: "unavailable", images: [] }, { status: 502, headers: HEADERS }); }
}
