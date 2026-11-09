import { API_HEADERS, apiError, authorizeWrite, isSchoolPlayer } from "@/lib/enterprise-crm/pilot/api";
import { briefShareInput, loadBriefFacts, shareBrief } from "@/lib/enterprise-crm/pilot/briefs";

export const dynamic = "force-dynamic";

/**
 * Shares a brief: the facts are gathered again here (never taken from the browser),
 * saved with the staff-edited sections as a snapshot, and a private link is returned once.
 * Requires the staff member to confirm the athlete approved sharing.
 */
export async function POST(request: Request, { params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  const auth = await authorizeWrite(request, organizationId, "activation.manage");
  if (!auth.ok) return auth.response;
  const parsed = briefShareInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("invalid", 400);
  if (!(await isSchoolPlayer(auth.context, parsed.data.playerId))) return apiError("not_found", 404);
  const origin = new URL(request.url).origin;
  const facts = await loadBriefFacts(auth.context, parsed.data.playerId, origin, parsed.data.partners);
  if (!facts) return apiError("not_found", 404);
  try {
    const shared = await shareBrief(auth.context.organization.id, auth.context.userId, parsed.data, facts);
    return Response.json({ state: "shared", id: shared.id, url: `${origin}/brief/${shared.token}`, expiresAt: shared.expiresAt }, { status: 201, headers: API_HEADERS });
  } catch {
    return apiError("unavailable", 503);
  }
}
