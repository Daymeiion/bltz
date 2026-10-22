import "server-only";
import { requireInternalAdmin } from "@/lib/rbac";
import { createServiceClient } from "@/lib/supabase/service";

/** player_id is server-managed; do not expand browser-role column grants. */
export async function readGtmPreviewCareerLinks(previewIds: string[]) {
  await requireInternalAdmin();
  const ids = [...new Set(previewIds)];
  const result = new Map<string, string | null>();
  if (!ids.length) return result;
  const service = createServiceClient();
  for (let offset = 0; offset < ids.length; offset += 100) {
    const response = await service.from("preview_lockers").select("id,player_id").in("id", ids.slice(offset, offset + 100));
    if (response.error) throw new Error(`gtm_preview_career_links_unavailable:${response.error.code ?? "unknown"}`);
    for (const row of response.data ?? []) result.set(row.id, row.player_id ?? null);
  }
  return result;
}
