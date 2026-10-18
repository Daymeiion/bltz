import { z } from "zod";
import { previewAdmin, readBody, json, failure, PreviewError } from "@/lib/preview-lockers/server";
import { AWARD_IMAGE_BUCKET, IMAGE_LIMIT, imageDetails, imageType } from "@/lib/award-images/model";
import { storeAwardBytes } from "@/lib/award-images/server";
import { createHash } from "node:crypto";

const upload = z.object({ sha256: z.string().regex(/^[a-f0-9]{64}$/), mime: z.enum(["image/png", "image/jpeg", "image/webp"]), size: z.number().int().positive().max(IMAGE_LIMIT) });
const pathFor = (input: z.infer<typeof upload>) => `images/${input.sha256}.${input.mime === "image/png" ? "png" : input.mime === "image/jpeg" ? "jpg" : "webp"}`;
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    const { client } = await previewAdmin();
    const parsed = upload.strict().safeParse(await readBody(req, 2048));
    if (!parsed.success) throw new PreviewError("invalid_award_image", 400);
    const existing = await client.from("award_image_assets").select("id").eq("sha256", parsed.data.sha256).maybeSingle();
    if (existing.error) throw new PreviewError("award_library_unavailable", 503);
    if (existing.data) return json({ id: existing.data.id, duplicate: true });
    const path = pathFor(parsed.data);
    const signed = await client.storage.from(AWARD_IMAGE_BUCKET).createSignedUploadUrl(path);
    if (signed.error || !signed.data?.token) throw new PreviewError("upload_unavailable", 503);
    return json({ path, token: signed.data.token, bucket: AWARD_IMAGE_BUCKET });
  } catch (error) { return failure(error); }
}
export async function PATCH(req: Request) {
  try {
    const { client } = await previewAdmin();
    const parsed = upload.extend({ details: imageDetails }).strict().safeParse(await readBody(req, 8192));
    if (!parsed.success) throw new PreviewError("invalid_award_image", 400);
    const file = await client.storage.from(AWARD_IMAGE_BUCKET).download(pathFor(parsed.data));
    if (file.error || !file.data || file.data.size !== parsed.data.size || file.data.size > IMAGE_LIMIT) throw new PreviewError("award_upload_incomplete", 400);
    const bytes = new Uint8Array(await file.data.arrayBuffer());
    if (imageType(bytes)?.mime !== parsed.data.mime || createHash("sha256").update(bytes).digest("hex") !== parsed.data.sha256) throw new PreviewError("invalid_award_image", 400);
    return await storeAwardBytes(client, bytes, parsed.data.details.title, parsed.data.details);
  } catch (error) { return failure(error); }
}
