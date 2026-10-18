import type { SupabaseClient } from "@supabase/supabase-js";
import type { AwardImageDatabase } from "@/types/award-images.generated";
import { previewAdmin, readBody, json, failure, PreviewError } from "@/lib/preview-lockers/server";
import { approveImageMatches } from "@/lib/award-images/matches";

export async function POST(req: Request) {
  try {
    const { client } = await previewAdmin();
    const parsed = approveImageMatches.safeParse(await readBody(req, 65536));
    if (!parsed.success) throw new PreviewError("invalid_matches", 400);
    const result = await (client as SupabaseClient<AwardImageDatabase>).rpc("approve_award_image_matches", { p_matches: parsed.data.matches });
    if (result.error) {
      const code = result.error.code;
      throw new PreviewError(code === "PT409" ? "award_matches_changed" : code === "42501" ? "forbidden" : code.startsWith("22") ? "invalid_matches" : "award_matches_not_saved", code === "PT409" ? 409 : code === "42501" ? 403 : code.startsWith("22") ? 400 : 503);
    }
    return json(result.data);
  } catch (error) { return failure(error); }
}
