import "server-only";

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { MEDIA_COLUMNS, mediaInput, mediaRow, mediaRows, toMedia } from "./launches";
import {
  ACTIVATION_CHANNELS,
  ACTIVATION_KINDS,
  SOCIAL_PLATFORMS,
  type PilotActivation,
  type PilotAthleteMedia,
  type PilotSocialReach,
} from "./types";

const uuid = z.string().uuid();
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => new Date(`${value}T00:00:00Z`).toISOString().startsWith(value));
const httpsUrl = z.string().trim().max(2048).url().refine((value) => value.startsWith("https://"), "Use an https:// link");
const count = z.number().int().min(0).max(2_000_000_000);

export const createActivationInput = z.object({
  playerId: uuid,
  kind: z.enum(ACTIVATION_KINDS),
  title: z.string().trim().min(1).max(200),
  brief: z.string().trim().max(4000).nullish(),
  signalKey: z.string().max(300).nullish(),
  momentId: uuid.nullish(),
  dueOn: day.nullish(),
  /** Other former players featured alongside the lead athlete. */
  additionalPlayerIds: z.array(uuid).max(20).default([]),
  /** Uploaded video, photos and Getty media to post with it. */
  media: z.array(mediaInput).max(10).default([]),
}).strict();

export const updateActivationInput = z.object({
  status: z.enum(["planned", "posted", "cancelled"]).optional(),
  channel: z.enum(ACTIVATION_CHANNELS).nullish(),
  postUrl: httpsUrl.nullish(),
  impressions: count.nullish(),
  engagements: count.nullish(),
}).strict();

export const socialReachInput = z.object({
  playerId: uuid,
  platform: z.enum(SOCIAL_PLATFORMS),
  handle: z.string().trim().min(1).max(120).nullish(),
  followers: count,
}).strict();

const activationRow = z.object({
  id: uuid, player_id: uuid, kind: z.enum(ACTIVATION_KINDS), title: z.string(), brief: z.string().nullable(),
  signal_key: z.string().nullable(), moment_id: uuid.nullable(), due_on: z.string().nullable(),
  status: z.enum(["planned", "posted", "cancelled"]), channel: z.enum(ACTIVATION_CHANNELS).nullable(),
  post_url: z.string().nullable(), posted_at: z.string().nullable(), impressions: z.number().nullable(),
  engagements: z.number().nullable(), created_at: z.string(),
});
const ACTIVATION_COLUMNS = "id,player_id,kind,title,brief,signal_key,moment_id,due_on,status,channel,post_url,posted_at,impressions,engagements,created_at";

export type PlayerDirectory = ReadonlyMap<string, { name: string; portraitUrl: string | null }>;

export function toPilotActivation(row: z.infer<typeof activationRow>, visits: number, players: PlayerDirectory = new Map(), featured: readonly string[] = [], media: PilotAthleteMedia[] = []): PilotActivation {
  const athletes = [row.player_id, ...featured.filter((id) => id !== row.player_id)]
    .flatMap((id) => { const player = players.get(id); return player ? [{ id, name: player.name, portraitUrl: player.portraitUrl }] : []; });
  return {
    id: row.id, playerId: row.player_id, playerName: players.get(row.player_id)?.name ?? null, athletes, media, kind: row.kind, title: row.title, brief: row.brief,
    signalKey: row.signal_key, momentId: row.moment_id, dueOn: row.due_on, status: row.status, channel: row.channel,
    postUrl: row.post_url, postedAt: row.posted_at, impressions: row.impressions, engagements: row.engagements,
    visits, trackedHref: `/api/go/${row.id}`, createdAt: row.created_at,
  };
}

export type ActivationList = { state: "ready" | "unavailable"; activations: PilotActivation[] };

/** Caller must have authorized `activation.read` for this organization. */
/**
 * Activations for the organization, newest first. With `playerId`, those that
 * feature the player as lead or alongside others. Caller must authorize `activation.read`.
 */
