import { notFound } from "next/navigation";
import LockerView from "@/app/player/[slug]/LockerView";
import { readPrivatePreview } from "@/lib/preview-lockers/server";
import { previewLockerData } from "@/lib/preview-lockers/mapper";
import { readPreviewStructuredStats } from "@/lib/player/structured-stats";
export default async function PreviewLocker({ params }: { params: Promise<{ slug: string }> }) {
  const row = await readPrivatePreview((await params).slug); if (!row) notFound();
  const data = previewLockerData(row);
  data.structuredStats = await readPreviewStructuredStats(row.id);
  return <LockerView data={data} />;
}
