import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PreviewPhoto } from "./types";

export const PREVIEW_PHOTO_BUCKET = "preview-locker-photos";
export const PREVIEW_PHOTO_PAGE_SIZE = 24;
const SIGNED_URL_TTL_SECONDS = 900;

function safeWebUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

export async function resolvePreviewPhotos(
  supabase: SupabaseClient,
  photos: PreviewPhoto[] | null | undefined,
  options: { offset?: number; limit?: number; signedUrlTtl?: () => Promise<number> } = {},
) {
  const allPhotos = Array.isArray(photos) ? photos : [];
  const offset = Math.max(0, Math.floor(options.offset ?? 0));
  const limit = Math.min(60, Math.max(0, Math.floor(options.limit ?? PREVIEW_PHOTO_PAGE_SIZE)));
  const page = allPhotos.slice(offset, offset + limit);
  const paths = page.flatMap((photo) => photo.storagePath ? [photo.storagePath] : []);
  const signedByPath = new Map<string, string>();

  if (paths.length) {
    const ttl = Math.min(SIGNED_URL_TTL_SECONDS, Math.floor(options.signedUrlTtl ? await options.signedUrlTtl() : SIGNED_URL_TTL_SECONDS));
    if (!Number.isFinite(ttl) || ttl < 1) throw new Error("Preview access expired.");
    const { data, error } = await supabase.storage
      .from(PREVIEW_PHOTO_BUCKET)
      .createSignedUrls(paths, ttl);
    if (error) throw new Error("Unable to prepare private preview photos. Please try again.");
    for (const result of data ?? []) {
      if (result.path && result.signedUrl && !result.error) signedByPath.set(result.path, result.signedUrl);
    }
  }

  return {
    photos: page.flatMap((photo) => {
      const url = safeWebUrl(photo.url) ?? (photo.storagePath ? signedByPath.get(photo.storagePath) ?? null : null);
      return url ? [{ ...photo, url }] : [];
    }),
    total: allPhotos.length,
    nextOffset: offset + page.length < allPhotos.length ? offset + page.length : null,
  };
}
