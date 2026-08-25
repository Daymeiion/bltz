"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  parseGtmCsv,
} from "@/lib/gtm/import";
import { GTM_CSV_MAX_BYTES, GTM_IMPORT_FIELDS, type GtmFieldMapping, type NormalizedGtmImportRow } from "@/lib/gtm/import-contract";
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

const createContactSchema = z.object({
  displayName: z.string().trim().min(1).max(240),
  firstName: z.string().trim().max(120).nullable(),
  lastName: z.string().trim().max(120).nullable(),
  email: z.string().trim().email().max(320).nullable(),
  linkedinUrl: z.string().trim().url().max(500).refine((value) => /(^|\.)linkedin\.com$/i.test(new URL(value).hostname), "Use a LinkedIn URL.").nullable(),
  currentCompany: z.string().trim().max(200).nullable(),
  currentTitle: z.string().trim().max(200).nullable(),
  contactType: z.enum(["enterprise", "athlete", "multiplier", "unclassified"]),
  sport: z.string().trim().max(80).nullable(),
  leagueLevel: z.string().trim().max(80).nullable(),
  doNotAutomate: z.boolean(),
  playerId: z.string().uuid().nullable(),
}).refine((value) => !value.playerId || value.contactType === "athlete", {
  message: "A canonical Player can only be linked to an athlete contact.",
});

export interface GtmPlayerOption {
  id: string;
  name: string;
  team: string | null;
  position: string | null;
  level: string | null;
}

export interface GtmCsvPreview {
  filename: string;
  idempotencyKey: string;
  headers: string[];
  mapping: GtmFieldMapping;
  counts: { found: number; create: number; update: number; duplicate: number; invalid: number };
  sample: Array<Pick<NormalizedGtmImportRow, "rowNumber" | "displayName" | "email" | "currentCompany" | "contactType"> & { outcome: "create" | "update" | "skip" }>;
  issues: Array<{ rowNumber: number; message: string }>;
}

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

function parseMapping(value: FormDataEntryValue | null): GtmFieldMapping {
  if (typeof value !== "string" || !value) return {};
  const candidate = JSON.parse(value) as Record<string, unknown>;
  return Object.fromEntries(
    GTM_IMPORT_FIELDS.flatMap((field) => typeof candidate[field] === "string" && candidate[field]
      ? [[field, candidate[field] as string]]
      : []),
  ) as GtmFieldMapping;
}

async function readCsv(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".csv")) throw new Error("Choose a CSV file.");
  if (file.size > GTM_CSV_MAX_BYTES) throw new Error("CSV files must be smaller than 750 KB.");
  return { file, parsed: parseGtmCsv(Buffer.from(await file.arrayBuffer()), parseMapping(formData.get("mapping"))) };
}

