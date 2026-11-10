import { API_HEADERS, apiError, authorizeWrite } from "@/lib/enterprise-crm/pilot/api";
import { createInvite } from "@/lib/enterprise-crm/pilot/invites";
import { inviteInput } from "@/lib/enterprise-crm/pilot/roster-athletes";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Invites one roster player to claim their Locker: a personal link, emailed from BLTZ on
 * the school's behalf or returned for staff to send themselves.
 */
export async function POST(request: Request, { params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  const auth = await authorizeWrite(request, organizationId, "activation.manage");
  if (!auth.ok) return auth.response;
  const parsed = inviteInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("invalid", 400);
  const result = await createInvite({
    organizationId: auth.context.organization.id, organizationName: auth.context.organization.name, actorUserId: auth.context.userId,
    athleteId: parsed.data.athleteId, channel: parsed.data.channel, email: parsed.data.email, origin: new URL(request.url).origin,
  });
  const status = result.state === "created" ? 201 : result.state === "not_found" ? 404 : result.state === "failed" ? 503 : result.state === "daily_limit" ? 429 : 409;
  return Response.json(result, { status, headers: API_HEADERS });
}
