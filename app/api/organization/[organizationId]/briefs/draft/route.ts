import { API_HEADERS, apiError, authorizeWrite, isSchoolPlayer } from "@/lib/enterprise-crm/pilot/api";
import { draftBriefNarrative } from "@/lib/enterprise-crm/pilot/brief-ai";
import { briefDraftInput, loadBriefFacts } from "@/lib/enterprise-crm/pilot/briefs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Gathers a player's brief facts and has Claude draft the pitch sections. Nothing is saved or shared. */
export async function POST(request: Request, { params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  const auth = await authorizeWrite(request, organizationId, "activation.manage");
  if (!auth.ok) return auth.response;
  const parsed = briefDraftInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("invalid", 400);
  if (!(await isSchoolPlayer(auth.context, parsed.data.playerId))) return apiError("not_found", 404);
  const facts = await loadBriefFacts(auth.context, parsed.data.playerId, new URL(request.url).origin);
  if (!facts) return apiError("not_found", 404);
  const narrative = await draftBriefNarrative(facts, parsed.data.recipient);
  // Facts come back either way, so staff can write the sections themselves if AI is unavailable.
  return Response.json({ facts, ai: narrative.state, narrative: narrative.state === "ready" ? narrative.narrative : null }, { headers: API_HEADERS });
}
