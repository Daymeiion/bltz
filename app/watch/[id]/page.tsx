import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function LegacyWatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: video, error: videoError } = await supabase
    .from("videos")
    .select("id, player_id")
    .eq("id", id)
    .eq("visibility", "public")
    .maybeSingle();

  if (videoError || !video?.player_id) notFound();

  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("slug")
    .eq("id", video.player_id)
    .eq("visibility", true)
    .maybeSingle();

  if (playerError || !player?.slug) notFound();
  redirect(`/player/${player.slug}/videos/${video.id}`);
}