async function analyzeExisting(gtm: SupabaseClient, rows: NormalizedGtmImportRow[]) {
  const sourceIds = new Set<string>();
  const identityIds = new Set<string>();
  for (let offset = 0; offset < rows.length; offset += 100) {
    const batch = rows.slice(offset, offset + 100);
    const [sourceResult, linkedinResult, emailResult] = await Promise.all([
      gtm.from("gtm_contacts").select("source_record_id").eq("source", "contacts_csv").in("source_record_id", batch.map((row) => row.sourceRecordId)),
      gtm.from("gtm_contacts").select("linkedin_url").in("linkedin_url", batch.map((row) => row.linkedinUrl).filter(Boolean)),
      gtm.from("gtm_contacts").select("email").in("email", batch.map((row) => row.email).filter(Boolean)),
    ]);
    if (sourceResult.error || linkedinResult.error || emailResult.error) throw sourceResult.error ?? linkedinResult.error ?? emailResult.error;
    for (const item of sourceResult.data ?? []) if (item.source_record_id) sourceIds.add(String(item.source_record_id));
    for (const item of linkedinResult.data ?? []) if (item.linkedin_url) identityIds.add(String(item.linkedin_url).toLowerCase());
    for (const item of emailResult.data ?? []) if (item.email) identityIds.add(String(item.email).toLowerCase());
  }
  return { sourceIds, identityIds };
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

export async function searchGtmPlayers(query: string): Promise<GtmMutationResult<GtmPlayerOption[]>> {
  const safeQuery = query.trim().replace(/[,%()]/g, "").slice(0, 80);
  if (safeQuery.length < 2) return { ok: true, value: [] };
  let authorization;
  try { authorization = await getAuthorizedClient(); }
  catch { return { ok: false, code: "unauthorized", message: "Your administrator access could not be verified." }; }

  const { data, error } = await authorization.supabase
    .from("players")
    .select("id,name,full_name,display_name,team,position,level")
    .or(`name.ilike.%${safeQuery}%,full_name.ilike.%${safeQuery}%,display_name.ilike.%${safeQuery}%`)
    .order("name")
    .limit(8);
  if (error) return { ok: false, code: "failed", message: "Player search is temporarily unavailable." };
  return { ok: true, value: (data ?? []).map((player) => ({
    id: player.id,
    name: player.display_name || player.full_name || player.name,
    team: player.team,
    position: player.position,
    level: player.level,
  })) };
}

export async function createGtmContact(input: unknown): Promise<GtmMutationResult<{ id: string }>> {
  const parsed = createContactSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid", message: parsed.error.issues[0]?.message ?? "Review the contact details." };
  let authorization;
  try { authorization = await getAuthorizedClient(); }
  catch { return { ok: false, code: "unauthorized", message: "Your administrator access could not be verified." }; }

  const gtm = authorization.supabase as unknown as SupabaseClient;
  const value = parsed.data;
  const { data, error } = await gtm.rpc("create_gtm_contact", {
    p_display_name: value.displayName,
    p_first_name: value.firstName,
    p_last_name: value.lastName,
    p_email: value.email?.toLowerCase() ?? null,
    p_linkedin_url: value.linkedinUrl?.toLowerCase() ?? null,
    p_current_company: value.currentCompany,
    p_current_title: value.currentTitle,
    p_contact_type: value.contactType,
    p_sport: value.sport,
    p_league_level: value.leagueLevel,
    p_do_not_automate: value.doNotAutomate,
    p_player_id: value.playerId,
  });
  if (error || !data) {
    const unavailable = error?.code === "42883" || error?.code === "PGRST202";
    const duplicate = error?.code === "23505";
    return { ok: false, code: unavailable ? "unavailable" : "failed", message: unavailable
      ? "Contact intake is not available until the GTM intake migration is deployed."
      : duplicate ? "A contact with that LinkedIn URL or source identity already exists." : "The contact could not be created. Try again." };
  }
  refreshGtmPaths();
  const row = Array.isArray(data) ? data[0] : data;
  return { ok: true, value: { id: String(row.id) } };
}

export async function previewGtmCsv(formData: FormData): Promise<GtmMutationResult<GtmCsvPreview>> {
  let authorization;
  try { authorization = await getAuthorizedClient(); }
  catch { return { ok: false, code: "unauthorized", message: "Your administrator access could not be verified." }; }
  try {
    const { file, parsed } = await readCsv(formData);
    const gtm = authorization.supabase as unknown as SupabaseClient;
    const existing = await analyzeExisting(gtm, parsed.rows);
    let create = 0;
    let update = 0;
    let collision = 0;
    const outcomes = new Map<string, "create" | "update" | "skip">();
    for (const row of parsed.rows) {
      if (existing.sourceIds.has(row.sourceRecordId)) { update += 1; outcomes.set(row.sourceRecordId, "update"); }
      else if ((row.linkedinUrl && existing.identityIds.has(row.linkedinUrl)) || (row.email && existing.identityIds.has(row.email))) { collision += 1; outcomes.set(row.sourceRecordId, "skip"); }
      else { create += 1; outcomes.set(row.sourceRecordId, "create"); }
    }
    return { ok: true, value: {
      filename: file.name,
      idempotencyKey: crypto.randomUUID(),
      headers: parsed.headers,
      mapping: { ...parsed.suggestedMapping, ...parseMapping(formData.get("mapping")) },
      counts: { found: parsed.rows.length + parsed.issues.length + parsed.duplicateCount, create, update, duplicate: parsed.duplicateCount + collision, invalid: parsed.issues.length },
      sample: parsed.rows.slice(0, 8).map((row) => ({ rowNumber: row.rowNumber, displayName: row.displayName, email: row.email, currentCompany: row.currentCompany, contactType: row.contactType, outcome: outcomes.get(row.sourceRecordId) ?? "create" })),
      issues: parsed.issues.slice(0, 20),
    } };
  } catch (error) {
    const unavailable = error && typeof error === "object" && "code" in error && (["42P01", "PGRST205"] as unknown[]).includes(error.code);
    return { ok: false, code: unavailable ? "unavailable" : "invalid", message: unavailable ? "CSV imports are not available until the GTM database migration is deployed." : error instanceof Error ? error.message : "The CSV could not be read." };
  }
}

export async function commitGtmCsv(formData: FormData): Promise<GtmMutationResult<{ jobId: string; created: number; updated: number; skipped: number; failed: number }>> {
  let authorization;
  try { authorization = await getAuthorizedClient(); }
  catch { return { ok: false, code: "unauthorized", message: "Your administrator access could not be verified." }; }
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");
  if (!z.string().uuid().safeParse(idempotencyKey).success) return { ok: false, code: "invalid", message: "Preview the CSV again before importing." };
  try {
    const { file, parsed } = await readCsv(formData);
    const gtm = authorization.supabase as unknown as SupabaseClient;
    const existing = await analyzeExisting(gtm, parsed.rows);
    const accepted = parsed.rows.filter((row) => existing.sourceIds.has(row.sourceRecordId)
      || !((row.linkedinUrl && existing.identityIds.has(row.linkedinUrl)) || (row.email && existing.identityIds.has(row.email))));
    const collisionCount = parsed.rows.length - accepted.length;
    const mapping = { ...parsed.suggestedMapping, ...parseMapping(formData.get("mapping")) };
    const previewSummary = { valid: accepted.length, invalid: parsed.issues.length, duplicates: parsed.duplicateCount + collisionCount };
    const { data, error } = await gtm.rpc("import_gtm_contacts", {
      p_filename: file.name,
      p_content_sha256: parsed.contentSha256,
      p_idempotency_key: idempotencyKey,
      p_field_mapping: mapping,
      p_preview_summary: previewSummary,
      p_rows: accepted.map(({ rowNumber: _rowNumber, ...row }) => row),
      p_duplicate_count: parsed.duplicateCount + collisionCount,
      p_invalid_count: parsed.issues.length,
    });
    if (error || !data) {
      const unavailable = error?.code === "42883" || error?.code === "PGRST202";
      return { ok: false, code: unavailable ? "unavailable" : "failed", message: unavailable ? "CSV imports are not available until the GTM intake migration is deployed." : "The import could not be committed. No partial import was kept." };
    }
    const row = Array.isArray(data) ? data[0] : data;
    refreshGtmPaths();
    return { ok: true, value: { jobId: String(row.id), created: Number(row.rows_created), updated: Number(row.rows_updated), skipped: Number(row.rows_duplicated), failed: Number(row.rows_failed) } };
  } catch (error) {
    return { ok: false, code: "invalid", message: error instanceof Error ? error.message : "The CSV could not be imported." };
  }
}
