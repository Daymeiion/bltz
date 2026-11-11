import ConversionSurface from "@/components/preview-lockers/ConversionSurface";
import { notFound } from "next/navigation";
import LockerView from "@/app/player/[slug]/LockerView";
import { readPrivatePreview } from "@/lib/preview-lockers/server";
import { previewLockerData } from "@/lib/preview-lockers/mapper";
import { readPreviewStructuredStats } from "@/lib/player/structured-stats";
import { readPreviewEnrichment } from "@/lib/preview-lockers/enrichment";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
export default async function PreviewLocker({ params }: { params: Promise<{ slug: string }> }) {
  const row = await readPrivatePreview((await params).slug); if (!row) notFound();
  const data = previewLockerData(row, row.publicLink);
  // readPrivatePreview has already authorized this row, including published-link access.
  // Read only permitted article/award fields; never diagnostics or provider calls.
  const [enrichment, storedStats] = await Promise.all([
    (row.publicLink ? Promise.resolve(createServiceClient()) : createClient())
      .then(client => readPreviewEnrichment(client, row.id, row, row.revision)).catch(() => null),
    readPreviewStructuredStats(row.id),
  ]);
  if (enrichment) { data.awards = enrichment.awards; data.articles = enrichment.articles; }
  data.structuredStats = [...(data.structuredStats ?? []), ...storedStats.filter(record => record.league !== "ncaafb" || !row.cfb_stats.length)];
  return <LockerView data={data} footer={<ConversionSurface previewId={row.id}/>} />;
}
