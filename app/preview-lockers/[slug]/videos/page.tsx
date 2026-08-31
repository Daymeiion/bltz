import { notFound } from "next/navigation";
import Link from "next/link";
import { readPrivatePreview } from "@/lib/preview-lockers/server";
import { youtubeEmbed } from "@/lib/preview-lockers/validation";
export default async function PreviewVideos({ params }: { params: Promise<{ slug: string }> }) {
  const row = await readPrivatePreview((await params).slug); if (!row) notFound();
  return <main className="mx-auto max-w-5xl space-y-6 p-6 text-white"><Link className="underline" href={`/preview-lockers/${row.slug}`}>Back to private Locker</Link><h1 className="text-3xl">{row.full_name} · Private Film Room</h1>{!row.videos.length && <p>No videos saved in this preview.</p>}{row.videos.map(video => { const embed = youtubeEmbed(video.url); const direct = /\.(mp4|webm|mov|m4v)(?:[?#]|$)/i.test(video.url); return <section key={video.id} id={video.id} className="space-y-3 rounded-lg border border-white/20 p-4"><h2>{video.title}</h2>{embed ? <iframe className="aspect-video w-full" src={embed} title={video.title} loading="lazy" referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-presentation" allow="fullscreen" allowFullScreen /> : direct ? <video className="max-h-96 w-full" src={video.url} controls preload="none" aria-label={video.title} /> : <p>This source opens on its provider.</p>}<a className="underline" href={video.url} target="_blank" rel="noopener noreferrer">Open source · rights unverified</a></section>; })}</main>;
}
