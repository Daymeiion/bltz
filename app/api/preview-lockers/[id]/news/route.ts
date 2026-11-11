import { z } from "zod";
import { previewAdmin, readBody, json, failure, PreviewError, PREVIEW_COLUMNS } from "@/lib/preview-lockers/server";
import { previewRecord } from "@/lib/preview-lockers/validation";
import { tryEnrichSavedPreview } from "@/lib/preview-lockers/enrichment";

export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { client } = await previewAdmin();
    const { id } = await params;
    if (!z.uuid().safeParse(id).success || !z.object({}).strict().safeParse(await readBody(req, 256)).success) throw new PreviewError("invalid_input", 400);
    const result = await client.from("preview_lockers").select(PREVIEW_COLUMNS).eq("id", id).maybeSingle();
    if (result.error) throw new PreviewError("preview_unavailable", 503);
    if (!result.data) throw new PreviewError("preview_not_found", 404);
    const row = previewRecord.parse(result.data);
    const report = await tryEnrichSavedPreview(client, id, row, row.revision);
    return json({ report }, report.status === "unavailable" ? 503 : 200);
  } catch (error) { return failure(error); }
}
