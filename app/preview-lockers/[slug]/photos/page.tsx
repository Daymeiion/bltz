import ConversionSurface from "@/components/preview-lockers/ConversionSurface";
import PreviewEventTracker from "@/components/preview-lockers/PreviewEventTracker";
import { notFound } from "next/navigation";
import PhotoRoomView from "@/app/player/[slug]/photos/PhotoRoomView";
import { readPrivatePreview } from "@/lib/preview-lockers/server";
import { previewPhotoData } from "@/lib/preview-lockers/mapper";
export default async function PreviewPhotos({ params }: { params: Promise<{ slug: string }> }) {
  const row = await readPrivatePreview((await params).slug); if (!row) notFound();
  return <><PhotoRoomView data={previewPhotoData(row, row.publicLink)} previewId={row.id} /><PreviewEventTracker previewId={row.id} eventName="photos_view"/><ConversionSurface previewId={row.id} room="photos_view"/></>;
}
