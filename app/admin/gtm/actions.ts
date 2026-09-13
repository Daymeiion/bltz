"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  parseGtmCsv,
} from "@/lib/gtm/import";
import {
  classifyGtmImportRow,
  type GtmClassificationResult,
} from "@/lib/gtm/classification";
import { GTM_CSV_MAX_BYTES, GTM_IMPORT_FIELDS, type GtmFieldMapping, type NormalizedGtmImportRow } from "@/lib/gtm/import-contract";
import { buildPlayerMatchReviewMap, type CanonicalPlayerCandidate, type PlayerMatchReview } from "@/lib/gtm/player-matching";
import {
  GTM_CONTACT_TYPES,
  GTM_CONVERSATION_OUTCOMES,
  GTM_PIPELINE_STAGES,
  GTM_INVESTOR_RELATIONSHIP_STAGES,
  GTM_INVESTOR_TYPES,
  GTM_POTENTIAL_ROLES,
  GTM_RELATIONSHIP_OBJECTIVES,
  GTM_RELATIONSHIP_PRIORITIES,
} from "@/lib/gtm/types";
import { requireInternalAdmin } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

const addNoteSchema = z.object({
  contactId: z.string().uuid(),
  noteType: z.enum(["general", "call", "meeting", "linkedin", "email", "introduction", "research", "personal_context", "opportunity", "discovery"]),
  body: z.string().trim().min(1).max(5000),
});

const editNoteSchema = addNoteSchema.extend({ noteId: z.string().uuid() });

const logInteractionSchema = z.object({
  contactId: z.string().uuid(),
  interactionType: z.enum(["linkedin", "email", "phone", "video_call", "meeting", "event", "introduction", "other"]),
  direction: z.enum(["inbound", "outbound", "mutual"]),
  interactionAt: z.string().datetime({ offset: true }),
  subject: z.string().trim().max(200).nullable(),
  summary: z.string().trim().max(5000).nullable(),
  nextAction: z.string().trim().max(500).nullable(),
  nextActionAt: z.string().datetime({ offset: true }).nullable(),
  outcomes: z.array(z.enum(GTM_CONVERSATION_OUTCOMES)).max(10)
    .refine((values) => new Set(values).size === values.length, "Choose each outcome once.")
    .default([]),
  nextTrigger: z.string().trim().max(2000).nullable().default(null),
  followUpRequired: z.boolean().default(false),
});

const nullableText = (maximum: number) => z.string().trim().max(maximum).nullable();
const nullableScore = z.number().int().min(0).max(5).nullable();

const editContactSchema = z.object({
  contactId: z.string().uuid(),
  displayName: z.string().trim().min(1).max(240),
  firstName: nullableText(120),
  lastName: nullableText(120),
  email: z.string().trim().email().max(320).nullable(),
  phone: nullableText(40),
  linkedinUrl: z.string().trim().url().max(500).refine((value) => /(^|\.)linkedin\.com$/i.test(new URL(value).hostname), "Use a LinkedIn URL.").nullable(),
  currentCompany: nullableText(200),
  currentTitle: nullableText(200),
  contactType: z.enum(GTM_CONTACT_TYPES),
  contactTypeOther: nullableText(240),
  potentialRoles: z.array(z.enum(GTM_POTENTIAL_ROLES)).max(20)
    .refine((values) => new Set(values).size === values.length, "Choose each potential role once.")
    .nullable(),
  relationshipObjective: z.enum(GTM_RELATIONSHIP_OBJECTIVES).nullable(),
  relationshipPriority: z.enum(GTM_RELATIONSHIP_PRIORITIES).nullable(),
  relationshipContext: nullableText(5000),
  segment: nullableText(120),
  sport: nullableText(80),
  leagueLevel: nullableText(80),
  geography: nullableText(160),
  relationshipStrength: nullableScore,
  bltzRelevance: nullableScore,
  buyingAuthority: nullableScore,
  networkLeverage: nullableScore,
  timingScore: nullableScore,
  doNotAutomate: z.boolean(),
  investorType: z.enum(GTM_INVESTOR_TYPES).nullable(),
  investorRelationshipStage: z.enum(GTM_INVESTOR_RELATIONSHIP_STAGES).nullable(),
  whatTheyNeedToSee: nullableText(10_000),
  investorThesisFeedback: nullableText(10_000),
  historicalSignal: nullableText(5000),
  futureTrigger: nullableText(2000),
  priorOutcome: nullableText(5000),
  relationshipSource: nullableText(1000),
}).superRefine((value, context) => {
  const scores = [value.relationshipStrength, value.bltzRelevance, value.buyingAuthority, value.networkLeverage, value.timingScore];
  if (value.contactType !== "enterprise" && scores.some((score) => score !== null)) {
    context.addIssue({ code: "custom", message: "Enterprise scoring factors require an enterprise contact." });
  }
  const investorFields = [value.investorType, value.investorRelationshipStage, value.whatTheyNeedToSee, value.investorThesisFeedback, value.historicalSignal, value.futureTrigger, value.priorOutcome, value.relationshipSource];
  if (value.contactType !== "investor" && investorFields.some((field) => field !== null)) {
    context.addIssue({ code: "custom", message: "Investor fields require an investor contact." });
  }
  if (value.contactType !== "other" && value.contactTypeOther !== null) {
    context.addIssue({ code: "custom", message: "Other contact clarification requires the Other contact type." });
  }
});

