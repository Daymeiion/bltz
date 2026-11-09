import "server-only";

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import type { Dismissal, DismissalInput } from "./dismissals-shared";

export * from "./dismissals-shared";

const COLUMNS = "id,player_id,target_type,target_key,scope,label,reason,created_at";
const row = z.object({
  id: z.string(), player_id: z.string().nullable(), target_type: z.enum(["signal", "moment"]), target_key: z.string(),
  scope: z.enum(["this_year", "always"]), label: z.string().nullable(), reason: z.string().nullable(), created_at: z.string(),
});
const toDismissal = (value: z.infer<typeof row>): Dismissal => ({
  id: value.id, playerId: value.player_id, targetType: value.target_type, targetKey: value.target_key, scope: value.scope,
  label: value.label, reason: value.reason, createdAt: value.created_at,
});

/** Active dismissals for the school, optionally one player. Caller must authorize. */
export async function listDismissals(organizationId: string, playerId?: string): Promise<Dismissal[]> {
  try {
    let query = createServiceClient().from("organization_dismissals").select(COLUMNS).eq("organization_id", organizationId).is("restored_at", null);
    if (playerId) query = query.eq("player_id", playerId);
    const { data, error } = await query.order("created_at", { ascending: false }).limit(500);
    const parsed = z.array(row).safeParse(data);
    return error || !parsed.success ? [] : parsed.data.map(toDismissal);
  } catch {
    return [];
  }
}

export async function createDismissal(organizationId: string, actorUserId: string, input: DismissalInput): Promise<Dismissal> {
  const { data, error } = await createServiceClient().from("organization_dismissals").insert({
    organization_id: organizationId, player_id: input.playerId, target_type: input.targetType, target_key: input.targetKey,
    scope: input.targetType === "moment" ? "always" : input.scope, label: input.label || null, reason: input.reason || null, dismissed_by: actorUserId,
  }).select(COLUMNS).single();
  if (error) throw new Error("dismissal_create_failed");
  return toDismissal(row.parse(data));
}

export async function restoreDismissal(organizationId: string, dismissalId: string): Promise<boolean> {
  const { data, error } = await createServiceClient().from("organization_dismissals").update({ restored_at: new Date().toISOString() })
    .eq("id", dismissalId).eq("organization_id", organizationId).is("restored_at", null).select("id");
  return !error && Array.isArray(data) && data.length === 1;
}

export type AdminDismissal = Dismissal & { organizationId: string };

/** Every active dismissal, newest first, for BLTZ admins. Caller must be an internal admin. */
export async function listAllDismissals(limit = 200): Promise<{ state: "ready" | "unavailable"; dismissals: AdminDismissal[] }> {
  try {
    const { data, error } = await createServiceClient().from("organization_dismissals").select(`${COLUMNS},organization_id`)
      .is("restored_at", null).order("created_at", { ascending: false }).limit(limit);
    const parsed = z.array(row.extend({ organization_id: z.string() })).safeParse(data);
    if (error || !parsed.success) return { state: "unavailable", dismissals: [] };
    return { state: "ready", dismissals: parsed.data.map((value) => ({ ...toDismissal(value), organizationId: value.organization_id })) };
  } catch {
    return { state: "unavailable", dismissals: [] };
  }
}
