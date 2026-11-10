import { z } from "zod";
import { decideApplication, decisionInput } from "@/lib/enterprise-crm/pilot/applications";
import { isInternalAdmin } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const HEADERS = { "Cache-Control": "private, no-store" };

/** BLTZ admins approve or decline a pilot application. Approval turns the workspace on. */
export async function PATCH(request: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") return Response.json({ state: "forbidden" }, { status: 403, headers: HEADERS });
  if (!(await isInternalAdmin())) return Response.json({ state: "forbidden" }, { status: 403, headers: HEADERS });
  const { applicationId } = await params;
  const parsed = decisionInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !z.string().uuid().safeParse(applicationId).success) return Response.json({ state: "invalid" }, { status: 400, headers: HEADERS });
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return Response.json({ state: "unauthenticated" }, { status: 401, headers: HEADERS });

  const result = await decideApplication(applicationId, data.user.id, parsed.data);
  const status = result.state === "approved" || result.state === "declined" ? 200
    : result.state === "not_found" ? 404 : result.state === "failed" ? 503 : 409;
  return Response.json(result, { status, headers: HEADERS });
}
