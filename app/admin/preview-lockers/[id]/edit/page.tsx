import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { previewAdmin, PREVIEW_COLUMNS, PreviewError } from "@/lib/preview-lockers/server";
import { previewRecord } from "@/lib/preview-lockers/validation";
import PreviewLockerForm from "../../PreviewLockerForm";
import { createServiceClient } from "@/lib/supabase/service";
import { suggestPreviewAffiliations } from "@/lib/preview-lockers/affiliations";
import { readPreviewEnrichment, type EnrichmentReport } from "@/lib/preview-lockers/enrichment";
import PreviewBuilderWorkspace from "../../PreviewBuilderWorkspace";
import { readBuilderContext } from "../../builder-workspace-data";
import { readNewsReview } from "@/lib/preview-lockers/news-review-server";
import { readMerchandiseReview } from "@/lib/preview-lockers/merchandise-review-server";
import { previewIdentityKey } from "@/lib/preview-lockers/enrichment";
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
  const savedRecord = record;
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
  const enrichment = await previewClient.from("preview_enrichments").select("report,source_revision").eq("preview_id", id).maybeSingle();
  const [context, savedNews, merchandise, newsReview] = await Promise.all([
    readBuilderContext(previewClient, id),
    readPreviewEnrichment(previewClient, id, savedRecord, savedRecord.revision).catch(() => ({ articles: [] })),
    readMerchandiseReview(previewClient, id).then(review => ({ review, error: "" })).catch(() => ({ review: null, error: "Saved merchandise results could not be loaded. Your Locker merchandise is retained. Reopen this preview to try again." })),
    readNewsReview(previewClient, id, savedRecord).then(review => ({ review, error: "" })).catch(() => ({ review: null, error: "Saved news reviews could not be loaded. Your Locker articles are retained. Reopen this preview to try again." })),
  ]);
  return <PreviewBuilderWorkspace context={context} selectedId={id} athleteName={record.full_name}><PreviewLockerForm initialEnrichmentReport={enrichment.error ? null : (enrichment.data?.report as EnrichmentReport | undefined) ?? null} initialEnrichmentRevision={enrichment.data?.source_revision} key={id} record={record} initialArticles={savedNews.articles} initialNewsReview={newsReview.review} newsReviewCurrent={!newsReview.review || newsReview.review.identity_key === previewIdentityKey(savedRecord)} newsReviewError={newsReview.error} initialMerchandiseReview={merchandise.review} merchandiseReviewCurrent={!merchandise.review || merchandise.review.identity_key === previewIdentityKey(record)} merchandiseReviewError={merchandise.error} viewerAssigned={viewer.data === true} gtmLinked={Boolean(relationship.data)} gtmCompleted={completedRevision === record.revision} /></PreviewBuilderWorkspace>;
}
