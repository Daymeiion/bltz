import { z } from "zod";
import { API_HEADERS, apiError, authorizeWrite } from "@/lib/enterprise-crm/pilot/api";
import { archiveSchoolSignal } from "@/lib/enterprise-crm/pilot/school-signals";

export const dynamic = "force-dynamic";

const input = z.object({ status: z.literal("archived") }).strict();

/** Removes one of the school's own signals from the workspace (kept on record). */
export async function PATCH(request: Request, { params }: { params: Promise<{ organizationId: string; signalId: string }> }) {
  const { organizationId, signalId } = await params;
  const auth = await authorizeWrite(request, organizationId, "activation.manage");
  if (!auth.ok) return auth.response;
  if (!input.safeParse(await request.json().catch(() => null)).success || !z.string().uuid().safeParse(signalId).success) return apiError("invalid", 400);
  try {
    return await archiveSchoolSignal(auth.context.organization.id, signalId)
      ? Response.json({ state: "archived" }, { headers: API_HEADERS })
      : apiError("not_found", 404);
  } catch {
    return apiError("unavailable", 503);
  }
}
