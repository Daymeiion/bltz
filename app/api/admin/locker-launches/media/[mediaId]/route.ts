import { z } from "zod";
import { API_HEADERS, apiError, isSameOrigin } from "@/lib/enterprise-crm/pilot/api";
import { isInternalAdmin } from "@/lib/rbac";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
const Body = z.object({ reviewStatus: z.enum(["approved", "rejected"]) }).strict();

/** BLTZ clears or rejects school-connected media before it can appear on a Locker. */
export async function PATCH(request: Request, { params }: { params: Promise<{ mediaId: string }> }) {
  if (!(await isInternalAdmin())) return apiError("forbidden", 403);
  if (!isSameOrigin(request)) return apiError("forbidden", 403);
  const { mediaId } = await params;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!z.string().uuid().safeParse(mediaId).success || !parsed.success) return apiError("invalid", 400);
  const { data, error } = await createServiceClient().from("organization_athlete_media")
    .update({ review_status: parsed.data.reviewStatus }).eq("id", mediaId).select("id,review_status").maybeSingle();
  if (error) return apiError("unavailable", 503);
  return data ? Response.json({ state: "updated", media: data }, { headers: API_HEADERS }) : apiError("not_found", 404);
}
