"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireInternalAdmin } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

const selectionSchema = z.object({
  gsisIds: z.array(z.string().trim().regex(/^\d{2}-\d{7}$/)).min(1).max(100),
}).superRefine((value, context) => {
  if (new Set(value.gsisIds).size !== value.gsisIds.length) {
    context.addIssue({ code: "custom", message: "Choose each player once." });
  }
});

const previewSchema = z.object({
  gsisId: z.string().trim().min(1).max(120).refine((value) => !/[\s\p{Cc}]/u.test(value), "Choose a valid Player Master prospect."),
});

export type SelectPlayerProspectsResult =
  | { ok: true; selectedCount: number; existingCount: number; linkedPlayerCount: number; reviewCount: number }
  | { ok: false; code: "invalid" | "unauthorized" | "unavailable" | "failed"; message: string };

export type PromotePlayerProspectsResult =
  | { ok: true; createdCount: number; existingCount: number; linkedPlayerCount: number }
  | { ok: false; code: "invalid" | "unauthorized" | "unavailable" | "failed"; message: string };

export type OpenPlayerPreviewResult =
  | { ok: true; id: string; slug: string; created: boolean; complete: boolean }
  | { ok: false; code: "invalid" | "unauthorized" | "unavailable" | "failed"; message: string };

export async function openPlayerMasterPreview(input: unknown): Promise<OpenPlayerPreviewResult> {
  const parsed = previewSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "invalid", message: parsed.error.issues[0]?.message ?? "Choose a valid Player Master prospect." };
  }

  try {
    await requireInternalAdmin();
  } catch {
    return { ok: false, code: "unauthorized", message: "Your administrator access could not be verified." };
  }

  const supabase = await createClient();
  const gtm = supabase as unknown as SupabaseClient;
  const { data, error } = await gtm.rpc("open_or_create_gtm_player_preview", { p_gsis_id: parsed.data.gsisId });
  if (error || !data || typeof data !== "object" || Array.isArray(data)) {
    const unavailable = error?.code === "42883" || error?.code === "PGRST202";
    const invalid = error?.code === "22023" || error?.code === "23503" || error?.code === "23514";
    return {
      ok: false,
      code: unavailable ? "unavailable" : invalid ? "invalid" : "failed",
      message: unavailable
        ? "Preview creation is not available until the approved migration is deployed."
        : invalid
          ? "Only active prospects in the selected cohort can create a preview. Refresh and try again."
          : "The private preview could not be created or reopened. No canonical Player or claim was created.",
    };
  }

  const result = data as Record<string, unknown>;
  const id = z.uuid().safeParse(result.id);
  const slug = z.string().min(1).max(80).safeParse(result.slug);
  if (!id.success || !slug.success) {
    return { ok: false, code: "failed", message: "The saved preview link was invalid. Refresh and try again." };
  }
  revalidatePath("/admin/gtm/players");
  revalidatePath("/admin/preview-lockers");
  return {
    ok: true,
    id: id.data,
    slug: slug.data,
    created: result.created === true,
    complete: result.complete === true,
  };
}

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
  const gtm = supabase as unknown as SupabaseClient;
  try {
    const { data, error } = await gtm.rpc("connect_gtm_player_cohort", { p_gsis_ids: parsed.data.gsisIds });
    if (error || !data || typeof data !== "object" || Array.isArray(data)) {
      const unavailable = error?.code === "42883" || error?.code === "PGRST202";
      return { ok: false, code: unavailable ? "unavailable" : "failed", message: unavailable
        ? "Automatic cohort connections are unavailable until the migration is deployed."
        : "The cohort connection could not be completed or confirmed. Refresh or retry; existing records will be reused." };
    }
    const result = data as Record<string, unknown>;
    for (const path of ["/admin/gtm", "/admin/gtm/players", "/admin/gtm/contacts", "/admin/gtm/funnel", "/admin/preview-lockers", "/admin/intelligence"]) revalidatePath(path);
    return { ok: true, selectedCount: Number(result.selectedCount ?? 0), existingCount: Number(result.existingCount ?? 0),
      linkedPlayerCount: Number(result.linkedPlayerCount ?? 0), reviewCount: Array.isArray(result.reviewRequired) ? result.reviewRequired.length : 0 };
  } catch {
    return { ok: false, code: "failed", message: "The connection result could not be confirmed. Refresh or retry; existing records will be reused." };
  }
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
