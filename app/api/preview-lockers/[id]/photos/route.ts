import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { PREVIEW_PHOTO_PAGE_SIZE, resolvePreviewPhotos } from "@/lib/preview-lockers/photos";
import type { PreviewPhoto } from "@/lib/preview-lockers/types";
import { PRIVATE_HEADERS, PreviewError, readPublicPreviewWindow } from "@/lib/preview-lockers/server";

export const runtime = "nodejs";
const response = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: PRIVATE_HEADERS });

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  const { data: isAdmin, error: authError } = user
    ? await session.rpc("is_internal_admin")
    : { data: false, error: null };
  if (authError) return response({ error: "not_found" }, 404);

  const { id: slug } = await context.params;
  const offsetParam = new URL(request.url).searchParams.get("offset");
  const offset = Math.max(0, Number.parseInt(offsetParam ?? "0", 10) || 0);
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("preview_lockers")
    .select("id,photos")
    .eq("slug", slug)
    .maybeSingle();

  if (error) return response({ error: "could_not_load" }, 503);
  if (!data) return response({ error: "not_found" }, 404);

  try {
    const publicLink = isAdmin !== true;
    if (publicLink && (await readPublicPreviewWindow(supabase, data.id)).state !== "active") return response({ error: "not_found" }, 404);
    const page = await resolvePreviewPhotos(supabase, data.photos as PreviewPhoto[], {
      offset,
      limit: PREVIEW_PHOTO_PAGE_SIZE,
      signedUrlTtl: publicLink ? async () => {
        const state = await readPublicPreviewWindow(supabase, data.id);
        if (state.state !== "active" || state.remaining_seconds < 1) throw new PreviewError("preview_expired", 404);
        return state.remaining_seconds;
      } : undefined,
    });
    return response({
      ...page,
      photos: page.photos.map((photo) => ({
        id: photo.id,
        url: photo.url,
        title: photo.title || "Photo",
        credits: photo.credits,
        sourceUrl: photo.sourceUrl,
        level: photo.level,
        season: photo.season,
        licenseLabel: publicLink ? "PREVIEW LOCKER" : "PREVIEW ONLY — NOT FOR PUBLICATION",
        width: null,
        height: null,
      })),
    });
  } catch (error) {
    return error instanceof PreviewError && error.code === "preview_expired"
      ? response({ error: "not_found" }, 404)
      : response({ error: "could_not_prepare_photos" }, 503);
  }
}


