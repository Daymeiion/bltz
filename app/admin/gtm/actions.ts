"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireInternalAdmin } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

const addNoteSchema = z.object({
  contactId: z.string().uuid(),
  noteType: z.enum(["general", "call", "meeting", "linkedin", "email", "introduction", "research", "personal_context", "opportunity"]),
  body: z.string().trim().min(1).max(5000),
});

const logInteractionSchema = z.object({
  contactId: z.string().uuid(),
  interactionType: z.enum(["linkedin", "email", "phone", "video_call", "meeting", "event", "introduction", "other"]),
  direction: z.enum(["inbound", "outbound", "mutual"]),
  interactionAt: z.string().datetime({ offset: true }),
  subject: z.string().trim().max(200).nullable(),
  summary: z.string().trim().max(5000).nullable(),
  nextAction: z.string().trim().max(500).nullable(),
  nextActionAt: z.string().datetime({ offset: true }).nullable(),
});

export type GtmMutationResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: "invalid" | "unauthorized" | "unavailable" | "failed"; message: string };

async function getAuthorizedClient() {
  await requireInternalAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("unauthorized");
  return { supabase, userId: data.user.id };
}

function refreshGtmPaths() {
  revalidatePath("/admin/gtm");
  revalidatePath("/admin/gtm/contacts");
}

export async function addGtmNote(input: unknown): Promise<GtmMutationResult<{ id: string; noteType: string; body: string; createdAt: string }>> {
  const parsed = addNoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid", message: "Choose a note type and enter a note." };

  let authorization;
  try {
    authorization = await getAuthorizedClient();
  } catch {
    return { ok: false, code: "unauthorized", message: "Your administrator access could not be verified." };
  }

  const { data, error } = await authorization.supabase.from("gtm_notes").insert({
    contact_id: parsed.data.contactId,
    note_type: parsed.data.noteType,
    body: parsed.data.body,
    created_by: authorization.userId,
  }).select("id,note_type,body,created_at").single();

  if (error) {
    const unavailable = error.code === "42P01" || error.code === "PGRST205";
    return { ok: false, code: unavailable ? "unavailable" : "failed", message: unavailable ? "Notes are not available until the GTM database migration is deployed." : "The note could not be saved. Try again." };
  }

  refreshGtmPaths();
  return { ok: true, value: { id: data.id as string, noteType: data.note_type as string, body: data.body as string, createdAt: data.created_at as string } };
}

export async function logGtmInteraction(input: unknown): Promise<GtmMutationResult<{ id: string; interactionAt: string }>> {
  const parsed = logInteractionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid", message: "Complete the required interaction fields." };

  let authorization;
  try {
    authorization = await getAuthorizedClient();
  } catch {
    return { ok: false, code: "unauthorized", message: "Your administrator access could not be verified." };
  }

  const { data, error } = await authorization.supabase.rpc("log_gtm_interaction", {
    p_contact_id: parsed.data.contactId,
    p_interaction_type: parsed.data.interactionType,
    p_direction: parsed.data.direction,
    p_interaction_at: parsed.data.interactionAt,
    p_subject: parsed.data.subject || null,
    p_summary: parsed.data.summary || null,
    p_organization_id: null,
    p_opportunity_id: null,
    p_next_action: parsed.data.nextAction || null,
    p_next_action_at: parsed.data.nextActionAt || null,
  });

  if (error || !data) {
    const unavailable = error?.code === "42883" || error?.code === "PGRST202";
    return { ok: false, code: unavailable ? "unavailable" : "failed", message: unavailable ? "Interaction logging is not available until the atomic GTM database function is deployed." : "The interaction could not be saved. Try again." };
  }

  const row = Array.isArray(data) ? data[0] : data;
  refreshGtmPaths();
  return { ok: true, value: { id: String(row.id), interactionAt: String(row.interaction_at) } };
}
