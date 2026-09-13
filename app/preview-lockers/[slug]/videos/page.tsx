import { readPrivatePreview } from "@/lib/preview-lockers/read";
import { toFilmRoomData } from "@/lib/preview-lockers/mapper";
import type { PreviewLockerRow } from "@/lib/preview-lockers/types";
import FilmRoomView from "@/app/player/[slug]/videos/FilmRoomView";

export default async function PreviewFilmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data } = await readPrivatePreview(slug);
  return <FilmRoomView data={toFilmRoomData(data as PreviewLockerRow)} />;
}
