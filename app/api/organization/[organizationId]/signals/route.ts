import { API_HEADERS, apiError, authorizeWrite, isSchoolPlayer } from "@/lib/enterprise-crm/pilot/api";
import { createSchoolSignal, schoolSignalInput } from "@/lib/enterprise-crm/pilot/school-signals";

export const dynamic = "force-dynamic";

/** Saves a signal the school reviewed (drafted with AI or entered by hand). */
export async function POST(request: Request, { params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  const auth = await authorizeWrite(request, organizationId, "activation.manage");
  if (!auth.ok) return auth.response;
  const parsed = schoolSignalInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("invalid", 400);
  if (parsed.data.playerId && !(await isSchoolPlayer(auth.context, parsed.data.playerId))) return apiError("not_found", 404);
  try {
    const signal = await createSchoolSignal(auth.context.organization.id, auth.context.userId, parsed.data);
    return Response.json({ state: "created", signal }, { status: 201, headers: API_HEADERS });
  } catch {
    return apiError("unavailable", 503);
  }
}
