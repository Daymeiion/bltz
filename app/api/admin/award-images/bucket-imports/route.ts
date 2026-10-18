import { z } from "zod";
import { previewAdmin, readBody, json, failure, PreviewError } from "@/lib/preview-lockers/server";
import { AWARD_IMAGE_BUCKET, IMAGE_LIMIT, originalFilename } from "@/lib/award-images/model";
import { storeAwardBytes } from "@/lib/award-images/server";

const filename = originalFilename.refine(value => /\.(png|jpe?g|webp)$/i.test(value) && !/%(?:2f|5c)/i.test(value));
const namedImage = (value: string) => filename.safeParse(value).success && !/^[a-f0-9]{64}\.(png|jpg|webp)$/i.test(value);
export const runtime = "nodejs";
export async function GET() {
  try {
    const { client } = await previewAdmin();
    const files: Array<{ filename: string; size: number }> = [];
    for (let offset = 0; ; offset += 1000) {
      const result = await client.storage.from(AWARD_IMAGE_BUCKET).list("images", {limit: 1000, offset, sortBy: {column: "name", order: "asc"}});
      if (result.error) throw new PreviewError("bucket_images_unavailable", 503);
      for (const file of result.data ?? []) {
        const size = Number(file.metadata?.size);
        if (file.id && namedImage(file.name) && Number.isFinite(size) && size > 0 && size <= IMAGE_LIMIT) files.push({filename: file.name, size});
      }
      if ((result.data?.length ?? 0) < 1000) break;
    }
    return json({files});
  } catch (error) { return failure(error); }
}
export async function POST(req: Request) {
  try {
    const { client } = await previewAdmin();
    const parsed = z.object({filename}).strict().safeParse(await readBody(req, 2048));
    if (!parsed.success || !namedImage(parsed.data.filename)) throw new PreviewError("invalid_bucket_image", 400);
    const bucket = client.storage.from(AWARD_IMAGE_BUCKET);
    const listed = await bucket.list("images", {search: parsed.data.filename, limit: 1000});
    const source = listed.data?.find(file => file.id && file.name === parsed.data.filename);
    if (listed.error || !source) throw new PreviewError("bucket_image_not_found", 404);
    const size = Number(source.metadata?.size);
    if (!Number.isFinite(size) || size < 1 || size > IMAGE_LIMIT) throw new PreviewError("invalid_bucket_image", 400);
    const file = await bucket.download(`images/${source.name}`);
    if (file.error || !file.data || file.data.size > IMAGE_LIMIT) throw new PreviewError("bucket_image_unavailable", 503);
    return await storeAwardBytes(client, new Uint8Array(await file.data.arrayBuffer()), source.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ").slice(0, 160), {original_filename: source.name});
  } catch (error) { return failure(error); }
}
