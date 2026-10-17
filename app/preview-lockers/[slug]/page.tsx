import ConversionSurface from "@/components/preview-lockers/ConversionSurface";
import PreviewEventTracker from "@/components/preview-lockers/PreviewEventTracker";
import { previewPendingOrNotFound } from "@/components/preview-lockers/preview-pending";
import LockerView from "@/app/player/[slug]/LockerView";
import { readPrivatePreview } from "@/lib/preview-lockers/server";
import { previewLockerData } from "@/lib/preview-lockers/mapper";
import { readPreviewStructuredStats } from "@/lib/player/structured-stats";
export default async function PreviewLocker({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const row = await readPrivatePreview(slug); if (!row) return previewPendingOrNotFound(slug);
  const data = previewLockerData({ ...row, awards: row.enrichment?.awards ?? row.awards }, row.publicLink);
  const storedStats = await readPreviewStructuredStats(row.id);
  data.structuredStats = [...(data.structuredStats ?? []), ...storedStats.filter(record => record.league === "nfl" ? !row.pfr_stats?.length : !row.cfb_stats.length)];
  return <LockerView data={data} previewId={row.id} footer={<><PreviewEventTracker previewId={row.id} eventName="locker_view"/><ConversionSurface previewId={row.id}/></>} />;
}
