import "server-only";
import { createClient } from "@/lib/supabase/server";
import { previewRecord, previewSlug, type PreviewContent, type PreviewRecord, type ResolvedPreviewRecord } from "./validation";

export const PRIVATE_HEADERS = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow, noarchive, noimageindex" };
export const PREVIEW_MEDIA_BUCKETS = { photo: "preview-locker-photos", video: "preview-locker-videos" } as const;
export const PREVIEW_COLUMNS = "id,slug,full_name,position,level,school,hometown,jersey,height_in,weight_lbs,games_played,headshot_url,hero_video_url,bio,athlete_quote,athlete_quote_author,schools,pro_teams,awards,career_stats,videos,photos,revision,created_at,updated_at";
export class PreviewError extends Error {
  constructor(public code: string, public status: number) { super(code); }
}
export async function previewUser() {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new PreviewError("unauthorized", 401);
  return { client, user };
}
export async function previewAccess() {
  const { client, user } = await previewUser();
  const role = await client.rpc("is_internal_admin");
  if (role.error) throw new PreviewError("preview_unavailable", 503);
  return { client, user, isAdmin: role.data === true };
}
export async function previewAdmin() {
  const access = await previewAccess();
  if (!access.isAdmin) throw new PreviewError("forbidden", 403);
  return access;
}
export function json(data: unknown, status = 200) { return Response.json(data, { status, headers: PRIVATE_HEADERS }); }
export function failure(error: unknown) {
  return error instanceof PreviewError ? json({ error: error.code }, error.status) : json({ error: "preview_unavailable" }, 503);
}
export async function readBody(req: Request, limit = 128 * 1024): Promise<unknown> {
  const origin = req.headers.get("origin");
  // Next's internal request URL can use its bound hostname behind a proxy.
  // Match the browser Origin to the received Host, never forwarded host input.
  const requestHost = req.headers.get("host") ?? new URL(req.url).host;
  let sameOrigin = false;
  try { const parsed = new URL(origin || ""); sameOrigin = parsed.origin === origin && ["http:", "https:"].includes(parsed.protocol) && parsed.host === requestHost; } catch { /* denied */ }
  if (!sameOrigin || req.headers.get("sec-fetch-site") === "cross-site") throw new PreviewError("invalid_origin", 403);
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new PreviewError("invalid_content_type", 415);
  if (Number(req.headers.get("content-length")) > limit) throw new PreviewError("payload_too_large", 413);
  const reader = req.body?.getReader();
  if (!reader) throw new PreviewError("invalid_input", 400);
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new PreviewError("payload_too_large", 413); }
      chunks.push(value);
    }
    const buffer = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.length; }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer));
  } catch (error) { if (error instanceof PreviewError) throw error; throw new PreviewError("invalid_input", 400); }
  finally { reader.releaseLock(); }
}
async function resolvePrivateMedia(client: Awaited<ReturnType<typeof createClient>>, row: PreviewRecord): Promise<ResolvedPreviewRecord> {
  const groups = [
    { bucket: PREVIEW_MEDIA_BUCKETS.photo, items: row.photos.filter((item): item is typeof item & { storagePath: string } => "storagePath" in item) },
    { bucket: PREVIEW_MEDIA_BUCKETS.video, items: row.videos.filter((item): item is typeof item & { storagePath: string } => "storagePath" in item) },
  ];
  const urls = new Map<string, string>();
  for (const group of groups) {
    if (!group.items.length) continue;
    const { data, error } = await client.storage.from(group.bucket).createSignedUrls(group.items.map(item => item.storagePath), 15 * 60);
    if (error || !data || data.some(item => !item.signedUrl)) throw new PreviewError("preview_media_unavailable", 503);
    group.items.forEach((item, index) => urls.set(item.storagePath, data[index].signedUrl!));
  }
  return {
    ...row,
    photos: row.photos.map(item => "storagePath" in item ? { ...item, url: urls.get(item.storagePath)! } : item),
    videos: row.videos.map(item => "storagePath" in item ? { ...item, url: urls.get(item.storagePath)! } : item),
  } as ResolvedPreviewRecord;
}
export async function assertPreviewMediaExists(client: Awaited<ReturnType<typeof createClient>>, content: PreviewContent) {
  for (const [kind, items] of [["photo", content.photos], ["video", content.videos]] as const) {
    const stored = items.filter((item): item is typeof item & { storagePath: string } => "storagePath" in item);
    if (!stored.length) continue;
    const folder = stored[0].storagePath.split("/").slice(0, -1).join("/");
    const missing = new Set(stored.map(item => item.storagePath));
    const pageSize = 100;
    for (let offset = 0; missing.size; offset += pageSize) {
      const { data, error } = await client.storage.from(PREVIEW_MEDIA_BUCKETS[kind]).list(folder, { limit: pageSize, offset, sortBy: { column: "name", order: "asc" } });
      if (error || !data) throw new PreviewError("preview_media_unavailable", 503);
      data.forEach(item => missing.delete(`${folder}/${item.name}`));
      if (data.length < pageSize) break;
    }
    if (missing.size) throw new PreviewError("invalid_media_path", 400);
  }
}
export async function readPrivatePreview(slug: string): Promise<ResolvedPreviewRecord | null> {
  const authorization = await previewUser().catch(error => {
    if (error instanceof PreviewError && error.status === 401) return null;
    throw error;
  });
  if (!authorization) return null;
  const { client } = authorization;
  if (!previewSlug.safeParse(slug).success) return null;
  const { data, error } = await client.from("preview_lockers").select(PREVIEW_COLUMNS).eq("slug", slug).maybeSingle();
  if (error) throw new PreviewError("preview_unavailable", 503);
  return data ? resolvePrivateMedia(client, previewRecord.parse(data)) : null;
}
