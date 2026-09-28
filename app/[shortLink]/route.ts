import { createServiceClient } from "@/lib/supabase/service";
import { validShortLinkAlias } from "@/lib/preview-lockers/short-link";

export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive, noimageindex",
};

export async function GET(_request: Request, context: { params: Promise<{ shortLink: string }> }) {
  const { shortLink } = await context.params;
  if (!validShortLinkAlias(shortLink)) return new Response(null, { status: 404, headers });
  const db = createServiceClient();
  const { data: link, error: linkError } = await db.from("preview_locker_short_links")
    .select("preview_id").eq("alias", shortLink).maybeSingle();
  if (linkError) return new Response(null, { status: 503, headers });
  if (!link) return new Response(null, { status: 404, headers });
  const { data: preview, error: previewError } = await db.from("preview_lockers")
    .select("slug").eq("id", link.preview_id).maybeSingle();
  if (previewError) return new Response(null, { status: 503, headers });
  if (!preview) return new Response(null, { status: 404, headers });
  // The destination's normal viewer authorization still controls all content.
  return new Response(null, { status: 307, headers: { ...headers, Location: `https://bltz.vercel.app/preview-lockers/${encodeURIComponent(preview.slug)}` } });
}
