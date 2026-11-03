import { recordSocialReach, socialReachInput } from "@/lib/enterprise-crm/pilot/activations";
import { API_HEADERS, apiError, authorizeWrite, isSchoolPlayer } from "@/lib/enterprise-crm/pilot/api";

export const dynamic = "force-dynamic";

/** Records a follower count for one of the school's former players. */
export async function POST(request: Request, { params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  const auth = await authorizeWrite(request, organizationId, "activation.manage");
  if (!auth.ok) return auth.response;
  const parsed = socialReachInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("invalid", 400);
  if (!(await isSchoolPlayer(auth.context, parsed.data.playerId))) return apiError("not_found", 404);
  try {
    const reach = await recordSocialReach(auth.context.organization.id, auth.context.userId, parsed.data);
    return Response.json({ state: "recorded", reach }, { status: 201, headers: API_HEADERS });
  } catch {
    return apiError("unavailable", 503);
  }
}
