import { z } from "zod";
import { API_HEADERS, apiError, authorizeWrite } from "@/lib/enterprise-crm/pilot/api";
import { isPlayerMoment } from "@/lib/enterprise-crm/pilot/athlete";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const input = z.object({ momentId: z.string().min(1).max(80).nullable() }).strict();
const uuid = z.string().uuid();

/** Ties one of the school's own media items to a Moment of the same player, or unties it. */
export async function PATCH(request: Request, { params }: { params: Promise<{ organizationId: string; mediaId: string }> }) {
  const { organizationId, mediaId } = await params;
  const auth = await authorizeWrite(request, organizationId, "activation.manage");
  if (!auth.ok) return auth.response;
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !uuid.safeParse(mediaId).success) return apiError("invalid", 400);
  try {
    const db = createServiceClient();
    const { data } = await db.from("organization_athlete_media").select("id,player_id").eq("id", mediaId).eq("organization_id", auth.context.organization.id).maybeSingle();
    const row = data as { id: string; player_id: string | null } | null;
    if (!row?.player_id) return apiError("not_found", 404);
    if (parsed.data.momentId && !(await isPlayerMoment(auth.context, row.player_id, parsed.data.momentId))) return apiError("invalid_moment", 400);
    const { error } = await db.from("organization_athlete_media").update({ moment_id: parsed.data.momentId }).eq("id", mediaId).eq("organization_id", auth.context.organization.id);
    if (error) return apiError("unavailable", 503);
    return Response.json({ state: "updated", momentId: parsed.data.momentId }, { headers: API_HEADERS });
  } catch {
    return apiError("unavailable", 503);
  }
}
