"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { openPlayerMasterPreview, selectPlayerMasterProspects } from "@/app/admin/gtm/players/actions";
import { PREVIEW_COLUMNS, previewAdmin } from "@/lib/preview-lockers/server";
import { previewContent, previewRecord, type PreviewContent } from "@/lib/preview-lockers/validation";
import { parseBatchLines, type BatchCandidate, type BatchMatch } from "@/lib/preview-lockers/batch";

export type BatchPreview = { gsisId: string; id: string; slug: string; revision: number; content: PreviewContent };
type Failure = { ok: false; message: string };

async function admin() {
  try { return (await previewAdmin()).client as unknown as SupabaseClient; }
  catch { return null; }
}
const escapeLike = (value: string) => value.replace(/[\\%_]/g, "\\$&");

/** Looks each pasted name up in the Player Master list. Read-only. */
export async function matchBatchNames(text: unknown): Promise<{ ok: true; matches: BatchMatch[] } | Failure> {
  const lines = parseBatchLines(typeof text === "string" ? text : "");
  if (!lines.length) return { ok: false, message: "Paste at least one player name." };
  if (lines.length > 100) return { ok: false, message: "Paste up to 100 players at a time." };
  const client = await admin();
  if (!client) return { ok: false, message: "Your administrator access could not be verified." };
  const matches: BatchMatch[] = [];
  const lookup = async (name: string, college: string | null) => {
    let query = client.from("nfl_players")
      .select("gsis_id,display_name,college_name,latest_team,position,last_season")
      .ilike("display_name", name);
    if (college) query = query.ilike("college_name", `%${escapeLike(college)}%`);
    const { data, error } = await query.order("last_season", { ascending: false, nullsFirst: false }).limit(6);
    return error ? null : ((data ?? []) as BatchCandidate[]).filter(row => /^\d{2}-\d{7}$/.test(row.gsis_id));
  };
  for (const line of lines) {
    // Exact name first; a contains-match only suggests candidates, it never auto-selects.
    const exact = await lookup(escapeLike(line.name), line.college);
    const candidates = exact?.length ? exact : await lookup(`%${escapeLike(line.name)}%`, line.college);
    if (!candidates) return { ok: false, message: "The Player Master list is unavailable. Nothing was changed." };
    matches.push({ ...line, candidates, gsisId: exact?.length === 1 ? exact[0].gsis_id : null });
  }
  return { ok: true, matches };
}

/** Adds the chosen players to the cohort, which also creates or links their GTM contacts. */
export async function addBatchToCohort(gsisIds: unknown): Promise<{ ok: true; reviewCount: number } | Failure> {
  const result = await selectPlayerMasterProspects({ gsisIds });
  return result.ok ? { ok: true, reviewCount: result.reviewCount } : { ok: false, message: result.message };
}

/** Creates (or reopens) the player's private preview and returns its saved snapshot for the build. */
export async function openBatchPreview(gsisId: unknown): Promise<{ ok: true; preview: BatchPreview; created: boolean } | Failure> {
  const opened = await openPlayerMasterPreview({ gsisId });
  if (!opened.ok) return { ok: false, message: opened.message };
  const client = await admin();
  if (!client) return { ok: false, message: "Your administrator access could not be verified." };
  const { data, error } = await client.from("preview_lockers").select(PREVIEW_COLUMNS).eq("id", opened.id).maybeSingle();
  const record = previewRecord.safeParse(data);
  if (error || !record.success) return { ok: false, message: "The preview was created but could not be loaded. Open it from the list to build it." };
  const content = previewContent.parse(Object.fromEntries(Object.keys(previewContent.shape).map(key => [key, record.data[key as keyof typeof record.data]])));
  return { ok: true, created: opened.created, preview: { gsisId: String(gsisId), id: record.data.id, slug: record.data.slug, revision: record.data.revision, content } };
}
