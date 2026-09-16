import ConversionSurface from "@/components/preview-lockers/ConversionSurface";
import { notFound } from "next/navigation";
import LockerView from "@/app/player/[slug]/LockerView";
import { readPrivatePreview } from "@/lib/preview-lockers/server";
import { previewLockerData } from "@/lib/preview-lockers/mapper";
import { readPreviewStructuredStats } from "@/lib/player/structured-stats";
export default async function PreviewLocker({ params }: { params: Promise<{ slug: string }> }) {
  const row = await readPrivatePreview((await params).slug); if (!row) notFound();
  const data = previewLockerData(row);
  const storedStats = await readPreviewStructuredStats(row.id);
  data.structuredStats = [...(data.structuredStats ?? []), ...storedStats.filter(record => record.league !== "ncaafb" || !row.cfb_stats.length)];
  return <LockerView data={data} footer={<ConversionSurface previewId={row.id}/>} />;
}
