import ConversionSurface from "@/components/preview-lockers/ConversionSurface";
import { notFound } from "next/navigation";
import LockerView from "@/app/player/[slug]/LockerView";
import { readPrivatePreview } from "@/lib/preview-lockers/server";
import { previewLockerData } from "@/lib/preview-lockers/mapper";
import { readPreviewStructuredStats } from "@/lib/player/structured-stats";
export default async function PreviewLocker({ params }: { params: Promise<{ slug: string }> }) {
  const row = await readPrivatePreview((await params).slug); if (!row) notFound();
  // The authorized preview reader supplies persisted enrichment only. Opening
  // the Locker must not discover news or issue a second authorization bypass.
  const data = previewLockerData({ ...row, awards: row.enrichment?.awards ?? row.awards }, row.publicLink);
  data.articles = row.enrichment?.articles ?? [];
  const storedStats = await readPreviewStructuredStats(row.id);
  data.structuredStats = [...(data.structuredStats ?? []), ...storedStats.filter(record => record.league !== "ncaafb" || !row.cfb_stats.length)];
  return <LockerView data={data} footer={<ConversionSurface previewId={row.id}/>} />;
}
