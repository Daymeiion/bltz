import { readPrivatePreview } from "@/lib/preview-lockers/read";
import { toPhotoRoomData } from "@/lib/preview-lockers/mapper";
import type { PreviewLockerRow } from "@/lib/preview-lockers/types";
import PhotoRoomView from "@/app/player/[slug]/photos/PhotoRoomView";

export default async function PreviewLockerPhotosPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { data } = await readPrivatePreview(slug, { photoLimit: 24 });

  const data_ = toPhotoRoomData(data as PreviewLockerRow);
  return <PhotoRoomView data={data_} />;
}
