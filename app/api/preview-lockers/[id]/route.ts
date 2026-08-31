import { z } from "zod";
import { updatePreview } from "@/lib/preview-lockers/validation";
import { previewAdmin, readBody, json, failure, PreviewError } from "@/lib/preview-lockers/server";
import type { PreviewDatabase } from "@/types/preview-lockers.generated";

export const runtime = "nodejs";
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { client } = await previewAdmin();
    const { id } = await params;
    if (!z.uuid().safeParse(id).success) throw new PreviewError("invalid_input", 400);
    const parsed = updatePreview.safeParse(await readBody(req));
    if (!parsed.success) throw new PreviewError("invalid_input", 400);
    const { revision, content } = parsed.data;
    const update: PreviewDatabase["public"]["Tables"]["preview_lockers"]["Update"] = content;
    const { data, error } = await client.from("preview_lockers").update(update).eq("id", id).eq("revision", revision).select("id,slug,revision").maybeSingle();
    if (error?.code === "23505") throw new PreviewError("preview_conflict", 409);
    if (error) throw new PreviewError("could_not_update", 503);
    if (!data) throw new PreviewError("preview_conflict", 409);
    return json(data);
  } catch (error) { return failure(error); }
}
// No DELETE handler: permanent deletion is not an approved preview operation.
