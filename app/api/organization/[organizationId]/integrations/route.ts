import { z } from "zod";
import { API_HEADERS, apiError, authorizeWrite } from "@/lib/enterprise-crm/pilot/api";
import { INTEGRATION_KINDS, integrationInput, listIntegrations, removeIntegration, saveIntegration } from "@/lib/enterprise-crm/pilot/integrations";
import { authorizeWorkspaceRequest } from "@/lib/enterprise-crm/workspace-access";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ organizationId: string }> };

/** Which tools the school has connected. Links and passwords never leave the server. */
export async function GET(_request: Request, { params }: Params) {
  const { organizationId } = await params;
  const auth = await authorizeWorkspaceRequest(organizationId, "activation.manage");
  if (!auth.ok) return apiError(auth.status === 401 ? "unauthenticated" : "forbidden", auth.status);
  return Response.json(await listIntegrations(auth.context.organization.id), { headers: API_HEADERS });
}

/** Connects or replaces one tool. */
export async function PUT(request: Request, { params }: Params) {
  const { organizationId } = await params;
  const auth = await authorizeWrite(request, organizationId, "activation.manage");
  if (!auth.ok) return auth.response;
  const parsed = integrationInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("invalid", 400);
  try {
    const integration = await saveIntegration(auth.context.organization.id, auth.context.userId, parsed.data);
    return Response.json({ state: "saved", integration }, { headers: API_HEADERS });
  } catch {
    return apiError("unavailable", 503);
  }
}

/** Disconnects one tool. */
export async function DELETE(request: Request, { params }: Params) {
  const { organizationId } = await params;
  const auth = await authorizeWrite(request, organizationId, "activation.manage");
  if (!auth.ok) return auth.response;
  const kind = z.enum(INTEGRATION_KINDS).safeParse(new URL(request.url).searchParams.get("kind"));
  if (!kind.success) return apiError("invalid", 400);
  try {
    await removeIntegration(auth.context.organization.id, kind.data);
    return Response.json({ state: "removed" }, { headers: API_HEADERS });
  } catch {
    return apiError("unavailable", 503);
  }
}
