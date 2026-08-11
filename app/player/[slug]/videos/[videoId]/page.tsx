import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { MOCK_PLAYERS } from "@/lib/mock";
import {
  createMockPublicVideos,
  toPublicVideo,
  type PublicVideo,
} from "@/lib/player/public-video";
import { createClient } from "@/lib/supabase/server";
import VideoDetailView, { type VideoDetailData } from "./VideoDetailView";

type RouteParams = { slug: string; videoId: string };

const useMock =
  process.env.NEXT_PUBLIC_USE_MOCK === "1" && process.env.NODE_ENV !== "production";

function taggedPlayerIds(meta: unknown): string[] {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return [];
  const value = (meta as Record<string, unknown>).tagged_player_ids;
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is string => typeof id === "string" && id.trim().length > 0))];
}

const loadVideoDetail = cache(async (slug: string, videoId: string): Promise<VideoDetailData | null> => {
  const usePreviewMock =
    useMock || (slug === "test-null-user-id" && process.env.NODE_ENV !== "production");

  if (usePreviewMock) {
    const player = MOCK_PLAYERS.find((item) => item.slug === slug) ?? MOCK_PLAYERS[0];
    const athleteName = player?.full_name ?? "Demo Player";
    const videos = createMockPublicVideos(athleteName);
    const video = videos.find((item) => item.id === videoId);
    if (!video) return null;

    return {
      slug,
      athleteName,
      athleteHeadshotUrl: "/images/Headshot.png",
      accentColor: "#ffbb00",
      video,
      videos,
      views: 842_000,
      likes: 45_648,
      playerId: null,
      isFollowing: false,
      taggedTeammates: [
        { id: "mock-km", name: "Kai Mitchell", headshotUrl: null, position: "WR", team: "Demo Team" },
        { id: "mock-rj", name: "Roman James", headshotUrl: null, position: "S", team: "Demo Team" },
        { id: "mock-at", name: "Andre Taylor", headshotUrl: null, position: "LB", team: "Demo Team" },
        { id: "mock-ds", name: "Devin Scott", headshotUrl: null, position: "RB", team: "Demo Team" },
        { id: "mock-jb", name: "Jordan Brooks", headshotUrl: null, position: "QB", team: "Demo Team" },
        { id: "mock-mc", name: "Malik Carter", headshotUrl: null, position: "CB", team: "Demo Team" },
        { id: "mock-tw", name: "Terrence Wright", headshotUrl: null, position: "TE", team: "Demo Team" },
        { id: "mock-cn", name: "Chris Nelson", headshotUrl: null, position: "DL", team: "Demo Team" },
        { id: "mock-el", name: "Evan Lewis", headshotUrl: null, position: "OL", team: "Demo Team" },
        { id: "mock-bh", name: "Bryce Harris", headshotUrl: null, position: "K", team: "Demo Team" },
      ],
    };
  }

  const supabase = await createClient();
  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id, full_name, name, slug, profile_image, headshot_url")
    .eq("slug", slug)
    .eq("visibility", true)
    .maybeSingle();

  if (playerError || !player) return null;

  const athleteName = player.full_name || player.name || "Unknown Player";
  const { data: authData } = await supabase.auth.getUser();
  const followQuery = authData.user
    ? supabase
        .from("player_follows")
        .select("id")
        .eq("user_id", authData.user.id)
        .eq("player_id", player.id)
        .maybeSingle()
    : Promise.resolve({ data: null });
  const select =
    "id, title, description, thumbnail_url, playback_url, duration_seconds, tags, created_at, meta";
  const [
    { data: selectedRow, error: videoError },
    { data: videoRows },
    { count: views },
    { count: likes },
    { data: followRow },
  ] =
    await Promise.all([
      supabase
        .from("videos")
        .select(select)
        .eq("id", videoId)
        .eq("player_id", player.id)
        .eq("visibility", "public")
        .maybeSingle(),
      supabase
        .from("videos")
        .select(select)
        .eq("player_id", player.id)
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .limit(80),
      supabase
        .from("views")
        .select("id", { count: "exact", head: true })
        .eq("video_id", videoId),
      supabase
        .from("video_engagement")
        .select("id", { count: "exact", head: true })
        .eq("video_id", videoId)
        .eq("engagement_type", "like"),
      followQuery,
    ]);

  if (videoError || !selectedRow) return null;

  const taggedIds = taggedPlayerIds(selectedRow.meta);
  const { data: taggedRows } = taggedIds.length > 0
    ? await supabase
        .from("players")
        .select("id, full_name, name, headshot_url, profile_image, position, team")
        .in("id", taggedIds)
        .eq("visibility", true)
    : { data: [] };
  const taggedById = new Map((taggedRows ?? []).map((teammate) => [teammate.id, teammate]));
  const taggedTeammates = taggedIds.flatMap((id) => {
    const teammate = taggedById.get(id);
    if (!teammate) return [];
    return [{
      id: teammate.id,
      name: teammate.full_name || teammate.name || "Teammate",
      headshotUrl: teammate.headshot_url || teammate.profile_image,
      position: teammate.position,
      team: teammate.team,
    }];
  });

  const videos = (videoRows ?? []).map((row) => toPublicVideo(row, athleteName));
  const selected = toPublicVideo(selectedRow, athleteName);

  return {
    slug,
    athleteName,
    athleteHeadshotUrl:
      player.headshot_url || player.profile_image || "/images/black-headshot-fallback.svg",
    accentColor: "#ffbb00",
    video: selected,
    videos: videos.some((item) => item.id === selected.id) ? videos : [selected, ...videos],
    views: views ?? 0,
    likes: likes ?? 0,
    taggedTeammates,
    playerId: player.id,
    isFollowing: Boolean(followRow),
  };
});

export async function generateMetadata({ params }: { params: Promise<RouteParams> }): Promise<Metadata> {
  const { slug, videoId } = await params;
  const data = await loadVideoDetail(slug, videoId);
  if (!data) return { title: "Film not found | BLTZ" };

  const description =
    data.video.description || `Watch ${data.video.title} in ${data.athleteName}'s BLTZ Film Room.`;
  return {
    title: `${data.video.title} | ${data.athleteName} | BLTZ`,
    description,
    openGraph: {
      title: `${data.video.title} | ${data.athleteName}`,
      description,
      images: data.video.thumbnailUrl ? [data.video.thumbnailUrl] : undefined,
      type: "video.other",
    },
  };
}

export default async function VideoDetailPage({ params }: { params: Promise<RouteParams> }) {
  const { slug, videoId } = await params;
  const data = await loadVideoDetail(slug, videoId);
  if (!data) notFound();
  return <VideoDetailView data={data} />;
}

export type { PublicVideo };
