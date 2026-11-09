import { API_HEADERS, apiError, authorizeWrite, isSchoolPlayer, validMediaItems } from "@/lib/enterprise-crm/pilot/api";
import { addAthleteMedia, addMediaInput } from "@/lib/enterprise-crm/pilot/launches";
import { isPlayerMoment } from "@/lib/enterprise-crm/pilot/athlete";

export const dynamic = "force-dynamic";

/** Connects media or a business to one of the school's former players; BLTZ reviews it for the Locker. */
export async function POST(request: Request, { params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  const auth = await authorizeWrite(request, organizationId, "activation.manage");
  if (!auth.ok) return auth.response;
  const parsed = addMediaInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("invalid", 400);
  if (!(await isSchoolPlayer(auth.context, parsed.data.playerId))) return apiError("not_found", 404);
  if (!(await validMediaItems(auth.context, parsed.data.playerId, [parsed.data]))) return apiError("invalid_media", 400);
  if (parsed.data.momentId && !(await isPlayerMoment(auth.context, parsed.data.playerId, parsed.data.momentId))) return apiError("invalid_moment", 400);
  try {
    const media = await addAthleteMedia(auth.context.organization.id, auth.context.userId, parsed.data);
    return Response.json({ state: "created", media }, { status: 201, headers: API_HEADERS });
  } catch {
    return apiError("unavailable", 503);
  }
}
