import { z } from "zod";
import { API_HEADERS, apiError, authorizeWrite } from "@/lib/enterprise-crm/pilot/api";
import { restoreDismissal } from "@/lib/enterprise-crm/pilot/dismissals";

export const dynamic = "force-dynamic";

const input = z.object({ restored: z.literal(true) }).strict();

/** Brings a dismissed signal or Moment back. */
export async function PATCH(request: Request, { params }: { params: Promise<{ organizationId: string; dismissalId: string }> }) {
  const { organizationId, dismissalId } = await params;
  const auth = await authorizeWrite(request, organizationId, "activation.manage");
  if (!auth.ok) return auth.response;
  if (!input.safeParse(await request.json().catch(() => null)).success || !z.string().uuid().safeParse(dismissalId).success) return apiError("invalid", 400);
  try {
    return await restoreDismissal(auth.context.organization.id, dismissalId)
      ? Response.json({ state: "restored" }, { headers: API_HEADERS })
      : apiError("not_found", 404);
  } catch {
    return apiError("unavailable", 503);
  }
}
