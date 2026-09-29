import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { previewAdmin, PREVIEW_COLUMNS, PreviewError } from "@/lib/preview-lockers/server";
import { previewRecord } from "@/lib/preview-lockers/validation";
import PreviewLockerForm from "../../PreviewLockerForm";
import { createServiceClient } from "@/lib/supabase/service";
import { suggestPreviewAffiliations } from "@/lib/preview-lockers/affiliations";
export const dynamic = "force-dynamic";
export default async function EditPreview({ params }: { params: Promise<{ id: string }> }) {
  const { client } = await previewAdmin(); const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const previewClient = client as unknown as SupabaseClient;
  const [{ data, error }, viewer, relationship] = await Promise.all([
    client.from("preview_lockers").select(PREVIEW_COLUMNS).eq("id", id).maybeSingle(),
    client.rpc("preview_locker_has_viewer", { p_preview_locker_id: id }),
    previewClient.from("gtm_player_preview_lockers").select("completed_revision,gsis_id").eq("preview_locker_id", id).maybeSingle(),
  ]);
  if (error) throw new PreviewError("preview_unavailable", 503);
  if (!data) notFound();
  if (viewer.error) throw new PreviewError("preview_unavailable", 503);
  if (relationship.error && relationship.error.code !== "42P01" && relationship.error.code !== "PGRST205") throw new PreviewError("preview_unavailable", 503);
  let record = previewRecord.parse(data);
  const service = createServiceClient();
  const identity = await service.from("preview_lockers").select("player_id").eq("id", id).maybeSingle();
  if (identity.error) throw new PreviewError("preview_unavailable", 503);
  const [master, ingestion, schoolDirectory] = await Promise.all([
    relationship.data?.gsis_id ? service.from("nfl_players").select("college_name,latest_team").eq("gsis_id", relationship.data.gsis_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    identity.data?.player_id ? service.from("player_stat_ingestions").select("raw_profile,normalized,league").eq("player_id", identity.data.player_id).eq("status", "IMPORTED").order("imported_at", { ascending: false }).limit(5) : Promise.resolve({ data: [], error: null }),
    service.from("cfb_teams").select("display_name,abbreviation,primary_color,logo_url,logo_dark_url").limit(1000),
  ]);
  if (master.error || ingestion.error || schoolDirectory.error) throw new PreviewError("preview_unavailable", 503);
  const profiles = ingestion.data ?? [];
  const college = master.data?.college_name || profiles.map(item => (item.raw_profile as { college?: string } | null)?.college).find(Boolean) || null;
  const seasons = profiles.filter(item => item.league === "nfl").flatMap(item => (item.normalized as { seasons?: Array<{ team?: string }> } | null)?.seasons ?? []);
  record = suggestPreviewAffiliations(record, { college, latestTeam: master.data?.latest_team, seasons }, schoolDirectory.data ?? []);
  const completedRevision = relationship.data?.completed_revision == null ? null : Number(relationship.data.completed_revision);
  return <section className="mx-auto max-w-4xl space-y-6 p-6 sm:p-10"><h1 className="text-3xl font-semibold">Edit private preview</h1><PreviewLockerForm record={record} viewerAssigned={viewer.data === true} gtmLinked={Boolean(relationship.data)} gtmCompleted={completedRevision === record.revision} /></section>;
}
