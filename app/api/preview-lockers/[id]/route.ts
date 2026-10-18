import { assertAwardReferences } from "@/lib/award-images/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { updatePreview, previewMediaBelongsTo } from "@/lib/preview-lockers/validation";
import { assertPreviewMediaExists, previewAdmin, readBody, json, failure, PreviewError, PREVIEW_COLUMNS } from "@/lib/preview-lockers/server";
import type { PreviewDatabase } from "@/types/preview-lockers.generated";

import { tryEnrichSavedPreview } from "@/lib/preview-lockers/enrichment";

export const runtime = "nodejs";
export const maxDuration = 60;
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { client } = await previewAdmin();
    const { id } = await params;
    if (!z.uuid().safeParse(id).success) throw new PreviewError("invalid_input", 400);
    const input = await readBody(req);
    const parsed = updatePreview.safeParse(input);
    if (!parsed.success) throw new PreviewError("invalid_input", 400);
    const { revision, content } = parsed.data;
    if (!previewMediaBelongsTo(id, content)) throw new PreviewError("invalid_media_path", 400);
    await assertPreviewMediaExists(client, content);
    await assertAwardReferences(client, content.awards);
    // Defaults validate old editors, but are not edits. Never persist an empty
    // array/null for a field the operator's editor did not actually submit.
    const submitted = (input as { content: Record<string, unknown> }).content;
    const update: PreviewDatabase["public"]["Tables"]["preview_lockers"]["Update"] = Object.fromEntries(Object.entries(content).filter(([key]) => Object.hasOwn(submitted, key)));
    const { data, error } = await client.from("preview_lockers").update(update).eq("id", id).eq("revision", revision).select(PREVIEW_COLUMNS).maybeSingle();
    if (error?.code === "23505") throw new PreviewError("preview_conflict", 409);
    if (error) throw new PreviewError("could_not_update", 503);
    if (!data) throw new PreviewError("preview_conflict", 409);
    const relationship = await (client as unknown as SupabaseClient)
      .from("gtm_player_preview_lockers")
      .select("completed_revision")
      .eq("preview_locker_id", id)
      .maybeSingle();
    const completionStatus = relationship.error ? "unavailable" : "available";
    // Enrich the actual saved snapshot, including fields retained for old clients.
    const savedContent = { ...content, ...Object.fromEntries(Object.keys(content).filter(key => Object.hasOwn(data, key)).map(key => [key, data[key as keyof typeof data]])) };
    await tryEnrichSavedPreview(client, id, savedContent, data.revision, false);
    return json({
      id: data.id, slug: data.slug, revision: data.revision,
      complete: relationship.data != null && Number(relationship.data.completed_revision) === data.revision,
      completionStatus,
    });
  } catch (error) { return failure(error); }
}
// No DELETE handler: permanent deletion is not an approved preview operation.
