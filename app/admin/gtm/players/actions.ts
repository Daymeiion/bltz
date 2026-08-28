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

export type PromotePlayerProspectsResult =
  | { ok: true; createdCount: number; existingCount: number; linkedPlayerCount: number }
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

export async function promotePlayerMasterProspects(input: unknown): Promise<PromotePlayerProspectsResult> {
  const parsed = selectionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "invalid", message: parsed.error.issues[0]?.message ?? "Choose valid selected prospects." };
  }

  try {
    await requireInternalAdmin();
  } catch {
    return { ok: false, code: "unauthorized", message: "Your administrator access could not be verified." };
  }

  const supabase = await createClient();
  const gtm = supabase as unknown as SupabaseClient;
  const { data, error } = await gtm.rpc("promote_gtm_player_prospects", { p_gsis_ids: parsed.data.gsisIds });
  if (error || !data || typeof data !== "object" || Array.isArray(data)) {
    const unavailable = error?.code === "42883" || error?.code === "PGRST202";
    const invalid = error?.code === "22023" || error?.code === "23514";
    return {
      ok: false,
      code: unavailable ? "unavailable" : invalid ? "invalid" : "failed",
      message: unavailable
        ? "Player-to-contact promotion is not available until the approved migration is deployed."
        : invalid
          ? "Only active prospects in the selected cohort can be added to Contacts. Refresh and try again."
          : "The selected prospects could not be added to Contacts. No Player identities were copied.",
    };
  }

  const result = data as Record<string, unknown>;
  revalidatePath("/admin/gtm");
  revalidatePath("/admin/gtm/contacts");
  revalidatePath("/admin/gtm/players");
  return {
    ok: true,
    createdCount: Number(result.createdCount ?? 0),
    existingCount: Number(result.existingCount ?? 0),
    linkedPlayerCount: Number(result.linkedPlayerCount ?? 0),
  };
}
