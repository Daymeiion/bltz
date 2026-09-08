import "server-only";
import { createClient } from "@/lib/supabase/server";
import { previewRecord, previewSlug } from "./validation";

export const PRIVATE_HEADERS = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow, noarchive, noimageindex" };
export const PREVIEW_COLUMNS = "id,slug,full_name,position,level,school,hometown,jersey,height_in,weight_lbs,games_played,headshot_url,hero_video_url,bio,athlete_quote,athlete_quote_author,schools,pro_teams,awards,videos,photos,revision,created_at,updated_at";
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
export async function readPrivatePreview(slug: string) {
  const authorization = await previewUser().catch(error => {
    if (error instanceof PreviewError && error.status === 401) return null;
    throw error;
  });
  if (!authorization) return null;
  const { client } = authorization;
  if (!previewSlug.safeParse(slug).success) return null;
  const { data, error } = await client.from("preview_lockers").select(PREVIEW_COLUMNS).eq("slug", slug).maybeSingle();
  if (error) throw new PreviewError("preview_unavailable", 503);
  return data ? previewRecord.parse(data) : null;
}