export async function listActivations(organizationId: string, options: { playerId?: string; limit?: number; players?: PlayerDirectory } = {}): Promise<ActivationList> {
  try {
    const db = createServiceClient();
    let featuredIn: string[] = [];
    if (options.playerId) {
      const { data } = await db.from("organization_activation_athletes").select("activation_id").eq("player_id", options.playerId).limit(200);
      featuredIn = ((data ?? []) as Array<{ activation_id: string }>).map((row) => row.activation_id);
    }
    let query = db.from("organization_activations").select(ACTIVATION_COLUMNS).eq("organization_id", organizationId);
    if (options.playerId) query = featuredIn.length ? query.or(`player_id.eq.${options.playerId},id.in.(${featuredIn.join(",")})`) : query.eq("player_id", options.playerId);
    const [rows, counts] = await Promise.all([
      query.order("created_at", { ascending: false }).limit(options.limit ?? 100),
      db.rpc("organization_activation_visit_counts", { p_organization_id: organizationId }),
    ]);
    const parsed = z.array(activationRow).safeParse(rows.data);
    if (rows.error || !parsed.success) return { state: "unavailable", activations: [] };
    const ids = parsed.data.map((row) => row.id);
    const links = ids.length ? await db.from("organization_activation_athletes").select("activation_id,player_id").in("activation_id", ids) : { data: [] };
    const featured = new Map<string, string[]>();
    for (const link of (links.data ?? []) as Array<{ activation_id: string; player_id: string }>) featured.set(link.activation_id, [...(featured.get(link.activation_id) ?? []), link.player_id]);
    const attached = ids.length ? await db.from("organization_athlete_media").select(MEDIA_COLUMNS).in("activation_id", ids).neq("review_status", "rejected") : { data: [] };
    const attachedRows = z.array(mediaRow).safeParse(attached.data);
    const mediaByActivation = new Map<string, PilotAthleteMedia[]>();
    if (attachedRows.success) for (const item of attachedRows.data.map(toMedia)) if (item.activationId) mediaByActivation.set(item.activationId, [...(mediaByActivation.get(item.activationId) ?? []), item]);
    const visits = new Map<string, number>();
    if (!counts.error && Array.isArray(counts.data)) {
      for (const row of counts.data as Array<{ activation_id: string; visits: number }>) visits.set(row.activation_id, Number(row.visits) || 0);
    }
    return { state: "ready", activations: parsed.data.map((row) => toPilotActivation(row, visits.get(row.id) ?? 0, options.players, featured.get(row.id), mediaByActivation.get(row.id))) };
  } catch {
    return { state: "unavailable", activations: [] };
  }
}

export async function createActivation(organizationId: string, actorUserId: string, input: z.infer<typeof createActivationInput>, players?: PlayerDirectory) {
  const db = createServiceClient();
  const { data, error } = await db.from("organization_activations").insert({
    organization_id: organizationId, player_id: input.playerId, kind: input.kind, title: input.title,
    brief: input.brief || null, signal_key: input.signalKey ?? null, moment_id: input.momentId ?? null,
    due_on: input.dueOn ?? null, created_by: actorUserId,
  }).select(ACTIVATION_COLUMNS).single();
  if (error) throw new Error("activation_create_failed");
  const row = activationRow.parse(data);
  const featured = [...new Set(input.additionalPlayerIds)].filter((id) => id !== input.playerId);
  if (featured.length) {
    const linked = await db.from("organization_activation_athletes").insert(featured.map((playerId) => ({ activation_id: row.id, player_id: playerId, added_by: actorUserId })));
    if (linked.error) throw new Error("activation_athletes_failed");
  }
  let media: PilotAthleteMedia[] = [];
  if (input.media.length) {
    const inserted = await db.from("organization_athlete_media").insert(mediaRows(organizationId, input.media, { playerId: input.playerId, activationId: row.id }, actorUserId)).select(MEDIA_COLUMNS);
    const parsed = z.array(mediaRow).safeParse(inserted.data);
    if (inserted.error || !parsed.success) throw new Error("activation_media_failed");
    media = parsed.data.map(toMedia);
  }
  return toPilotActivation(row, 0, players, featured, media);
}

