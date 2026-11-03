import { API_HEADERS, apiError, authorizeWrite, isSchoolPlayer } from "@/lib/enterprise-crm/pilot/api";
import { createUploadTicket, uploadTicketInput } from "@/lib/enterprise-crm/pilot/media";

export const dynamic = "force-dynamic";

/** Issues a one-time signed link to upload a video or photo of one of the school's former players. */
export async function POST(request: Request, { params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  const auth = await authorizeWrite(request, organizationId, "activation.manage");
  if (!auth.ok) return auth.response;
  const parsed = uploadTicketInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(parsed.error.issues.some((issue) => issue.message === "too_large") ? "too_large" : "invalid", 400);
  if (!(await isSchoolPlayer(auth.context, parsed.data.playerId))) return apiError("not_found", 404);
  try {
    return Response.json({ state: "ready", ...(await createUploadTicket(auth.context.organization.id, parsed.data)) }, { headers: API_HEADERS });
  } catch {
    return apiError("unavailable", 503);
  }
}
