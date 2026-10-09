import { previewEventInputSchema, recordPreviewEvent } from "@/lib/analytics/preview-event";
import { readBody, PreviewError, PRIVATE_HEADERS } from "@/lib/preview-lockers/server";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const input = previewEventInputSchema.safeParse(await readBody(request, 2048));
    if (!input.success) return Response.json({ error: "invalid_event" }, { status: 400, headers: PRIVATE_HEADERS });
    const result = await recordPreviewEvent(request, input.data);
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status, headers: PRIVATE_HEADERS });
    return Response.json(result, { status: 202, headers: PRIVATE_HEADERS });
  } catch (error) {
    return Response.json({ error: error instanceof PreviewError ? error.code : "preview_analytics_unavailable" }, { status: error instanceof PreviewError ? error.status : 503, headers: PRIVATE_HEADERS });
  }
}
