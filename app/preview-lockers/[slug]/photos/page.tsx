import ConversionSurface from "@/components/preview-lockers/ConversionSurface";
import PreviewEventTracker from "@/components/preview-lockers/PreviewEventTracker";
import { previewPendingOrNotFound } from "@/components/preview-lockers/preview-pending";
import PhotoRoomView from "@/app/player/[slug]/photos/PhotoRoomView";
import { readPrivatePreview } from "@/lib/preview-lockers/server";
import { previewPhotoData } from "@/lib/preview-lockers/mapper";
export default async function PreviewPhotos({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const row = await readPrivatePreview(slug); if (!row) return previewPendingOrNotFound(slug);
  return <><PhotoRoomView data={previewPhotoData(row, row.publicLink)} previewId={row.id} /><PreviewEventTracker previewId={row.id} eventName="photos_view"/><ConversionSurface previewId={row.id} room="photos_view"/></>;
}
