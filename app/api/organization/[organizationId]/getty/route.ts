import { apiError } from "@/lib/enterprise-crm/pilot/api";
import { authorizeWorkspaceRequest } from "@/lib/enterprise-crm/workspace-access";
import { GETTY_HEADERS, gettyResponse, searchGetty } from "@/lib/getty/search";

export const dynamic = "force-dynamic";

/** Getty Images editorial search for a school's staff, so they can attach licensed-on-Getty media. */
export async function GET(request: Request, { params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  const auth = await authorizeWorkspaceRequest(organizationId, "activation.manage");
  if (!auth.ok) return apiError(auth.status === 401 ? "unauthenticated" : "forbidden", auth.status);
  const query = new URL(request.url).searchParams;
  const phrase = query.get("q")?.trim().slice(0, 80) ?? "";
  if (!phrase) return Response.json({ state: "invalid" }, { status: 400, headers: GETTY_HEADERS });
  return gettyResponse(await searchGetty(phrase, query.get("type") === "video" ? "video" : "image"));
}
