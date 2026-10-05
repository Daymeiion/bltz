import ConversionSurface from "@/components/preview-lockers/ConversionSurface";
import { notFound } from "next/navigation";
import { readPrivatePreview } from "@/lib/preview-lockers/server";
import { toFilmRoomData } from "@/lib/preview-lockers/mapper";
import VideoDetailView from "@/app/player/[slug]/videos/[videoId]/VideoDetailView";

export default async function PreviewVideoPage({ params }: { params: Promise<{ slug: string; videoId: string }> }) {
  const { slug, videoId } = await params;
  const data = await readPrivatePreview(slug);
  if (!data) return notFound();
  const film = toFilmRoomData(data);
  const video = film.videos.find((item) => item.id === videoId);
  if (!video) return notFound();
  return <VideoDetailView footer={<ConversionSurface previewId={data.id} room="film_view" />} data={{ ...film, video, views: 0, likes: 0, taggedTeammates: [], playerId: null, isFollowing: false }} />;
}
