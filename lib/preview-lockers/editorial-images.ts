import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PREVIEW_MEDIA_BUCKETS, PreviewError } from "./server";

/** Admin editor thumbnails only. Storage paths, not expiring URLs, are saved. */
export async function editorialImageUrls(client: SupabaseClient, items: Array<{imageStoragePath?:string|null}>): Promise<Record<string,string>> {
  const paths = [...new Set(items.flatMap(item => item.imageStoragePath ? [item.imageStoragePath] : []))];
  if (!paths.length) return {};
  const result = await client.storage.from(PREVIEW_MEDIA_BUCKETS.photo).createSignedUrls(paths, 900);
  if (result.error) throw new PreviewError("preview_media_unavailable", 503);
  return Object.fromEntries((result.data ?? []).flatMap(item => item.path && item.signedUrl ? [[item.path,item.signedUrl]] : []));
}