const nextActionSchema = z.object({
  contactId: z.string().uuid(),
  nextAction: nullableText(1000),
  nextActionAt: z.string().datetime({ offset: true }).nullable(),
  nextTrigger: nullableText(2000),
}).superRefine((value, context) => {
  if (value.nextActionAt && !value.nextAction) context.addIssue({ code: "custom", message: "Enter a next action before assigning a date." });
});

const relationshipIntelligenceSchema = z.object({
  contactId: z.string().uuid(),
  contactTypeOther: nullableText(240),
  potentialRoles: z.array(z.enum(GTM_POTENTIAL_ROLES)).max(20)
    .refine((values) => new Set(values).size === values.length, "Choose each potential role once.")
    .nullable(),
  relationshipObjective: z.enum(GTM_RELATIONSHIP_OBJECTIVES).nullable(),
  relationshipPriority: z.enum(GTM_RELATIONSHIP_PRIORITIES).nullable(),
  relationshipContext: nullableText(5000),
});

const discoverySchema = z.object({
  contactId: z.string().uuid(),
  interactionId: z.string().uuid().nullable(),
  problemDiscussed: nullableText(10_000),
  currentSolution: nullableText(10_000),
  painLevel: z.number().int().min(1).max(5).nullable(),
  primaryBltzUseCase: nullableText(5000),
  featureRequested: nullableText(10_000),
  wouldUse: z.boolean().nullable(),
  wouldPilot: z.boolean().nullable(),
  wouldPay: z.boolean().nullable(),
  expectedBuyer: nullableText(1000),
  expectedBudgetRange: nullableText(500),
  primaryObjection: nullableText(10_000),
  introductionOffered: z.boolean().nullable(),
  introductionTarget: nullableText(2000),
  additionalContext: nullableText(20_000),
}).superRefine((value, context) => {
  const findings = Object.entries(value).filter(([key]) => !["contactId", "interactionId"].includes(key)).map(([, item]) => item);
  if (findings.every((item) => item === null)) context.addIssue({ code: "custom", message: "Record at least one discovery finding." });
  if (value.introductionTarget && value.introductionOffered === false) context.addIssue({ code: "custom", message: "An introduction target requires an offered or unknown introduction status." });
});

const createContactSchema = z.object({
  displayName: z.string().trim().min(1).max(240),
  firstName: z.string().trim().max(120).nullable(),
  lastName: z.string().trim().max(120).nullable(),
  email: z.string().trim().email().max(320).nullable(),
  linkedinUrl: z.string().trim().url().max(500).refine((value) => /(^|\.)linkedin\.com$/i.test(new URL(value).hostname), "Use a LinkedIn URL.").nullable(),
  currentCompany: z.string().trim().max(200).nullable(),
  currentTitle: z.string().trim().max(200).nullable(),
  contactType: z.enum(GTM_CONTACT_TYPES),
  contactTypeOther: z.string().trim().max(240).nullable().default(null),
  potentialRoles: z.array(z.enum(GTM_POTENTIAL_ROLES)).max(20)
    .refine((values) => new Set(values).size === values.length, "Choose each potential role once.")
    .nullable().default(null),
  relationshipObjective: z.enum(GTM_RELATIONSHIP_OBJECTIVES).nullable().default(null),
  relationshipPriority: z.enum(GTM_RELATIONSHIP_PRIORITIES).nullable().default(null),
  relationshipContext: z.string().trim().max(5000).nullable().default(null),
  sport: z.string().trim().max(80).nullable(),
  leagueLevel: z.string().trim().max(80).nullable(),
  doNotAutomate: z.boolean(),
  playerId: z.string().uuid().nullable(),
  investorType: z.enum(GTM_INVESTOR_TYPES).nullable().default(null),
  investorRelationshipStage: z.enum(GTM_INVESTOR_RELATIONSHIP_STAGES).nullable().default(null),
  whatTheyNeedToSee: z.string().trim().max(10_000).nullable().default(null),
  investorThesisFeedback: z.string().trim().max(10_000).nullable().default(null),
  historicalSignal: z.string().trim().max(5000).nullable().default(null),
  futureTrigger: z.string().trim().max(2000).nullable().default(null),
  priorOutcome: z.string().trim().max(5000).nullable().default(null),
  relationshipSource: z.string().trim().max(1000).nullable().default(null),
  nextTrigger: z.string().trim().max(2000).nullable().default(null),
}).superRefine((value, context) => {
  if (value.playerId && value.contactType !== "athlete") {
    context.addIssue({ code: "custom", message: "A canonical Player can only be linked to an athlete contact." });
  }
  const investorFields = [
    value.investorType, value.investorRelationshipStage,
    value.whatTheyNeedToSee, value.investorThesisFeedback,
    value.historicalSignal, value.futureTrigger, value.priorOutcome,
    value.relationshipSource,
  ];
  if (value.contactType !== "investor" && investorFields.some((field) => field !== null)) {
    context.addIssue({ code: "custom", message: "Investor fields require an investor contact." });
  }
  if (value.contactType !== "other" && value.contactTypeOther !== null) {
    context.addIssue({ code: "custom", message: "Other contact clarification requires the Other contact type." });
  }
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
  counts: { found: number; newContacts: number; existingContacts: number; updates: number; duplicate: number; matchedPlayers: number; possiblePlayerMatches: number; automaticClassifications: number; needsReview: number; unclassified: number; invalid: number };
  sample: Array<Pick<NormalizedGtmImportRow, "rowNumber" | "displayName" | "email" | "currentCompany"> & { contactType: string; segment: string | null; classificationStatus: string; classificationConfidence: number; outcome: "create" | "update" | "skip"; playerMatchStatus: string | null }>;
  playerReviews: PlayerMatchReview[];
  issues: Array<{ rowNumber: number; message: string }>;
}

export interface GtmCsvInspection {
  filename: string;
  headers: string[];
  mapping: GtmFieldMapping;
  rowsFound: number;
  invalidRows: number;
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

function parsePlayerMatchDecisions(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value) return new Map<string, string | null>();
  const candidate = JSON.parse(value) as Record<string, unknown>;
  const decisions = new Map<string, string | null>();
  for (const [sourceRecordId, playerId] of Object.entries(candidate)) {
    if (!/^[a-f0-9]{64}$/.test(sourceRecordId)) continue;
    if (playerId === null) decisions.set(sourceRecordId, null);
    else if (typeof playerId === "string" && /^[A-Za-z0-9._-]{1,128}$/.test(playerId)) decisions.set(sourceRecordId, playerId);
  }
  return decisions;
}

async function readCsv(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".csv")) throw new Error("Choose a CSV file.");
  if (file.type && !["text/csv", "application/csv", "application/vnd.ms-excel"].includes(file.type)) throw new Error("Choose a CSV file.");
  if (file.size > GTM_CSV_MAX_BYTES) throw new Error("CSV files must be smaller than 2 MB.");
  return { file, parsed: parseGtmCsv(Buffer.from(await file.arrayBuffer()), parseMapping(formData.get("mapping"))) };
}

