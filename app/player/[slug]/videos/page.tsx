import { notFound } from "next/navigation";
import { MOCK_PLAYERS } from "@/lib/mock";
import { createMockPublicVideos, toPublicVideo } from "@/lib/player/public-video";
import { createClient } from "@/lib/supabase/server";
import FilmRoomView, { type FilmRoomData } from "./FilmRoomView";

const useMock =
  process.env.NEXT_PUBLIC_USE_MOCK === "1" && process.env.NODE_ENV !== "production";

function mockFilmRoom(slug: string): FilmRoomData {
  const player = MOCK_PLAYERS.find((item) => item.slug === slug) ?? MOCK_PLAYERS[0];
  const athleteName = player?.full_name ?? "Demo Player";

  return {
    slug,
    athleteName,
    athleteHeadshotUrl: "/images/Headshot.png",
    accentColor: "#ffbb00",
    videos: createMockPublicVideos(athleteName),
  };
}

export default async function FilmRoomPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (
    useMock ||
    (slug === "test-null-user-id" && process.env.NODE_ENV !== "production")
  ) {
    return <FilmRoomView data={mockFilmRoom(slug)} />;
  }

  const supabase = await createClient();
  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id, full_name, name, slug, profile_image, headshot_url")
    .eq("slug", slug)
    .eq("visibility", true)
    .maybeSingle();

  if (playerError || !player) return notFound();

  const athleteName = player.full_name || player.name || "Unknown Player";
  const { data: videos } = await supabase
    .from("videos")
    .select(
      "id, title, description, thumbnail_url, playback_url, duration_seconds, tags, created_at, meta",
    )
    .eq("player_id", player.id)
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(48);

  const data: FilmRoomData = {
    slug,
    athleteName,
    athleteHeadshotUrl:
      player.headshot_url || player.profile_image || "/images/black-headshot-fallback.svg",
    accentColor: "#ffbb00",
    videos: (videos ?? []).map((video) => toPublicVideo(video, athleteName)),
  };

  return <FilmRoomView data={data} />;
}
