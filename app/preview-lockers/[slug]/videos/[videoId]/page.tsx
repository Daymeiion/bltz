import { notFound } from "next/navigation";
import { readPrivatePreview } from "@/lib/preview-lockers/read";
import { toFilmRoomData } from "@/lib/preview-lockers/mapper";
import type { PreviewLockerRow } from "@/lib/preview-lockers/types";
import VideoDetailView from "@/app/player/[slug]/videos/[videoId]/VideoDetailView";

export default async function PreviewVideoPage({ params }: { params: Promise<{ slug: string; videoId: string }> }) {
  const { slug, videoId } = await params;
  const { data } = await readPrivatePreview(slug);
  const film = toFilmRoomData(data as PreviewLockerRow);
  const video = film.videos.find((item) => item.id === videoId);
  if (!video) return notFound();
  return <VideoDetailView data={{ ...film, video, views: 0, likes: 0, taggedTeammates: [], playerId: null, isFollowing: false }} />;
}
