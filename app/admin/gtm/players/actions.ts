"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireInternalAdmin } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

const selectionSchema = z.object({
  gsisIds: z.array(z.string().trim().min(1).max(120)).min(1).max(100),
}).superRefine((value, context) => {
  if (new Set(value.gsisIds).size !== value.gsisIds.length) {
    context.addIssue({ code: "custom", message: "Choose each player once." });
  }
});

export type SelectPlayerProspectsResult =
  | { ok: true; selectedCount: number; existingCount: number }
  | { ok: false; code: "invalid" | "unauthorized" | "unavailable" | "failed"; message: string };

export async function selectPlayerMasterProspects(input: unknown): Promise<SelectPlayerProspectsResult> {
  const parsed = selectionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid",
      message: parsed.error.issues[0]?.message ?? "Choose valid Player Master prospects.",
    };
  }

  try {
    await requireInternalAdmin();
  } catch {
    return { ok: false, code: "unauthorized", message: "Your administrator access could not be verified." };
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { ok: false, code: "unauthorized", message: "Your administrator session has expired." };
  }

  const gsisIds = parsed.data.gsisIds;
  const gtm = supabase as unknown as SupabaseClient;
  const [{ data: players, error: playersError }, { data: existing, error: existingError }] = await Promise.all([
    supabase.from("nfl_players").select("gsis_id").in("gsis_id", gsisIds),
    gtm.from("gtm_player_prospects").select("gsis_id").in("gsis_id", gsisIds),
  ]);

  if (existingError?.code === "42P01" || existingError?.code === "PGRST205") {
    return { ok: false, code: "unavailable", message: "Player prospect selection is not available until the reference migration is applied." };
  }
  if (playersError || existingError) {
    return { ok: false, code: "failed", message: "The selected players could not be verified. Refresh and try again." };
  }

  const availableIds = new Set((players ?? []).map((player) => player.gsis_id));
  if (availableIds.size !== gsisIds.length) {
    return { ok: false, code: "invalid", message: "One or more selected Player Master rows changed. Refresh and try again." };
  }

  const existingIds = new Set((existing ?? []).map((prospect) => prospect.gsis_id));
  const newIds = gsisIds.filter((gsisId) => !existingIds.has(gsisId));
  if (newIds.length > 0) {
    const { error: insertError } = await gtm.from("gtm_player_prospects").upsert(
      newIds.map((gsisId) => ({ gsis_id: gsisId, selected_by: userData.user.id })),
      { onConflict: "gsis_id", ignoreDuplicates: true },
    );
    if (insertError) {
      return { ok: false, code: "failed", message: "The Player prospect cohort could not be saved. No Player identities were copied." };
    }
  }

  revalidatePath("/admin/gtm/players");
  return { ok: true, selectedCount: newIds.length, existingCount: existingIds.size };
}
