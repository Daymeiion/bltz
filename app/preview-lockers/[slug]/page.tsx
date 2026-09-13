import { readStructuredStats } from "@/lib/player/structured-stats";
import { readPrivatePreview } from "@/lib/preview-lockers/read";
import { toLockerData } from "@/lib/preview-lockers/mapper";
import type { PreviewLockerRow } from "@/lib/preview-lockers/types";
import LockerView from "@/app/player/[slug]/LockerView";
import { enrichPreviewSchoolBranding } from "@/lib/preview-lockers/school-branding";

export default async function PreviewLockerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { data, supabase } = await readPrivatePreview(slug, { photoLimit: 10 });

  const data_ = toLockerData(await enrichPreviewSchoolBranding(supabase, data as PreviewLockerRow));
  data_.structuredStats = await readStructuredStats(supabase, data.player_id ?? null);
  return <LockerView data={data_} />;
}
