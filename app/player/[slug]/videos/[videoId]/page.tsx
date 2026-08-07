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
  const select =
    "id, title, description, thumbnail_url, playback_url, duration_seconds, tags, created_at, meta";
  const [
    { data: selectedRow, error: videoError },
    { data: videoRows },
    { count: views },
    { count: likes },
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
    ]);

  if (videoError || !selectedRow) return null;

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
