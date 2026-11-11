"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireInternalAdmin } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

const promotionSchema = z.object({
  gsisIds: z.array(z.string().trim().min(1).max(120)).min(1).max(100),
}).superRefine((value, context) => {
  if (new Set(value.gsisIds).size !== value.gsisIds.length) {
    context.addIssue({ code: "custom", message: "Choose each player once." });
  }
});

export type PromotePlayerProspectsResult =
  | { ok: true; createdCount: number; existingCount: number; contactIds: string[] }
  | { ok: false; code: "invalid" | "unauthorized" | "unavailable" | "failed"; message: string };

export async function promotePlayerMasterProspects(input: unknown): Promise<PromotePlayerProspectsResult> {
  const parsed = promotionSchema.safeParse(input);
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
  const gtm = supabase as unknown as SupabaseClient;
  const { data, error } = await gtm.rpc("promote_player_master_prospects", {
    p_gsis_ids: parsed.data.gsisIds,
  });

  if (error || !data || typeof data !== "object" || Array.isArray(data)) {
    const unavailable = error?.code === "42883" || error?.code === "PGRST202";
    return {
      ok: false,
      code: unavailable ? "unavailable" : "failed",
      message: unavailable
        ? "Player prospect promotion is not available until the database migration is applied."
        : error?.code === "22023"
          ? "One or more selected players changed. Refresh the list and try again."
          : "The selected players could not be added to GTM. No partial batch was kept.",
    };
  }

  const result = data as Record<string, unknown>;
  revalidatePath("/admin/gtm");
  revalidatePath("/admin/gtm/contacts");
  revalidatePath("/admin/gtm/players");

  return {
    ok: true,
    createdCount: Number(result.created_count ?? 0),
    existingCount: Number(result.existing_count ?? 0),
    contactIds: Array.isArray(result.contact_ids) ? result.contact_ids.map(String) : [],
  };
}
