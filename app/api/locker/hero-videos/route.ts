import { createClient } from "@/lib/supabase/server";
import { previewVideoSource } from "@/lib/preview-lockers/video";
import { readBody, failure } from "@/lib/preview-lockers/server";
import { z } from "zod";

const schema = z.object({ mobile: z.uuid().nullable(), desktop: z.uuid().nullable() }).strict();
const respond = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
async function context() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { error: respond({ error: "Sign in to manage your Locker." }, 401) };
  const { data: player, error } = await client.from("players").select("id").eq("user_id", user.id).maybeSingle();
  if (error) return { error: respond({ error: "Unable to load your athlete identity." }, 503) };
  if (!player) return { error: respond({ error: "A verified athlete profile is required." }, 403) };
  return { client, player };
}
export async function GET() {
  const ctx = await context();
  if (ctx.error) return ctx.error;
  const { client, player } = ctx;
  const [settings, videos] = await Promise.all([
    client.from("player_lockers").select("hero_video_mobile_id,hero_video_desktop_id").eq("player_id", player.id).maybeSingle(),
    client.from("videos").select("id,title,playback_url").eq("player_id", player.id).eq("visibility", "public").order("created_at", { ascending: false }),
  ]);
  if (settings.error || videos.error) return respond({ error: "Hero video settings are not available yet. Please try again later." }, 503);
  return respond({ mobile: settings.data?.hero_video_mobile_id ?? null, desktop: settings.data?.hero_video_desktop_id ?? null,
    videos: (videos.data ?? []).filter(video => previewVideoSource(video.playback_url).playbackUrl).map(video => ({ id: video.id, title: video.title })) });
}
export async function PUT(request: Request) {
  const ctx = await context();
  if (ctx.error) return ctx.error;
  try {
    const parsed = schema.safeParse(await readBody(request, 4096));
    if (!parsed.success) return respond({ error: "Choose valid hero videos." }, 400);
    const { client, player } = ctx;
    const ids = [...new Set([parsed.data.mobile, parsed.data.desktop].filter((id): id is string => id !== null))];
    if (ids.length) {
      const { data, error } = await client.from("videos").select("id,playback_url").eq("player_id", player.id).eq("visibility", "public").in("id", ids);
      if (error) return respond({ error: "Unable to verify your videos." }, 503);
      if (data?.length !== ids.length || data.some(video => !previewVideoSource(video.playback_url).playbackUrl)) return respond({ error: "Choose public playable videos belonging to your athlete profile." }, 400);
    }
    const { error } = await client.from("player_lockers").upsert({ player_id: player.id,
      hero_videos_configured: true, hero_video_mobile_id: parsed.data.mobile, hero_video_desktop_id: parsed.data.desktop }, { onConflict: "player_id" });
    if (error) return respond({ error: "Unable to save hero videos. Your selection has been retained." }, 503);
    return respond({ saved: true });
  } catch (error) { return failure(error); }
}
