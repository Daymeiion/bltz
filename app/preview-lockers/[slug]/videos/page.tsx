import ConversionSurface from "@/components/preview-lockers/ConversionSurface";
import { notFound } from "next/navigation";
import Link from "next/link";
import { readPrivatePreview } from "@/lib/preview-lockers/server";
import { youtubeEmbed } from "@/lib/preview-lockers/validation";
import FilmRoomView from "@/app/player/[slug]/videos/FilmRoomView";
import { toFilmRoomData } from "@/lib/preview-lockers/mapper";
export function PreviewVideoSource({ video }: { video: { id: string; title: string; url: string; storagePath?: string; mimeType?: string } }) {
  const embed = youtubeEmbed(video.url);
  return <section id={video.id} className="space-y-3 rounded-lg border border-white/20 p-4"><h2>{video.title}</h2>{video.storagePath ? <video className="aspect-video w-full bg-black" src={video.url} controls preload="metadata">Your browser cannot play this private video.</video> : embed ? <iframe className="aspect-video w-full" src={embed} title={video.title} loading="lazy" referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-presentation" allow="fullscreen" allowFullScreen /> : <p>This source is not loaded inside BLTZ. Open it on its provider to review it.</p>}{video.storagePath ? <p>Private uploaded video · rights unverified</p> : <a className="underline" href={video.url} target="_blank" rel="noopener noreferrer">Open source · rights unverified</a>}</section>;
}
export default async function PreviewVideos({ params }: { params: Promise<{ slug: string }> }) {
  const row = await readPrivatePreview((await params).slug); if (!row) notFound();
  const sources = [
    ...(row.hero_video_url ? [{ id: "hero-video", title: "Hero video source", url: row.hero_video_url }] : []),
    ...row.videos,
  ];
  const data = toFilmRoomData({ ...row, videos: sources.map(video => ({ ...video, thumb: "thumb" in video ? video.thumb : null })) });
  return <><FilmRoomView data={data} /><div className="p-6 text-center"><Link className="text-sm text-white/60 underline" href={`/preview-lockers/${row.slug}`}>Back to Locker</Link></div><ConversionSurface previewId={row.id} room="film_view"/></>;
}
