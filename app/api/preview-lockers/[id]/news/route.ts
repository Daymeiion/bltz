import { z } from "zod";
import { previewAdmin, readBody, json, failure, PreviewError, PREVIEW_COLUMNS } from "@/lib/preview-lockers/server";
import { previewRecord } from "@/lib/preview-lockers/validation";
import { createServiceClient } from "@/lib/supabase/service";
import { readPreviewNewsCandidates, tryEnrichSavedPreview } from "@/lib/preview-lockers/enrichment";

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
    // Admin and preview authorization above precede this bounded historical read.
    const knownUrls = await readPreviewNewsCandidates(createServiceClient(), id, row, row.revision);
    const report = await tryEnrichSavedPreview(client, id, row, row.revision, true, knownUrls);
    return json({ report }, report.status === "unavailable" ? 503 : 200);
  } catch (error) { return failure(error); }
}
