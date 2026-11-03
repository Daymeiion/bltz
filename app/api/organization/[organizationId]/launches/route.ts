import { API_HEADERS, apiError, authorizeWrite, isSchoolPlayer, validMediaItems } from "@/lib/enterprise-crm/pilot/api";
import { createLaunch, launchInput } from "@/lib/enterprise-crm/pilot/launches";

export const dynamic = "force-dynamic";

/** Launches a Locker for a former player: BLTZ builds it and sends the claim invite. */
export async function POST(request: Request, { params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  const auth = await authorizeWrite(request, organizationId, "activation.manage");
  if (!auth.ok) return auth.response;
  const parsed = launchInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("invalid", 400);
  if (parsed.data.playerId && !(await isSchoolPlayer(auth.context, parsed.data.playerId))) return apiError("not_found", 404);
  // Uploads need a player folder, so a brand-new player's launch takes links and Getty media only.
  if (!(await validMediaItems(auth.context, parsed.data.playerId ?? null, parsed.data.media))) return apiError("invalid_media", 400);
  try {
    const launch = await createLaunch(auth.context.organization.id, auth.context.userId, parsed.data);
    return Response.json({ state: "created", launch }, { status: 201, headers: API_HEADERS });
  } catch {
    return apiError("unavailable", 503);
  }
}
