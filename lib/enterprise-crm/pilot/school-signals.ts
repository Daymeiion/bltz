import "server-only";

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { SCHOOL_SIGNAL_KINDS, type SchoolSignal, type SchoolSignalInput } from "./school-signals-shared";

export * from "./school-signals-shared";

const COLUMNS = "id,player_id,title,kind,target_date,recurrence,why,sources,origin,created_at";
const row = z.object({
  id: z.string(), player_id: z.string().nullable(), title: z.string(), kind: z.enum(SCHOOL_SIGNAL_KINDS),
  target_date: z.string(), recurrence: z.enum(["yearly", "once"]), why: z.string().nullable(),
  sources: z.array(z.object({ label: z.string(), url: z.string().nullable() })).catch([]),
  origin: z.enum(["ai", "manual"]), created_at: z.string(),
});

function toSignal(value: z.infer<typeof row>): SchoolSignal {
  return {
    id: value.id, playerId: value.player_id, title: value.title, kind: value.kind, targetDate: value.target_date,
    recurrence: value.recurrence, why: value.why, sources: value.sources, origin: value.origin, createdAt: value.created_at,
  };
}

/** The school's active signals, optionally for one player. Caller must authorize. */
export async function listSchoolSignals(organizationId: string, playerId?: string): Promise<{ state: "ready" | "unavailable"; signals: SchoolSignal[] }> {
  try {
    let query = createServiceClient().from("organization_signals").select(COLUMNS).eq("organization_id", organizationId).eq("status", "active");
    if (playerId) query = query.eq("player_id", playerId);
    const { data, error } = await query.order("target_date").limit(300);
    const parsed = z.array(row).safeParse(data);
    return error || !parsed.success ? { state: "unavailable", signals: [] } : { state: "ready", signals: parsed.data.map(toSignal) };
  } catch {
    return { state: "unavailable", signals: [] };
  }
}

export async function createSchoolSignal(organizationId: string, actorUserId: string, input: SchoolSignalInput): Promise<SchoolSignal> {
  const { data, error } = await createServiceClient().from("organization_signals").insert({
    organization_id: organizationId, player_id: input.playerId, title: input.title, kind: input.kind, target_date: input.targetDate,
    recurrence: input.recurrence, why: input.why || null, sources: input.sources, request: input.request || null,
    origin: input.origin, created_by: actorUserId,
  }).select(COLUMNS).single();
  if (error) throw new Error("signal_create_failed");
  return toSignal(row.parse(data));
}

/** Archived signals leave the workspace but stay on record for BLTZ. */
export async function archiveSchoolSignal(organizationId: string, signalId: string): Promise<boolean> {
  const { data, error } = await createServiceClient().from("organization_signals")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", signalId).eq("organization_id", organizationId).select("id");
  return !error && Array.isArray(data) && data.length === 1;
}

export type AdminSchoolSignal = SchoolSignal & { organizationId: string; status: "active" | "archived"; request: string | null };

/** Every school-added signal, newest first, for BLTZ admins. Caller must be an internal admin. */
export async function listAllSchoolSignals(limit = 200): Promise<{ state: "ready" | "unavailable"; signals: AdminSchoolSignal[] }> {
  try {
    const { data, error } = await createServiceClient().from("organization_signals")
      .select(`${COLUMNS},organization_id,status,request`).order("created_at", { ascending: false }).limit(limit);
    const parsed = z.array(row.extend({ organization_id: z.string(), status: z.enum(["active", "archived"]), request: z.string().nullable() })).safeParse(data);
    if (error || !parsed.success) return { state: "unavailable", signals: [] };
    return { state: "ready", signals: parsed.data.map((value) => ({ ...toSignal(value), organizationId: value.organization_id, status: value.status, request: value.request })) };
  } catch {
    return { state: "unavailable", signals: [] };
  }
}