export async function updateActivation(organizationId: string, activationId: string, actorUserId: string, input: z.infer<typeof updateActivationInput>) {
  const patch: Record<string, unknown> = { updated_by: actorUserId, updated_at: new Date().toISOString() };
  if (input.status) {
    patch.status = input.status;
    if (input.status === "posted") patch.posted_at = new Date().toISOString();
  }
  if (input.channel !== undefined) patch.channel = input.channel;
  if (input.postUrl !== undefined) patch.post_url = input.postUrl;
  if (input.impressions !== undefined) patch.impressions = input.impressions;
  if (input.engagements !== undefined) patch.engagements = input.engagements;
  const { data, error } = await createServiceClient().from("organization_activations").update(patch)
    .eq("id", activationId).eq("organization_id", organizationId).select(ACTIVATION_COLUMNS).maybeSingle();
  if (error) throw new Error("activation_update_failed");
  return data ? toPilotActivation(activationRow.parse(data), 0) : null;
}

const reachRow = z.object({ platform: z.enum(SOCIAL_PLATFORMS), handle: z.string().nullable(), followers: z.number(), recorded_at: z.string() });

/** Latest recorded follower count per platform. */
export async function listSocialReach(organizationId: string, playerId: string): Promise<PilotSocialReach[]> {
  const { data, error } = await createServiceClient().from("organization_athlete_social_reach")
    .select("platform,handle,followers,recorded_at").eq("organization_id", organizationId).eq("player_id", playerId)
    .order("recorded_at", { ascending: false }).limit(60);
  const parsed = z.array(reachRow).safeParse(data);
  if (error || !parsed.success) return [];
  const latest = new Map<string, PilotSocialReach>();
  for (const row of parsed.data) if (!latest.has(row.platform)) latest.set(row.platform, { platform: row.platform, handle: row.handle, followers: row.followers, recordedAt: row.recorded_at });
  return [...latest.values()].sort((a, b) => b.followers - a.followers);
}

export async function recordSocialReach(organizationId: string, actorUserId: string, input: z.infer<typeof socialReachInput>): Promise<PilotSocialReach> {
  const { data, error } = await createServiceClient().from("organization_athlete_social_reach").insert({
    organization_id: organizationId, player_id: input.playerId, platform: input.platform,
    handle: input.handle ?? null, followers: input.followers, recorded_by: actorUserId,
  }).select("platform,handle,followers,recorded_at").single();
  if (error) throw new Error("social_reach_failed");
  const row = reachRow.parse(data);
  return { platform: row.platform, handle: row.handle, followers: row.followers, recordedAt: row.recorded_at };
}

/**
 * Resolves a tracked activation link to its player's public Locker and logs the
 * visit. Unknown IDs return null so the route can fall back to the home page.
 */
export async function recordActivationVisit(activationId: string, referrerHost: string | null): Promise<string | null> {
  if (!uuid.safeParse(activationId).success) return null;
  const db = createServiceClient();
  const { data } = await db.from("organization_activations").select("id,player_id,status").eq("id", activationId).maybeSingle();
  if (!data || (data as { status: string }).status === "cancelled") return null;
  const { data: player } = await db.from("players").select("slug").eq("id", (data as { player_id: string }).player_id).maybeSingle();
  const slug = (player as { slug?: unknown } | null)?.slug;
  if (typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  await db.from("organization_activation_visits").insert({ activation_id: activationId, referrer_host: referrerHost?.slice(0, 255) ?? null });
  return `/player/${slug}`;
}
