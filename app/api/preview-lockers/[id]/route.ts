import { canSaveStatsImports } from "@/lib/source-policy/preview-stats";
import { cfbImports } from "@/lib/preview-lockers/cfb-csv";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { updatePreview, previewMediaBelongsTo } from "@/lib/preview-lockers/validation";
import { assertPreviewMediaExists, previewAdmin, readBody, json, failure, PreviewError } from "@/lib/preview-lockers/server";
import type { PreviewDatabase } from "@/types/preview-lockers.generated";
import { tryEnrichSavedPreview } from "@/lib/preview-lockers/enrichment";

export const runtime = "nodejs";
export const maxDuration = 60;
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { client } = await previewAdmin();
    const { id } = await params;
    if (!z.uuid().safeParse(id).success) throw new PreviewError("invalid_input", 400);
    const parsed = updatePreview.safeParse(await readBody(req));
    if (!parsed.success) throw new PreviewError("invalid_input", 400);
    const { revision, content } = parsed.data;
    if (!canSaveStatsImports(content.cfb_stats)) {
      const previous = await client.from("preview_lockers").select("cfb_stats,revision").eq("id", id).eq("revision", revision).maybeSingle();
      if (previous.error) throw new PreviewError("could_not_update", 503);
      if (!previous.data) throw new PreviewError("preview_conflict", 409);
      const saved = cfbImports.safeParse(previous.data.cfb_stats);
      if (!saved.success || !canSaveStatsImports(content.cfb_stats, saved.data)) throw new PreviewError("source_policy_restricted", 400);
    }
    if (!previewMediaBelongsTo(id, content)) throw new PreviewError("invalid_media_path", 400);
    await assertPreviewMediaExists(client, content);
    const update: PreviewDatabase["public"]["Tables"]["preview_lockers"]["Update"] = content;
    const { data, error } = await client.from("preview_lockers").update(update).eq("id", id).eq("revision", revision).select("id,slug,revision").maybeSingle();
    if (error?.code === "23505") throw new PreviewError("preview_conflict", 409);
    if (error) throw new PreviewError("could_not_update", 503);
    if (!data) throw new PreviewError("preview_conflict", 409);
    const relationship = await (client as unknown as SupabaseClient)
      .from("gtm_player_preview_lockers")
      .select("completed_revision")
      .eq("preview_locker_id", id)
      .maybeSingle();
    const completionStatus = relationship.error ? "unavailable" : "available";
    await tryEnrichSavedPreview(client, id, content, data.revision, false);
    return json({
      ...data,
      complete: relationship.data != null && Number(relationship.data.completed_revision) === data.revision,
      completionStatus,
    });
  } catch (error) { return failure(error); }
}
// No DELETE handler: permanent deletion is not an approved preview operation.
