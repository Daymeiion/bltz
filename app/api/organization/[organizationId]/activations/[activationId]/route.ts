import { z } from "zod";
import { updateActivation, updateActivationInput } from "@/lib/enterprise-crm/pilot/activations";
import { API_HEADERS, apiError, authorizeWrite } from "@/lib/enterprise-crm/pilot/api";

export const dynamic = "force-dynamic";

/** Marks an activation posted or cancelled and records its reach. */
export async function PATCH(request: Request, { params }: { params: Promise<{ organizationId: string; activationId: string }> }) {
  const { organizationId, activationId } = await params;
  const auth = await authorizeWrite(request, organizationId, "activation.manage");
  if (!auth.ok) return auth.response;
  if (!z.string().uuid().safeParse(activationId).success) return apiError("not_found", 404);
  const parsed = updateActivationInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("invalid", 400);
  try {
    const activation = await updateActivation(auth.context.organization.id, activationId, auth.context.userId, parsed.data);
    return activation ? Response.json({ state: "updated", activation }, { headers: API_HEADERS }) : apiError("not_found", 404);
  } catch {
    return apiError("unavailable", 503);
  }
}
