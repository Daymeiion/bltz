import { z } from "zod";
import { API_HEADERS, apiError, isSameOrigin } from "@/lib/enterprise-crm/pilot/api";
import { LAUNCH_STATUSES } from "@/lib/enterprise-crm/pilot/types";
import { isInternalAdmin } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
const Body = z.object({ status: z.enum(LAUNCH_STATUSES), note: z.string().trim().max(500).nullish() }).strict();

/** BLTZ moves a school's launch through building, invited and live. */
export async function PATCH(request: Request, { params }: { params: Promise<{ launchId: string }> }) {
  if (!(await isInternalAdmin())) return apiError("forbidden", 403);
  if (!isSameOrigin(request)) return apiError("forbidden", 403);
  const { data: auth } = await (await createClient()).auth.getUser();
  if (!auth.user) return apiError("unauthenticated", 401);
  const { launchId } = await params;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!z.string().uuid().safeParse(launchId).success || !parsed.success) return apiError("invalid", 400);
  const { data, error } = await createServiceClient().from("organization_locker_launches")
    .update({ status: parsed.data.status, status_note: parsed.data.note ?? null, updated_by: auth.user.id, updated_at: new Date().toISOString() })
    .eq("id", launchId).select("id,status").maybeSingle();
  if (error) return apiError("unavailable", 503);
  return data ? Response.json({ state: "updated", launch: data }, { headers: API_HEADERS }) : apiError("not_found", 404);
}
