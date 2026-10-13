import { randomUUID } from "node:crypto";
import { z } from "zod";
import { failure, json, previewAdmin, PreviewError, readBody } from "@/lib/preview-lockers/server";
import { previewExtensionInput, previewWindowSchema } from "@/lib/preview-lockers/access-window";
export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { client } = await previewAdmin();
    const { id } = await context.params;
    const input = previewExtensionInput.safeParse(await readBody(request, 2048));
    if (!z.uuid().safeParse(id).success || !input.success) throw new PreviewError("invalid_input", 400);
    const { data, error } = await client.rpc("extend_preview_link_access", { p_preview: id, p_reason: input.data.reason, p_request: input.data.requestId ?? randomUUID() }).abortSignal(AbortSignal.timeout(10_000));
    if (error) throw new PreviewError(error.code === "42501" ? "forbidden" : error.code === "22023" ? "invalid_extension" : "preview_unavailable", error.code === "42501" ? 403 : error.code === "22023" ? 409 : 503);
    const result = previewWindowSchema.extend({ saved: z.literal(true), duplicate: z.boolean().optional() }).safeParse(data);
    if (!result.success) throw new PreviewError("preview_unavailable", 503);
    return json(result.data);
  } catch (error) { return failure(error); }
}
