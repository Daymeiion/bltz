import { z } from "zod";
import { previewAdmin, readBody, json, failure, PreviewError, PREVIEW_MEDIA_BUCKETS } from "@/lib/preview-lockers/server";

export const runtime = "nodejs";
const MIME = {
  "image/jpeg": { kind: "photo", ext: "jpg", max: 10 * 1024 * 1024 },
  "image/png": { kind: "photo", ext: "png", max: 10 * 1024 * 1024 },
  "image/webp": { kind: "photo", ext: "webp", max: 10 * 1024 * 1024 },
  "video/mp4": { kind: "video", ext: "mp4", max: 250 * 1024 * 1024 },
  "video/webm": { kind: "video", ext: "webm", max: 250 * 1024 * 1024 },
  "video/quicktime": { kind: "video", ext: "mov", max: 250 * 1024 * 1024 },
} as const;
type Mime = keyof typeof MIME;
const mimeValues = Object.keys(MIME) as [Mime, ...Mime[]];
const requestSchema = z.object({ kind: z.enum(["photo", "video"]), mimeType: z.enum(mimeValues), size: z.number().int().positive() }).strict();

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { client } = await previewAdmin();
    const { id } = await params;
    if (!z.uuid().safeParse(id).success) throw new PreviewError("invalid_input", 400);
    const parsed = requestSchema.safeParse(await readBody(req, 2048));
    if (!parsed.success) throw new PreviewError("invalid_input", 400);
    const rule = MIME[parsed.data.mimeType];
    if (rule.kind !== parsed.data.kind || parsed.data.size > rule.max) throw new PreviewError("invalid_upload", 400);
    const { data: preview, error: previewError } = await client.from("preview_lockers").select("photos,videos").eq("id", id).maybeSingle();
    if (previewError) throw new PreviewError("preview_unavailable", 503);
    if (!preview) throw new PreviewError("preview_not_found", 404);
    const media = parsed.data.kind === "photo" ? preview.photos : preview.videos;
    const currentCount = Array.isArray(media) ? media.length : 0;
    const limit = parsed.data.kind === "photo" ? 40 : 24;
    if (currentCount >= limit) throw new PreviewError("media_limit_reached", 409);
    const path = `${id}/${parsed.data.kind}s/${crypto.randomUUID()}.${rule.ext}`;
    const bucket = PREVIEW_MEDIA_BUCKETS[parsed.data.kind];
    const { data, error } = await client.storage.from(bucket).createSignedUploadUrl(path);
    if (error || !data?.token) throw new PreviewError("upload_unavailable", 503);
    return json({ path, token: data.token, bucket });
  } catch (error) { return failure(error); }
}