type ExistingIdentityIndex = {
  source: Map<string, Set<string>>;
  linkedin: Map<string, Set<string>>;
  email: Map<string, Set<string>>;
};

function addIdentity(index: Map<string, Set<string>>, key: unknown, id: unknown) {
  if (!key || !id) return;
  const normalized = String(key).trim().toLowerCase();
  const ids = index.get(normalized) ?? new Set<string>();
  ids.add(String(id));
  index.set(normalized, ids);
}

function existingOutcome(index: ExistingIdentityIndex, row: NormalizedGtmImportRow): "create" | "update" | "skip" {
  const signals = [
    index.linkedin.get(row.linkedinUrl.toLowerCase()),
    index.email.get(row.email.toLowerCase()),
    index.source.get(row.sourceRecordId.toLowerCase()),
  ].filter(Boolean) as Set<string>[];
  const ids = new Set(signals.flatMap((values) => [...values]));
  return ids.size === 0 ? "create" : ids.size === 1 ? "update" : "skip";
}

async function analyzeExisting(gtm: SupabaseClient, rows: NormalizedGtmImportRow[]) {
  const index: ExistingIdentityIndex = {
    source: new Map(),
    linkedin: new Map(),
    email: new Map(),
  };
  for (let offset = 0; offset < rows.length; offset += 100) {
    const batch = rows.slice(offset, offset + 100);
    const linkedinUrls = batch.map((row) => row.linkedinUrl).filter(Boolean);
    const emails = batch.map((row) => row.email).filter(Boolean);
    const [sourceResult, linkedinResult, emailResult] = await Promise.all([
      gtm.from("gtm_contacts").select("id,source_record_id").in("source", ["linkedin_connections", "contacts_csv"]).in("source_record_id", batch.map((row) => row.sourceRecordId)),
      linkedinUrls.length
        ? gtm.from("gtm_contacts").select("id,linkedin_url").eq("archived", false).in("linkedin_url", linkedinUrls)
        : Promise.resolve({ data: [], error: null }),
      emails.length
        ? gtm.from("gtm_contacts").select("id,email").eq("archived", false).in("email", emails)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (sourceResult.error || linkedinResult.error || emailResult.error) throw sourceResult.error ?? linkedinResult.error ?? emailResult.error;
    for (const item of sourceResult.data ?? []) addIdentity(index.source, item.source_record_id, item.id);
    for (const item of linkedinResult.data ?? []) addIdentity(index.linkedin, item.linkedin_url, item.id);
    for (const item of emailResult.data ?? []) addIdentity(index.email, item.email, item.id);
  }
  return index;
}

async function findPlayerMatchReviews(gtm: SupabaseClient, rows: NormalizedGtmImportRow[]) {
  const names = [...new Set(rows.map((row) => row.displayName).filter(Boolean))];
  const playersByGsis = new Map<string, CanonicalPlayerCandidate>();
  for (let offset = 0; offset < names.length; offset += 250) {
    const { data, error } = await gtm.rpc("get_gtm_player_match_candidates", {
      p_display_names: names.slice(offset, offset + 250),
    });
    if (error) throw error;
    for (const player of data ?? []) {
      playersByGsis.set(String(player.gsis_id), {
        gsisId: String(player.gsis_id),
        playerId: player.player_id ? String(player.player_id) : null,
        displayName: String(player.display_name),
        team: player.latest_team ? String(player.latest_team) : null,
        college: player.college_name ? String(player.college_name) : null,
        position: player.player_position ? String(player.player_position) : null,
        status: player.status ? String(player.status) : null,
      });
    }
  }
  return buildPlayerMatchReviewMap(rows, [...playersByGsis.values()]);
}

type PreparedGtmImportRow = Omit<NormalizedGtmImportRow, "contactType"> &
  GtmClassificationResult & {
    playerMasterGsisId: string | null;
    playerId: string | null;
    playerMatchType: string | null;
    playerMatchConfidence: number | null;
    playerMatchVerified: boolean;
    identityReviewStatus: "clear" | "possible" | "ambiguous" | "rejected" | "manual_verified";
    identityReviewReason: string | null;
  };

function prepareImportRows(
  rows: NormalizedGtmImportRow[],
  reviews: Map<string, PlayerMatchReview>,
  decisions?: Map<string, string | null>,
): PreparedGtmImportRow[] {
  return rows.map((row) => {
    const review = reviews.get(row.sourceRecordId);
    const hasDecision = decisions?.has(row.sourceRecordId) === true;
    const selectedGsisId = hasDecision
      ? decisions?.get(row.sourceRecordId)
      : review?.strength === "strong" ? review.candidates.find((candidate) => candidate.matchType !== "name_only")?.id : null;
    const match = selectedGsisId
      ? review?.candidates.find((candidate) => candidate.id === selectedGsisId)
      : null;
    if (selectedGsisId && !match) throw new Error(`Player match review for ${row.displayName} is no longer valid. Preview the import again.`);
    const classification = classifyGtmImportRow(row, {
      matched: Boolean(review),
      strong: Boolean(match),
      status: match?.status,
      team: match?.team,
      college: match?.school,
    });
    const manualPlayerVerification = Boolean(hasDecision && match);
    return {
      ...row,
      ...classification,
      classificationSource: manualPlayerVerification ? "manual_player_match" : classification.classificationSource,
      classificationConfidence: manualPlayerVerification ? 1 : classification.classificationConfidence,
      classificationStatus: manualPlayerVerification ? "manual_verified" : classification.classificationStatus,
      classificationReasons: manualPlayerVerification
        ? [...classification.classificationReasons, "Founder verified the Player Master match during import"]
        : classification.classificationReasons,
      playerMasterGsisId: match?.id ?? null,
      playerId: match?.playerId ?? null,
      playerMatchType: manualPlayerVerification ? "manual" : match?.matchType ?? null,
      playerMatchConfidence: manualPlayerVerification ? 1 : match?.confidence ?? null,
      playerMatchVerified: manualPlayerVerification,
      identityReviewStatus: !review || review.strength === "strong"
        ? "clear"
        : hasDecision ? (match ? "manual_verified" : "rejected") : review.strength,
      identityReviewReason: review
        ? `${review.strength} Player Master name match${hasDecision && !match ? " rejected during import review" : ""}`
        : null,
    };
  });
}

const FOUNDER_LOCK_FIELDS = [
  ["display_name", "displayName"], ["first_name", "firstName"],
  ["last_name", "lastName"], ["email", "email"], ["phone", "phone"],
  ["linkedin_url", "linkedinUrl"], ["current_company", "currentCompany"],
  ["current_title", "currentTitle"], ["contact_type", "contactType"],
  ["segment", "segment"], ["sport", "sport"],
  ["league_level", "leagueLevel"], ["geography", "geography"],
  ["relationship_strength", "relationshipStrength"],
  ["bltz_relevance", "bltzRelevance"], ["buying_authority", "buyingAuthority"],
  ["network_leverage", "networkLeverage"], ["timing_score", "timingScore"],
] as const;

function founderFieldLocks(value: Record<string, unknown>) {
  return FOUNDER_LOCK_FIELDS.flatMap(([column, key]) => {
    const fieldValue = value[key];
    if (key === "contactType" && fieldValue === "unclassified") return [];
    if (fieldValue == null || (typeof fieldValue === "string" && fieldValue.trim() === "")) return [];
    return [column];
  });
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

export async function logGtmInteraction(input: unknown): Promise<GtmMutationResult<{ id: string; interactionAt: string; outcomes: string[]; nextTrigger: string | null; followUpRequired: boolean }>> {
  const parsed = logInteractionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid", message: "Complete the required interaction fields." };

  let authorization;
  try {
    authorization = await getAuthorizedClient();
  } catch {
    return { ok: false, code: "unauthorized", message: "Your administrator access could not be verified." };
  }

  const gtm = authorization.supabase as unknown as SupabaseClient;
  const { data, error } = await gtm.rpc("log_gtm_interaction_v3", {
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
    p_outcomes: parsed.data.outcomes,
    p_next_trigger: parsed.data.nextTrigger || null,
    p_follow_up_required: parsed.data.followUpRequired,
  });

  if (error || !data) {
    const unavailable = error?.code === "42883" || error?.code === "PGRST202";
    return { ok: false, code: unavailable ? "unavailable" : "failed", message: unavailable ? "Interaction logging is not available until the atomic GTM database function is deployed." : "The interaction could not be saved. Try again." };
  }

  const row = Array.isArray(data) ? data[0] : data;
  refreshGtmPaths();
  return {
    ok: true,
    value: {
      id: String(row.id),
      interactionAt: String(row.interaction_at),
      outcomes: Array.isArray(row.outcomes) ? row.outcomes.map(String) : [],
      nextTrigger: row.next_trigger ? String(row.next_trigger) : null,
      followUpRequired: row.follow_up_required === true,
    },
  };
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
  const { data, error } = await gtm.rpc("create_gtm_contact_v3", {
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
    p_investor_type: value.investorType,
    p_investor_relationship_stage: value.investorRelationshipStage,
    p_what_they_need_to_see: value.whatTheyNeedToSee,
    p_investor_thesis_feedback: value.investorThesisFeedback,
    p_historical_signal: value.historicalSignal,
    p_future_trigger: value.futureTrigger,
    p_prior_outcome: value.priorOutcome,
    p_relationship_source: value.relationshipSource,
    p_next_trigger: value.nextTrigger,
    p_contact_type_other: value.contactType === "other" ? value.contactTypeOther : null,
    p_potential_roles: value.potentialRoles,
    p_relationship_objective: value.relationshipObjective,
    p_relationship_priority: value.relationshipPriority,
    p_relationship_context: value.relationshipContext,
  });
  if (error || !data) {
    const unavailable = error?.code === "42883" || error?.code === "PGRST202";
    const duplicate = error?.code === "23505";
    return { ok: false, code: unavailable ? "unavailable" : "failed", message: unavailable
      ? "Contact intake is not available until the GTM intake migration is deployed."
      : duplicate ? "A contact with that LinkedIn URL or source identity already exists." : "The contact could not be created. Try again." };
  }
  const created = Array.isArray(data) ? data[0] : data;
  const { error: verificationError } = await gtm.rpc("mark_gtm_contact_manual_verification", {
    p_contact_id: created.id,
    p_fields: founderFieldLocks(value),
  });
  if (verificationError) return { ok: false, code: "failed", message: "The contact was created, but its founder-data protection could not be applied. Refresh before editing or importing." };
  refreshGtmPaths();
  return { ok: true, value: { id: String(created.id) } };
}

export async function editGtmContact(input: unknown): Promise<GtmMutationResult<{ priorityScore: number | null; priorityTier: string | null }>> {
  const parsed = editContactSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid", message: parsed.error.issues[0]?.message ?? "Review the contact details." };
  let authorization;
  try { authorization = await getAuthorizedClient(); }
  catch { return { ok: false, code: "unauthorized", message: "Your administrator access could not be verified." }; }

  const value = parsed.data;
  const gtm = authorization.supabase as unknown as SupabaseClient;
  const { data, error } = await gtm.rpc("update_gtm_contact_v2", {
    p_contact_id: value.contactId,
    p_display_name: value.displayName,
    p_first_name: value.firstName,
    p_last_name: value.lastName,
    p_email: value.email?.toLowerCase() ?? null,
    p_phone: value.phone,
    p_linkedin_url: value.linkedinUrl?.toLowerCase() ?? null,
    p_current_company: value.currentCompany,
    p_current_title: value.currentTitle,
    p_contact_type: value.contactType,
    p_segment: value.segment,
    p_sport: value.sport,
    p_league_level: value.leagueLevel,
    p_geography: value.geography,
    p_relationship_strength: value.relationshipStrength,
    p_bltz_relevance: value.bltzRelevance,
    p_buying_authority: value.buyingAuthority,
    p_network_leverage: value.networkLeverage,
    p_timing_score: value.timingScore,
    p_do_not_automate: value.doNotAutomate,
    p_investor_type: value.contactType === "investor" ? value.investorType : null,
    p_investor_relationship_stage: value.contactType === "investor" ? value.investorRelationshipStage : null,
    p_what_they_need_to_see: value.contactType === "investor" ? value.whatTheyNeedToSee : null,
    p_investor_thesis_feedback: value.contactType === "investor" ? value.investorThesisFeedback : null,
    p_historical_signal: value.contactType === "investor" ? value.historicalSignal : null,
    p_future_trigger: value.contactType === "investor" ? value.futureTrigger : null,
    p_prior_outcome: value.contactType === "investor" ? value.priorOutcome : null,
    p_relationship_source: value.contactType === "investor" ? value.relationshipSource : null,
    p_contact_type_other: value.contactType === "other" ? value.contactTypeOther : null,
    p_potential_roles: value.potentialRoles,
    p_relationship_objective: value.relationshipObjective,
    p_relationship_priority: value.relationshipPriority,
    p_relationship_context: value.relationshipContext,
  });
  if (error || !data) {
    const duplicate = error?.code === "23505";
    return { ok: false, code: "failed", message: duplicate ? "Another active contact already uses that LinkedIn URL." : "The contact could not be updated. Try again." };
  }
  const row = Array.isArray(data) ? data[0] : data;
  const { error: verificationError } = await gtm.rpc("mark_gtm_contact_manual_verification", {
    p_contact_id: value.contactId,
    p_fields: founderFieldLocks(value),
  });
  if (verificationError) return { ok: false, code: "failed", message: "The contact changed, but its founder-data protection could not be applied. Refresh before importing." };
  refreshGtmPaths();
  return { ok: true, value: {
    priorityScore: row.priority_score == null ? null : Number(row.priority_score),
    priorityTier: row.priority_tier == null ? null : String(row.priority_tier),
  } };
}

async function updateContactWorkflow(contactId: string, patch: Record<string, unknown>): Promise<GtmMutationResult<{ id: string }>> {
  let authorization;
  try { authorization = await getAuthorizedClient(); }
  catch { return { ok: false, code: "unauthorized", message: "Your administrator access could not be verified." }; }
  const { data, error } = await authorization.supabase.from("gtm_contacts")
    .update({ ...patch, updated_by: authorization.userId })
    .eq("id", contactId).eq("archived", false).select("id").single();
  if (error || !data) return { ok: false, code: "failed", message: "The contact workflow could not be updated. Refresh and try again." };
  refreshGtmPaths();
  return { ok: true, value: { id: String(data.id) } };
}

export async function setGtmRelationshipIntelligence(input: unknown): Promise<GtmMutationResult<{ id: string }>> {
  const parsed = relationshipIntelligenceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid", message: parsed.error.issues[0]?.message ?? "Review the relationship details." };
  return updateContactWorkflow(parsed.data.contactId, {
    contact_type_other: parsed.data.contactTypeOther,
    potential_roles: parsed.data.potentialRoles,
    relationship_objective: parsed.data.relationshipObjective,
    relationship_priority: parsed.data.relationshipPriority,
    relationship_context: parsed.data.relationshipContext,
  });
}

export async function setGtmPipelineStage(input: unknown): Promise<GtmMutationResult<{ id: string }>> {
  const parsed = z.object({ contactId: z.string().uuid(), pipelineStage: z.enum(GTM_PIPELINE_STAGES) }).safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid", message: "Choose a valid pipeline stage." };
  return updateContactWorkflow(parsed.data.contactId, { pipeline_stage: parsed.data.pipelineStage });
}

export async function setGtmNextAction(input: unknown): Promise<GtmMutationResult<{ id: string }>> {
  const parsed = nextActionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid", message: parsed.error.issues[0]?.message ?? "Review the next action." };
  return updateContactWorkflow(parsed.data.contactId, {
    next_action: parsed.data.nextAction,
    next_action_at: parsed.data.nextActionAt,
    next_trigger: parsed.data.nextTrigger,
  });
}

export async function setGtmPriority(input: unknown): Promise<GtmMutationResult<{ id: string }>> {
  const parsed = z.object({ contactId: z.string().uuid(), isPriority: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid", message: "Choose a valid priority state." };
  return updateContactWorkflow(parsed.data.contactId, { is_priority: parsed.data.isPriority });
}

export async function archiveGtmContact(input: unknown): Promise<GtmMutationResult<{ id: string }>> {
  const parsed = z.object({ contactId: z.string().uuid(), confirmed: z.literal(true) }).safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid", message: "Confirm the archive action." };
  return updateContactWorkflow(parsed.data.contactId, { archived: true });
}

export async function matchGtmContactPlayer(input: unknown): Promise<GtmMutationResult<GtmPlayerOption>> {
  const parsed = z.object({ contactId: z.string().uuid(), playerId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid", message: "Choose a valid Player record." };
  let authorization;
  try { authorization = await getAuthorizedClient(); }
  catch { return { ok: false, code: "unauthorized", message: "Your administrator access could not be verified." }; }
  const gtm = authorization.supabase as unknown as SupabaseClient;
  const { error } = await gtm.rpc("match_gtm_contact_player", { p_contact_id: parsed.data.contactId, p_player_id: parsed.data.playerId });
  if (error) return { ok: false, code: "failed", message: error.code === "23514" ? "Only an active athlete contact can be matched to a Player." : "The Player match could not be saved." };
  const { data: player, error: playerError } = await gtm.from("players").select("id,name,full_name,display_name,team,position,level").eq("id", parsed.data.playerId).single();
  if (playerError || !player) return { ok: false, code: "failed", message: "The match was saved, but the Player summary could not be refreshed." };
  refreshGtmPaths();
  return { ok: true, value: {
    id: String(player.id),
    name: String(player.display_name || player.full_name || player.name),
    team: player.team as string | null,
    position: player.position as string | null,
    level: player.level as string | null,
  } };
}

export async function addGtmDiscoveryInsight(input: unknown): Promise<GtmMutationResult<{
  id: string;
  interactionId: string | null;
  problemDiscussed: string | null;
  currentSolution: string | null;
  painLevel: number | null;
  primaryBltzUseCase: string | null;
  featureRequested: string | null;
  wouldUse: boolean | null;
  wouldPilot: boolean | null;
  wouldPay: boolean | null;
  expectedBuyer: string | null;
  expectedBudgetRange: string | null;
  primaryObjection: string | null;
  introductionOffered: boolean | null;
  introductionTarget: string | null;
  additionalContext: string | null;
  createdAt: string;
  updatedAt: string;
}>> {
  const parsed = discoverySchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid", message: parsed.error.issues[0]?.message ?? "Record at least one discovery finding." };
  let authorization;
  try { authorization = await getAuthorizedClient(); }
  catch { return { ok: false, code: "unauthorized", message: "Your administrator access could not be verified." }; }
  const gtm = authorization.supabase as unknown as SupabaseClient;
  const value = parsed.data;
  const { data, error } = await gtm.rpc("create_gtm_customer_discovery", {
    p_contact_id: value.contactId,
    p_interaction_id: value.interactionId,
    p_organization_id: null,
    p_problem_discussed: value.problemDiscussed,
    p_current_solution: value.currentSolution,
    p_pain_level: value.painLevel,
    p_primary_bltz_use_case: value.primaryBltzUseCase,
    p_feature_requested: value.featureRequested,
    p_would_use: value.wouldUse,
    p_would_pilot: value.wouldPilot,
    p_would_pay: value.wouldPay,
    p_expected_buyer: value.expectedBuyer,
    p_expected_budget_range: value.expectedBudgetRange,
    p_primary_objection: value.primaryObjection,
    p_introduction_offered: value.introductionOffered,
    p_introduction_target: value.introductionTarget,
    p_additional_context: value.additionalContext,
  });
  if (error || !data) return { ok: false, code: "failed", message: "The discovery insight could not be saved. Try again." };
  const row = Array.isArray(data) ? data[0] : data;
  refreshGtmPaths();
  return { ok: true, value: {
    id: String(row.id),
    interactionId: row.interaction_id ? String(row.interaction_id) : null,
    problemDiscussed: row.problem_discussed ? String(row.problem_discussed) : null,
    currentSolution: row.current_solution ? String(row.current_solution) : null,
    painLevel: row.pain_level == null ? null : Number(row.pain_level),
    primaryBltzUseCase: row.primary_bltz_use_case ? String(row.primary_bltz_use_case) : null,
    featureRequested: row.feature_requested ? String(row.feature_requested) : null,
    wouldUse: row.would_use == null ? null : row.would_use === true,
    wouldPilot: row.would_pilot == null ? null : row.would_pilot === true,
    wouldPay: row.would_pay == null ? null : row.would_pay === true,
    expectedBuyer: row.expected_buyer ? String(row.expected_buyer) : null,
    expectedBudgetRange: row.expected_budget_range ? String(row.expected_budget_range) : null,
    primaryObjection: row.primary_objection ? String(row.primary_objection) : null,
    introductionOffered: row.introduction_offered == null ? null : row.introduction_offered === true,
    introductionTarget: row.introduction_target ? String(row.introduction_target) : null,
    additionalContext: row.additional_context ? String(row.additional_context) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  } };
}

export async function editGtmNote(input: unknown): Promise<GtmMutationResult<{ id: string; noteType: string; body: string; createdAt: string }>> {
  const parsed = editNoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid", message: "Choose a note type and enter a note." };
  let authorization;
  try { authorization = await getAuthorizedClient(); }
  catch { return { ok: false, code: "unauthorized", message: "Your administrator access could not be verified." }; }
  const { data, error } = await authorization.supabase.from("gtm_notes")
    .update({ note_type: parsed.data.noteType, body: parsed.data.body })
    .eq("id", parsed.data.noteId)
    .eq("contact_id", parsed.data.contactId)
    .select("id,note_type,body,created_at")
    .single();
  if (error || !data) return { ok: false, code: "failed", message: "The note could not be updated. Try again." };
  refreshGtmPaths();
  return { ok: true, value: { id: data.id, noteType: data.note_type, body: data.body, createdAt: data.created_at } };
}

export async function inspectGtmCsv(formData: FormData): Promise<GtmMutationResult<GtmCsvInspection>> {
  try { await getAuthorizedClient(); }
  catch { return { ok: false, code: "unauthorized", message: "Your administrator access could not be verified." }; }
  try {
    const { file, parsed } = await readCsv(formData);
    return { ok: true, value: {
      filename: file.name,
      headers: parsed.headers,
      mapping: { ...parsed.suggestedMapping, ...parseMapping(formData.get("mapping")) },
      rowsFound: parsed.rows.length + parsed.issues.length + parsed.duplicateCount,
      invalidRows: parsed.issues.length,
    } };
  } catch (error) {
    return { ok: false, code: "invalid", message: error instanceof Error ? error.message : "The CSV could not be read." };
  }
}

export async function previewGtmCsv(formData: FormData): Promise<GtmMutationResult<GtmCsvPreview>> {
  let authorization;
  try { authorization = await getAuthorizedClient(); }
  catch { return { ok: false, code: "unauthorized", message: "Your administrator access could not be verified." }; }
  try {
    const { file, parsed } = await readCsv(formData);
    const gtm = authorization.supabase as unknown as SupabaseClient;
    const [existing, playerReviews] = await Promise.all([analyzeExisting(gtm, parsed.rows), findPlayerMatchReviews(gtm, parsed.rows)]);
    let create = 0;
    let update = 0;
    let collision = 0;
    const outcomes = new Map<string, "create" | "update" | "skip">();
    for (const row of parsed.rows) {
      const outcome = existingOutcome(existing, row);
      outcomes.set(row.sourceRecordId, outcome);
      if (outcome === "update") update += 1;
      else if (outcome === "skip") collision += 1;
      else create += 1;
    }
    const idempotencyKey = crypto.randomUUID();
    const mapping = { ...parsed.suggestedMapping, ...parseMapping(formData.get("mapping")) };
    const acceptedRows = parsed.rows.filter((row) => outcomes.get(row.sourceRecordId) !== "skip");
    const acceptedReviews = new Map(
      [...playerReviews].filter(([sourceRecordId]) => outcomes.get(sourceRecordId) !== "skip"),
    );
    const reviews = [...acceptedReviews.values()];
    const preparedRows = prepareImportRows(acceptedRows, acceptedReviews);
    const sampleRows = prepareImportRows(parsed.rows, playerReviews);
    const matchedPlayers = reviews.filter((review) => review.strength === "strong").length;
    const possiblePlayerMatches = reviews.length - matchedPlayers;
    const automaticClassifications = preparedRows.filter((row) => row.classificationStatus === "auto_classified").length;
    const needsReview = preparedRows.filter((row) => row.classificationStatus === "needs_review").length;
    const unclassified = preparedRows.filter((row) => row.classificationStatus === "unclassified").length;
    const counts = {
      found: parsed.rows.length + parsed.issues.length + parsed.duplicateCount,
      newContacts: create,
      existingContacts: update + collision,
      updates: update,
      duplicate: parsed.duplicateCount + collision,
      matchedPlayers,
      possiblePlayerMatches,
      automaticClassifications,
      needsReview,
      unclassified,
      invalid: parsed.issues.length,
    };
    const previewRows = preparedRows.map(({ rowNumber: _rowNumber, ...row }) => row);
    const previewSummary = {
      valid: create + update,
      invalid: counts.invalid,
      duplicates: counts.duplicate,
      potentialMatches: reviews.length,
      automaticClassifications: previewRows.filter((row) => row.classificationStatus === "auto_classified").length,
      needsReview: previewRows.filter((row) => row.classificationStatus === "needs_review").length,
      unclassified: previewRows.filter((row) => row.classificationStatus === "unclassified").length,
    };
    const { error: prepareError } = await gtm.rpc("prepare_gtm_import_job_v2", {
      p_filename: file.name,
      p_import_type: "linkedin_connections",
      p_content_sha256: parsed.contentSha256,
      p_idempotency_key: idempotencyKey,
      p_field_mapping: mapping,
      p_preview_summary: previewSummary,
      p_rows: previewRows,
      p_rows_found: counts.found,
      p_rows_duplicated: counts.duplicate,
      p_rows_failed: counts.invalid,
      p_potential_matches: reviews.length,
    });
    if (prepareError) throw prepareError;
    return { ok: true, value: {
      filename: file.name,
      idempotencyKey,
      headers: parsed.headers,
      mapping,
      counts,
      sample: sampleRows.slice(0, 50).map((row) => ({
        rowNumber: row.rowNumber,
        displayName: row.displayName,
        email: row.email,
        currentCompany: row.currentCompany,
        contactType: row.contactType,
        segment: row.segment,
        classificationStatus: row.classificationStatus,
        classificationConfidence: row.classificationConfidence,
        outcome: outcomes.get(row.sourceRecordId) ?? "create",
        playerMatchStatus: playerReviews.get(row.sourceRecordId)?.strength ?? null,
      })),
      playerReviews: reviews,
      issues: parsed.issues.slice(0, 20),
    } };
  } catch (error) {
    const unavailable = error && typeof error === "object" && "code" in error && (["42P01", "42883", "PGRST202", "PGRST205"] as unknown[]).includes(error.code);
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
    const [existing, playerReviews] = await Promise.all([analyzeExisting(gtm, parsed.rows), findPlayerMatchReviews(gtm, parsed.rows)]);
    const accepted = parsed.rows.filter((row) => existingOutcome(existing, row) !== "skip");
    const acceptedSourceIds = new Set(accepted.map((row) => row.sourceRecordId));
    const acceptedReviews = new Map(
      [...playerReviews].filter(([sourceRecordId]) => acceptedSourceIds.has(sourceRecordId)),
    );
    const collisionCount = parsed.rows.length - accepted.length;
    const mapping = { ...parsed.suggestedMapping, ...parseMapping(formData.get("mapping")) };
    const matchDecisions = parsePlayerMatchDecisions(formData.get("playerMatchDecisions"));
    for (const review of acceptedReviews.values()) {
      if (review.strength !== "strong" && !matchDecisions.has(review.sourceRecordId)) {
        throw new Error(`Review or reject the possible Player match for ${review.displayName} before importing.`);
      }
    }
    const preparedRows = prepareImportRows(accepted, acceptedReviews, matchDecisions);
    const previewClassificationRows = prepareImportRows(accepted, acceptedReviews);
    const previewSummary = {
      valid: accepted.length,
      invalid: parsed.issues.length,
      duplicates: parsed.duplicateCount + collisionCount,
      potentialMatches: acceptedReviews.size,
      automaticClassifications: previewClassificationRows.filter((row) => row.classificationStatus === "auto_classified").length,
      needsReview: previewClassificationRows.filter((row) => row.classificationStatus === "needs_review").length,
      unclassified: previewClassificationRows.filter((row) => row.classificationStatus === "unclassified").length,
    };
    const { data, error } = await gtm.rpc("import_gtm_contacts_v2", {
      p_filename: file.name,
      p_content_sha256: parsed.contentSha256,
      p_idempotency_key: idempotencyKey,
      p_field_mapping: mapping,
      p_preview_summary: previewSummary,
      p_rows: preparedRows.map(({ rowNumber: _rowNumber, ...row }) => row),
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
