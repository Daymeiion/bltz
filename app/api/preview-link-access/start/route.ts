import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { failure, json, previewLinkActor, PreviewError, readBody } from "@/lib/preview-lockers/server";
import { isExcludedPreviewStart, previewWindowSchema } from "@/lib/preview-lockers/access-window";
export const runtime = "nodejs";
const inputSchema = z.object({ previewId: z.uuid(), visibility: z.literal("visible") }).strict();
export async function POST(request: Request) {
  try {
    const input = inputSchema.safeParse(await readBody(request, 1024));
    if (!input.success) throw new PreviewError("invalid_input", 400);
    if (isExcludedPreviewStart(request)) return json({ excluded: true });
    const actor = await previewLinkActor();
    if (actor.isAdmin) return json({ excluded: true });
    const { data, error } = await createServiceClient().rpc("start_preview_link_access", { p_preview: input.data.previewId, p_actor: actor.userId }).abortSignal(AbortSignal.timeout(10_000));
    if (error) throw new PreviewError(error.code === "42501" ? "not_found" : "preview_unavailable", error.code === "42501" ? 404 : 503);
    const state = previewWindowSchema.safeParse(data);
    if (!state.success || state.data.state !== "active") throw new PreviewError("preview_unavailable", 503);
    return json(state.data);
  } catch (error) { return failure(error); }
}
