import { z } from "zod";
import { API_HEADERS, apiError, authorizeWrite } from "@/lib/enterprise-crm/pilot/api";
import { revokeBrief } from "@/lib/enterprise-crm/pilot/briefs";

export const dynamic = "force-dynamic";

const input = z.object({ status: z.literal("revoked") }).strict();

/** Turns off a shared brief's link; the brand sees "no longer available". */
export async function PATCH(request: Request, { params }: { params: Promise<{ organizationId: string; briefId: string }> }) {
  const { organizationId, briefId } = await params;
  const auth = await authorizeWrite(request, organizationId, "activation.manage");
  if (!auth.ok) return auth.response;
  if (!input.safeParse(await request.json().catch(() => null)).success || !z.string().uuid().safeParse(briefId).success) return apiError("invalid", 400);
  try {
    return await revokeBrief(auth.context.organization.id, briefId)
      ? Response.json({ state: "revoked" }, { headers: API_HEADERS })
      : apiError("not_found", 404);
  } catch {
    return apiError("unavailable", 503);
  }
}
