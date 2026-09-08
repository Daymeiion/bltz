import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { previewAdmin, PREVIEW_COLUMNS, PreviewError } from "@/lib/preview-lockers/server";
import { previewRecord } from "@/lib/preview-lockers/validation";
import PreviewLockerForm from "../../PreviewLockerForm";
export const dynamic = "force-dynamic";
export default async function EditPreview({ params }: { params: Promise<{ id: string }> }) {
  const { client } = await previewAdmin(); const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const previewClient = client as unknown as SupabaseClient;
  const [{ data, error }, viewer, relationship] = await Promise.all([
    client.from("preview_lockers").select(PREVIEW_COLUMNS).eq("id", id).maybeSingle(),
    client.rpc("preview_locker_has_viewer", { p_preview_locker_id: id }),
    previewClient.from("gtm_player_preview_lockers").select("completed_revision").eq("preview_locker_id", id).maybeSingle(),
  ]);
  if (error) throw new PreviewError("preview_unavailable", 503);
  if (!data) notFound();
  if (viewer.error) throw new PreviewError("preview_unavailable", 503);
  if (relationship.error && relationship.error.code !== "42P01" && relationship.error.code !== "PGRST205") throw new PreviewError("preview_unavailable", 503);
  const record = previewRecord.parse(data);
  const completedRevision = relationship.data?.completed_revision == null ? null : Number(relationship.data.completed_revision);
  return <section className="mx-auto max-w-4xl space-y-6 p-6 sm:p-10"><h1 className="text-3xl font-semibold">Edit private preview</h1><PreviewLockerForm record={record} viewerAssigned={viewer.data === true} gtmLinked={Boolean(relationship.data)} gtmCompleted={completedRevision === record.revision} /></section>;
}
