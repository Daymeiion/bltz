import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import type { OrganizationContext } from "@/lib/organization/types";
import { createServiceClient } from "@/lib/supabase/service";
import { listActivations, listSocialReach } from "./activations";
import { loadSchoolAthlete, toAthleteFile } from "./athlete";
import { buildBriefFacts, type BriefSources } from "./brief-facts";
import type { BriefContent, BriefFacts, BriefShareInput, BriefSummary } from "./briefs-shared";
import { listDismissals } from "./dismissals";
import { listAthleteMedia } from "./launches";
import { listSchoolSignals } from "./school-signals";

export * from "./briefs-shared";

/** Gathers the brief's facts for one of the school's own players; null if the player is not theirs. */
export async function loadBriefFacts(context: OrganizationContext, playerId: string, origin: string, partners: BriefSources["partners"] = []): Promise<BriefFacts | null> {
  const athlete = await loadSchoolAthlete(context, playerId);
  if (!athlete) return null;
  const organizationId = context.organization.id;
  const [activity, reach, media, schoolSignals, dismissals] = await Promise.all([
    listActivations(organizationId, { playerId }),
    listSocialReach(organizationId, playerId).catch(() => []),
    listAthleteMedia(organizationId, playerId),
    listSchoolSignals(organizationId, playerId),
    listDismissals(organizationId, playerId),
  ]);
  return buildBriefFacts({
    schoolName: context.organization.name, origin, file: toAthleteFile(athlete), activations: activity.activations,
    reach, media, schoolSignals: schoolSignals.signals, dismissals, partners,
  });
}

export function hashBriefToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Saves the snapshot and returns the only copy of the link's token. */
export async function shareBrief(organizationId: string, actorUserId: string, input: BriefShareInput, facts: BriefFacts): Promise<{ id: string; token: string; expiresAt: string }> {
  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + input.expiresInDays * 86_400_000).toISOString();
  const content: BriefContent = { recipient: input.recipient, facts, narrative: input.narrative };
  const { data, error } = await createServiceClient().from("organization_briefs").insert({
    organization_id: organizationId, player_id: input.playerId, brand_name: input.recipient.brandName,
    contact_name: input.recipient.contactName, contact_email: input.recipient.contactEmail, goal: input.recipient.goal, budget: input.recipient.budget,
    content, origin: input.origin, token_hash: hashBriefToken(token), expires_at: expiresAt,
    consent_confirmed_by: actorUserId, created_by: actorUserId,
  }).select("id").single();
  if (error || !data) throw new Error("brief_share_failed");
  return { id: (data as { id: string }).id, token, expiresAt };
}

const summaryRow = z.object({
  id: z.string(), player_id: z.string(), brand_name: z.string(), contact_name: z.string().nullable(), status: z.enum(["shared", "revoked"]),
  expires_at: z.string(), created_at: z.string(), view_count: z.number(), last_viewed_at: z.string().nullable(),
});
const SUMMARY_COLUMNS = "id,player_id,brand_name,contact_name,status,expires_at,created_at,view_count,last_viewed_at";
const toSummary = (row: z.infer<typeof summaryRow>): BriefSummary => ({
  id: row.id, playerId: row.player_id, brandName: row.brand_name, contactName: row.contact_name, status: row.status,
  expiresAt: row.expires_at, createdAt: row.created_at, viewCount: row.view_count, lastViewedAt: row.last_viewed_at,
});

export async function listBriefs(organizationId: string, playerId?: string): Promise<BriefSummary[]> {
  try {
    let query = createServiceClient().from("organization_briefs").select(SUMMARY_COLUMNS).eq("organization_id", organizationId);
    if (playerId) query = query.eq("player_id", playerId);
    const { data, error } = await query.order("created_at", { ascending: false }).limit(100);
    const parsed = z.array(summaryRow).safeParse(data);
    return error || !parsed.success ? [] : parsed.data.map(toSummary);
  } catch {
    return [];
  }
}

export async function revokeBrief(organizationId: string, briefId: string): Promise<boolean> {
  const { data, error } = await createServiceClient().from("organization_briefs").update({ status: "revoked" })
    .eq("id", briefId).eq("organization_id", organizationId).select("id");
  return !error && Array.isArray(data) && data.length === 1;
}

/** Counts an open and returns the brief, or null for an unknown, revoked or expired link. */
export async function openBrief(token: string): Promise<BriefContent | null> {
  if (!/^[A-Za-z0-9_-]{32}$/.test(token)) return null;
  try {
    const { data, error } = await createServiceClient().rpc("open_organization_brief", { p_token_hash: hashBriefToken(token) });
    return error || !data || typeof data !== "object" ? null : data as BriefContent;
  } catch {
    return null;
  }
}

export type AdminBrief = BriefSummary & { organizationId: string };

/** Every brief, newest first, for BLTZ admins. Caller must be an internal admin. */
export async function listAllBriefs(limit = 200): Promise<{ state: "ready" | "unavailable"; briefs: AdminBrief[] }> {
  try {
    const { data, error } = await createServiceClient().from("organization_briefs").select(`${SUMMARY_COLUMNS},organization_id`).order("created_at", { ascending: false }).limit(limit);
    const parsed = z.array(summaryRow.extend({ organization_id: z.string() })).safeParse(data);
    if (error || !parsed.success) return { state: "unavailable", briefs: [] };
    return { state: "ready", briefs: parsed.data.map((row) => ({ ...toSummary(row), organizationId: row.organization_id })) };
  } catch {
    return { state: "unavailable", briefs: [] };
  }
}
