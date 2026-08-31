import { notFound } from "next/navigation";
import Link from "next/link";
import PhotoRoomView from "@/app/player/[slug]/photos/PhotoRoomView";
import { readPrivatePreview } from "@/lib/preview-lockers/server";
import { previewPhotoData } from "@/lib/preview-lockers/mapper";
export default async function PreviewPhotos({ params }: { params: Promise<{ slug: string }> }) {
  const row = await readPrivatePreview((await params).slug); if (!row) notFound();
  return <><PhotoRoomView data={previewPhotoData(row)} /><section className="space-y-4 bg-black p-6 text-white"><Link className="underline" href={`/preview-lockers/${row.slug}`}>Back to private Locker</Link><h2 className="text-xl">Photo sources and credits</h2>{row.photos.map(photo => <p key={photo.id}>{photo.title} · {photo.credits || "Credit not recorded"} · Rights unverified {photo.sourceUrl && <a className="underline" href={photo.sourceUrl} target="_blank" rel="noopener noreferrer">Source</a>}</p>)}</section></>;
}
