import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cohort (GTM-linked) previews that still need review: their current saved
 * revision has not been marked complete. Previews outside the cohort never
 * show as needing review. Call only after previewAdmin().
 */
export async function readNeedsReview(client: SupabaseClient, rows: { id: string; revision: number }[]): Promise<Set<string>> {
  const revisions = new Map(rows.map(row => [row.id, row.revision]));
  const pending = new Set<string>();
  const ids = [...revisions.keys()];
  for (let start = 0; start < ids.length; start += 200) {
    const { data, error } = await client.from("gtm_player_preview_lockers")
      .select("preview_locker_id,completed_revision").in("preview_locker_id", ids.slice(start, start + 200));
    // An unavailable relationship hides the marker rather than inventing review work.
    if (error) return new Set();
    for (const link of (data ?? []) as { preview_locker_id: string; completed_revision: number | null }[]) {
      if (link.completed_revision === null || Number(link.completed_revision) !== revisions.get(link.preview_locker_id)) pending.add(link.preview_locker_id);
    }
  }
  return pending;
}
