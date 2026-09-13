import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { failure, json, previewAdmin, PreviewError, readBody } from "@/lib/preview-lockers/server";

export const runtime = "nodejs";

const completionRequest = z.object({ revision: z.number().int().positive() }).strict();

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { client } = await previewAdmin();
    const { id } = await params;
    if (!z.uuid().safeParse(id).success) throw new PreviewError("invalid_input", 400);
    const parsed = completionRequest.safeParse(await readBody(req));
    if (!parsed.success) throw new PreviewError("invalid_input", 400);
    const { data, error } = await (client as unknown as SupabaseClient).rpc("complete_gtm_player_preview", {
      p_preview_locker_id: id,
      p_revision: parsed.data.revision,
    });
    if (error?.code === "22023" || error?.code === "P0002") throw new PreviewError("invalid_input", 400);
    if (error?.code === "42883" || error?.code === "PGRST202") throw new PreviewError("preview_unavailable", 503);
    if (error) throw new PreviewError("could_not_complete", 503);
    if (data === "revision_conflict") throw new PreviewError("preview_conflict", 409);
    if (data === "not_linked") throw new PreviewError("preview_not_linked", 400);
    if (data !== "completed" && data !== "unchanged") throw new PreviewError("could_not_complete", 503);
    return json({ complete: true, revision: parsed.data.revision, unchanged: data === "unchanged" });
  } catch (error) {
    return failure(error);
  }
}
