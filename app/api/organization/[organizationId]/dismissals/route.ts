import { API_HEADERS, apiError, authorizeWrite, isSchoolPlayer } from "@/lib/enterprise-crm/pilot/api";
import { createDismissal, dismissalInput } from "@/lib/enterprise-crm/pilot/dismissals";

export const dynamic = "force-dynamic";

/** Hides a signal or Moment from this school's workspace only. */
export async function POST(request: Request, { params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  const auth = await authorizeWrite(request, organizationId, "activation.manage");
  if (!auth.ok) return auth.response;
  const parsed = dismissalInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("invalid", 400);
  if (parsed.data.playerId && !(await isSchoolPlayer(auth.context, parsed.data.playerId))) return apiError("not_found", 404);
  try {
    const dismissal = await createDismissal(auth.context.organization.id, auth.context.userId, parsed.data);
    return Response.json({ state: "created", dismissal }, { status: 201, headers: API_HEADERS });
  } catch {
    return apiError("unavailable", 503);
  }
}
