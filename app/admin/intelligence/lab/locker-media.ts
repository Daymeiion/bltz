import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeSourceUrl } from "@/lib/intelligence/lab-format";
import { PREVIEW_MEDIA_BUCKETS } from "@/lib/preview-lockers/server";
import type { LockerMedia } from "./model";

const STORAGE_PATH = /^[0-9a-f-]{36}\/(photos|videos)\/[0-9a-f-]{36}\.(jpg|png|webp|mp4|webm|mov)$/;
const text = z.string().max(500);
// Only the media fields are read, so newer unrelated Locker fields never block this view.
const photo = z.object({ id: text, title: text.catch(""), url: text.nullish(), storagePath: text.regex(STORAGE_PATH).nullish(), credits: text.nullish(), sourceUrl: text.nullish(), level: text.catch("pro"), season: text.nullish(), isHeadshot: z.boolean().nullish() }).passthrough();
const video = z.object({ id: text, title: text.catch(""), url: text.nullish(), thumb: text.nullish(), storagePath: text.regex(STORAGE_PATH).nullish(), level: text.nullish() }).passthrough();
const row = z.object({ id: z.string(), photos: z.array(z.unknown()).catch([]), videos: z.array(z.unknown()).catch([]) });
const SIGNED_TTL_SECONDS = 900;

/**
 * Reads one Preview Locker's photos and videos with the signed-in admin's session (RLS applies).
 * Private files get short-lived signed URLs that are rendered, never stored.
 */
export async function loadLockerMedia(lockerHref: string | null | undefined): Promise<LockerMedia> {
  const slug = lockerHref?.match(/^\/preview-lockers\/([a-z0-9]+(?:-[a-z0-9]+)*)$/)?.[1] ?? null;
  if (!slug) return { state: "none", slug: null, photos: [], videos: [] };
  try {
    const client = await createClient();
    const { data, error } = await client.from("preview_lockers").select("id,photos,videos").eq("slug", slug).maybeSingle();
    if (error) throw error;
    if (!data) return { state: "none", slug, photos: [], videos: [] };
    const record = row.parse(data);
    const photos = record.photos.flatMap(item => { const parsed = photo.safeParse(item); return parsed.success ? [parsed.data] : []; });
    const videos = record.videos.flatMap(item => { const parsed = video.safeParse(item); return parsed.success ? [parsed.data] : []; });
    const sign = async (bucket: string, paths: string[]) => {
      const urls = new Map<string, string>();
      if (!paths.length) return urls;
      const { data: signed, error: signError } = await client.storage.from(bucket).createSignedUrls(paths, SIGNED_TTL_SECONDS);
      if (signError || !signed) throw signError ?? new Error("sign_failed");
      signed.forEach((entry, index) => { if (entry.signedUrl) urls.set(paths[index], entry.signedUrl); });
      return urls;
    };
    const [photoUrls, videoUrls] = await Promise.all([
      sign(PREVIEW_MEDIA_BUCKETS.photo, photos.flatMap(item => item.storagePath ? [item.storagePath] : [])),
      sign(PREVIEW_MEDIA_BUCKETS.video, videos.flatMap(item => item.storagePath ? [item.storagePath] : [])),
    ]);
    return {
      state: "ready", slug,
      photos: photos.flatMap(item => {
        const url = safeSourceUrl(item.url) ?? (item.storagePath ? photoUrls.get(item.storagePath) ?? null : null);
        return url ? [{ id: item.id, title: item.title, url, credits: item.credits ?? null, sourceUrl: safeSourceUrl(item.sourceUrl), level: item.level, season: item.season ?? null, isHeadshot: Boolean(item.isHeadshot) }] : [];
      }),
      videos: videos.map(item => ({ id: item.id, title: item.title, url: safeSourceUrl(item.url) ?? (item.storagePath ? videoUrls.get(item.storagePath) ?? null : null), thumb: safeSourceUrl(item.thumb), level: item.level ?? null })),
    };
  } catch { return { state: "unavailable", slug, photos: [], videos: [] }; }
}
