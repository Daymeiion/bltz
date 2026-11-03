import { createActivation, createActivationInput } from "@/lib/enterprise-crm/pilot/activations";
import { API_HEADERS, apiError, areSchoolPlayers, authorizeWrite, schoolPlayerDirectory, validMediaItems } from "@/lib/enterprise-crm/pilot/api";

export const dynamic = "force-dynamic";

/** Plans an activation for the school's former players: a lead athlete and anyone featured alongside. */
export async function POST(request: Request, { params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  const auth = await authorizeWrite(request, organizationId, "activation.manage");
  if (!auth.ok) return auth.response;
  const parsed = createActivationInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("invalid", 400);
  if (!(await areSchoolPlayers(auth.context, [parsed.data.playerId, ...parsed.data.additionalPlayerIds]))) return apiError("not_found", 404);
  if (!(await validMediaItems(auth.context, parsed.data.playerId, parsed.data.media))) return apiError("invalid_media", 400);
  try {
    const activation = await createActivation(auth.context.organization.id, auth.context.userId, parsed.data, await schoolPlayerDirectory(auth.context));
    return Response.json({ state: "created", activation }, { status: 201, headers: API_HEADERS });
  } catch {
    return apiError("unavailable", 503);
  }
}
