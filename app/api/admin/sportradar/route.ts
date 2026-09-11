import { z } from "zod";
import { isInternalAdmin } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { previewProfile, importProfile, getTrialUsage } from "@/lib/sportradar/service";
import { StatsError } from "@/lib/sportradar/errors";
import { League } from "@/lib/sportradar/types";

export const runtime = "nodejs";
export const maxDuration = 60;
function json(body: unknown, status = 200) { return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } }); }
async function authorize() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new StatsError("unauthorized", 401);
  if (!(await isInternalAdmin())) throw new StatsError("forbidden", 403);
  return { actorId: user.id, db };
}
function failure(error: unknown) {
  if (error instanceof StatsError) return json({ error: error.code }, error.status);
  return json({ error: "stats_unavailable" }, 503);
}
export async function GET(request: Request) {
  try {
    await authorize();
    const q = new URL(request.url).searchParams.get("q")?.trim();
    if (q) {
      if (q.length < 2 || q.length > 80 || !/^[\p{L}\p{N} .'-]+$/u.test(q)) return json({ error: "invalid_search" }, 400);
      const { data, error } = await createServiceClient().from("players")
        .select("id,full_name,slug,position,school,dob,team").ilike("full_name", `%${q}%`).limit(20);
      if (error) throw new StatsError("player_search_failed", 503);
      return json({ players: data });
    }
    const playerId = new URL(request.url).searchParams.get("playerId");
    if (playerId) {
      if (!z.string().uuid().safeParse(playerId).success) return json({ error: "invalid_player_id" }, 400);
      const db = createServiceClient();
      const [mappings, ingestions] = await Promise.all([
        db.from("player_external_ids").select("league,provider_player_id,verified_at").eq("player_id", playerId).eq("provider", "sportradar"),
        db.from("player_stat_ingestions").select("id,league,status,fetched_at,imported_at,provider_player_id").eq("player_id", playerId).order("fetched_at", { ascending: false }).limit(10),
      ]);
      if (mappings.error || ingestions.error) throw new StatsError("stats_storage_unavailable", 503);
      return json({ mappings: mappings.data, ingestions: ingestions.data });
    }
    return json(await getTrialUsage());
  } catch (error) { return failure(error); }
}
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("preview"), playerId: z.string().uuid(), providerId: z.string().uuid(), league: League, refresh: z.boolean().default(false) }),
  z.object({ action: z.literal("import"), ingestionId: z.string().uuid(), previewId: z.string().uuid(), approved: z.literal(true) }),
]);
export async function POST(request: Request) {
  try {
    const { actorId, db } = await authorize();
    if (request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "invalid_origin" }, 403);
    let body: z.infer<typeof Body>;
    try { body = Body.parse(await request.json()); } catch { return json({ error: "invalid_input" }, 400); }
    if (body.action === "preview") return json(await previewProfile(body.playerId, body.providerId, body.league, body.refresh));
    return json({ playerId: await importProfile(db, body.ingestionId, body.previewId, actorId), status: "IMPORTED" });
  } catch (error) { return failure(error); }
}
