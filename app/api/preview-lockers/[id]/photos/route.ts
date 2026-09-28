import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { PREVIEW_PHOTO_PAGE_SIZE, resolvePreviewPhotos } from "@/lib/preview-lockers/photos";
import type { PreviewPhoto } from "@/lib/preview-lockers/types";
import { isPublicPreview } from "@/lib/preview-lockers/server";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  const { data: isAdmin, error: authError } = user
    ? await session.rpc("is_internal_admin")
    : { data: false, error: null };
  if (authError) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { id: slug } = await context.params;
  const offsetParam = new URL(request.url).searchParams.get("offset");
  const offset = Math.max(0, Number.parseInt(offsetParam ?? "0", 10) || 0);
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("preview_lockers")
    .select("id,photos")
    .eq("slug", slug)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "could_not_load" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const publicLink = await isPublicPreview(supabase, data.id);
  if (isAdmin !== true && !publicLink)
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    const page = await resolvePreviewPhotos(supabase, data.photos as PreviewPhoto[], {
      offset,
      limit: PREVIEW_PHOTO_PAGE_SIZE,
    });
    return NextResponse.json({
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
  } catch {
    return NextResponse.json({ error: "could_not_prepare_photos" }, { status: 500 });
  }
}


