import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { PreviewError, readBody } from "@/lib/preview-lockers/server";
import { previewAnalyticsActor } from "@/lib/analytics/preview-event";
import { getAnalyticsRuntimeEnvironment } from "@/lib/analytics/bltz-event";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
const inputSchema = z.object({
  previewId: z.uuid(),
  email: z.email().max(254),
  featureRequests: z.string().max(2000).optional(),
  consent: z.literal(true),
  website: z.string().max(0).optional(),
  sessionId: z.uuid().optional(),
}).strict();

export async function POST(request: Request) {
  let input: unknown;
  try {
    input = await readBody(request, 4096);
  } catch (error) {
    return Response.json({ error: error instanceof PreviewError ? error.code : "invalid_input" }, { status: error instanceof PreviewError ? error.status : 400, headers });
  }
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return Response.json({ error: "invalid_input" }, { status: 400, headers });
  try {
    const environment = getAnalyticsRuntimeEnvironment();
    const actor = environment ? await previewAnalyticsActor(request) : { userId: null, excluded: true };
    const { data, error } = await createServiceClient().rpc("save_preview_link_inquiry", {
      p_preview: parsed.data.previewId,
      p_email: parsed.data.email.trim().toLowerCase(),
      p_features: parsed.data.featureRequests?.trim() || null,
      p_session: parsed.data.sessionId ?? null,
      p_actor: actor.userId,
      p_environment: actor.excluded ? null : environment,
    }).abortSignal(AbortSignal.timeout(10_000));
    if (error) return Response.json({ error: error.code === "42501" ? "not_found" : "unavailable" }, { status: error.code === "42501" ? 404 : 503, headers });
    if (!z.object({ saved: z.literal(true) }).safeParse(data).success) {
      return Response.json({ error: "unavailable" }, { status: 503, headers });
    }
  } catch {
    return Response.json({ error: "unavailable" }, { status: 503, headers });
  }
  return Response.json({ saved: true }, { headers });
}
