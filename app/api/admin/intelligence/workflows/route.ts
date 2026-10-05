import { z } from "zod";
import { IntelligenceAccessError } from "@/lib/intelligence/lab-server";
import { authorizeWorkflowActor, loadWorkflows, mutateWorkflow, WorkflowError } from "@/lib/intelligence/workflows/server";
import { AnalyticsBodyLimitError, readBoundedBody } from "@/lib/analytics/delivery/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff", Vary: "Cookie" };
function errorResponse(error: unknown) {
  const status = error instanceof IntelligenceAccessError || error instanceof WorkflowError ? error.status : 503;
  const code = error instanceof WorkflowError ? error.code : status === 401 ? "authentication_required" : status === 403 ? "internal_admin_required" : "workflow_unavailable";
  return Response.json({ error: code }, { status, headers });
}
export async function GET(request: Request) {
  try {
    await authorizeWorkflowActor();
    const player = z.string().uuid().safeParse(new URL(request.url).searchParams.get("playerId"));
    if (!player.success) return Response.json({ error: "canonical_player_required" }, { status: 400, headers });
    return Response.json(await loadWorkflows(player.data), { headers });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    await authorizeWorkflowActor();
    // Reject cross-site cookie mutation before parsing or constructing a service client.
    const origin = request.headers.get("origin");
    if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") {
      return Response.json({ error: "same_origin_required" }, { status: 403, headers });
    }
    let raw: string;
    try { raw = await readBoundedBody(request, 64 * 1024); }
    catch (error) { return Response.json({ error: error instanceof AnalyticsBodyLimitError ? "payload_too_large" : "invalid_body" }, { status: error instanceof AnalyticsBodyLimitError ? 413 : 400, headers }); }
    let input: unknown;
    try { input = JSON.parse(raw); } catch { return Response.json({ error: "invalid_json" }, { status: 400, headers }); }
    return Response.json(await mutateWorkflow(input), { status: 200, headers });
  } catch (error) { return errorResponse(error); }
}
