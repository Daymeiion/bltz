import { searchSavedCombine } from "@/lib/preview-lockers/search-server";
import { z } from "zod";
import { previewAdmin, readBody, json, failure, PreviewError, PREVIEW_COLUMNS } from "@/lib/preview-lockers/server";
import { previewRecord } from "@/lib/preview-lockers/validation";

export const runtime = "nodejs";
export const maxDuration = 60;
/** Returns review suggestions only. Never updates any Locker content. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { client } = await previewAdmin(); const { id } = await params;
    const input = z.object({ revision: z.number().int().positive() }).strict().safeParse(await readBody(req, 256));
    if (!z.uuid().safeParse(id).success || !input.success) throw new PreviewError("invalid_input", 400);
    const saved = await client.from("preview_lockers").select(PREVIEW_COLUMNS).eq("id", id).maybeSingle();
    if (saved.error) throw new PreviewError("preview_unavailable", 503);
    if (!saved.data) throw new PreviewError("preview_not_found", 404);
    const row = previewRecord.parse(saved.data);
    if (row.revision !== input.data.revision) throw new PreviewError("preview_conflict", 409);
    const outcome = await searchSavedCombine(client, row, req.signal);
    return json(outcome.body, outcome.status);
  } catch (error) { return failure(error); }
}
