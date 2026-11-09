import "server-only";

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import {
  ATHLETE_MEDIA_KINDS,
  LAUNCH_STATUSES,
  mediaSignals,
  type PilotAthleteMedia,
  type PilotLaunch,
  type PilotPlayer,
  type PilotRoster,
} from "./types";

const uuid = z.string().uuid();
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => new Date(`${value}T00:00:00Z`).toISOString().startsWith(value));
const httpsUrl = z.string().trim().max(2048).url().refine((value) => value.startsWith("https://"), "Use an https:// link");

const mediaFields = z.object({
  kind: z.enum(ATHLETE_MEDIA_KINDS),
  title: z.string().trim().min(1).max(200),
  url: httpsUrl.nullish(),
  description: z.string().trim().max(1000).nullish(),
  occurredOn: day.nullish(),
  source: z.enum(["link", "upload", "getty"]).default("link"),
  storagePath: z.string().max(300).nullish(),
  thumbUrl: httpsUrl.nullish(),
  externalId: z.string().regex(/^[0-9A-Za-z-]{1,40}$/).nullish(),
}).strict();

type MediaFields = z.infer<typeof mediaFields>;
function mediaShape(item: MediaFields, context: z.RefinementCtx) {
  const ok = item.source === "upload" ? Boolean(item.storagePath) && !item.url
    : item.source === "getty" ? Boolean(item.externalId && item.url) && !item.storagePath
    : !item.storagePath;
  if (!ok) context.addIssue({ code: "custom", message: "media_shape", path: ["source"] });
}

export const mediaInput = mediaFields.superRefine(mediaShape);
export const addMediaInput = mediaFields.extend({ playerId: uuid, momentId: z.string().min(1).max(80).nullish() }).strict().superRefine(mediaShape);

export const launchInput = z.object({
  playerId: uuid.nullish(),
  playerName: z.string().trim().min(2).max(120),
  position: z.string().trim().min(1).max(40).nullish(),
  years: z.string().trim().min(1).max(40).nullish(),
  contactEmail: z.string().trim().max(254).email().nullish(),
  message: z.string().trim().max(2000).nullish(),
  media: z.array(mediaInput).max(20).default([]),
}).strict();

export const mediaRow = z.object({
  id: uuid, player_id: uuid.nullable(), launch_id: uuid.nullable(), activation_id: uuid.nullable(), kind: z.enum(ATHLETE_MEDIA_KINDS), title: z.string(),
  url: z.string().nullable(), description: z.string().nullable(), occurred_on: z.string().nullable(),
  review_status: z.enum(["pending", "approved", "rejected"]), created_at: z.string(),
  source: z.enum(["link", "upload", "getty"]), thumb_url: z.string().nullable(),
  // Present once 20261109120000_crm_pilot_moment_media.sql has run.
  moment_id: z.string().nullable().optional(), storage_path: z.string().nullable().optional(),
});
export const MEDIA_COLUMNS = "id,player_id,launch_id,activation_id,kind,title,url,description,occurred_on,review_status,created_at,source,thumb_url";
const launchRow = z.object({
  id: uuid, player_id: uuid.nullable(), player_name: z.string(), position: z.string().nullable(), years: z.string().nullable(),
  contact_email: z.string().nullable(), message: z.string().nullable(), status: z.enum(LAUNCH_STATUSES),
  status_note: z.string().nullable(), created_at: z.string(),
});
const LAUNCH_COLUMNS = "id,player_id,player_name,position,years,contact_email,message,status,status_note,created_at";

export function toMedia(row: z.infer<typeof mediaRow>): PilotAthleteMedia {
  return {
    id: row.id, playerId: row.player_id, launchId: row.launch_id, activationId: row.activation_id, kind: row.kind, title: row.title,
    url: row.url, description: row.description, occurredOn: row.occurred_on, reviewStatus: row.review_status, createdAt: row.created_at,
    source: row.source, thumbUrl: row.thumb_url, momentId: row.moment_id ?? null, storagePath: row.storage_path ?? null,
  };
}

export function mediaRows(organizationId: string, items: MediaFields[], subject: { playerId?: string | null; launchId?: string | null; activationId?: string | null }, actorUserId: string) {
  return items.map((item) => ({
    organization_id: organizationId, player_id: subject.playerId ?? null, launch_id: subject.launchId ?? null, activation_id: subject.activationId ?? null,
    kind: item.kind, title: item.title, url: item.url ?? null, description: item.description || null,
    occurred_on: item.occurredOn ?? null, created_by: actorUserId,
    source: item.source, storage_path: item.storagePath ?? null, thumb_url: item.thumbUrl ?? null, external_id: item.externalId ?? null,
  }));
}

/** School-connected media for the organization, optionally for one player. Caller must authorize. */
export async function listAthleteMedia(organizationId: string, playerId?: string): Promise<PilotAthleteMedia[]> {
  try {
    // Media attached to an activation lives with that activation, not in "From your school".
    const read = (columns: string) => {
      let query = createServiceClient().from("organization_athlete_media").select(columns).eq("organization_id", organizationId).neq("review_status", "rejected").is("activation_id", null);
      if (playerId) query = query.eq("player_id", playerId);
      return query.order("created_at", { ascending: false }).limit(500);
    };
    // Before the Moment media migration runs, read without moment_id rather than showing nothing.
    let { data, error } = await read(`${MEDIA_COLUMNS},moment_id,storage_path`);
    if (error) ({ data, error } = await read(`${MEDIA_COLUMNS},storage_path`));
    const parsed = z.array(mediaRow).safeParse(data);
    return error || !parsed.success ? [] : parsed.data.map(toMedia);
  } catch {
    return [];
  }
}

export async function addAthleteMedia(organizationId: string, actorUserId: string, input: z.infer<typeof addMediaInput>): Promise<PilotAthleteMedia> {
  const { playerId, momentId, ...item } = input;
  const row = { ...mediaRows(organizationId, [item], { playerId }, actorUserId)[0], ...(momentId ? { moment_id: momentId } : {}) };
  const { data, error } = await createServiceClient().from("organization_athlete_media")
    .insert(row).select(`${MEDIA_COLUMNS},storage_path${momentId ? ",moment_id" : ""}`).single();
  if (error) throw new Error("media_create_failed");
  return toMedia(mediaRow.parse(data));
}

export async function listLaunches(organizationId: string): Promise<{ state: "ready" | "unavailable"; launches: PilotLaunch[] }> {
  try {
    const db = createServiceClient();
    const { data, error } = await db.from("organization_locker_launches").select(LAUNCH_COLUMNS).eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(100);
    const parsed = z.array(launchRow).safeParse(data);
    if (error || !parsed.success) return { state: "unavailable", launches: [] };
    const ids = parsed.data.map((row) => row.id);
    const media = ids.length ? await db.from("organization_athlete_media").select(MEDIA_COLUMNS).in("launch_id", ids) : { data: [], error: null };
    const mediaParsed = z.array(mediaRow).safeParse(media.data);
    const byLaunch = new Map<string, PilotAthleteMedia[]>();
    if (!media.error && mediaParsed.success) for (const row of mediaParsed.data.map(toMedia)) if (row.launchId) byLaunch.set(row.launchId, [...(byLaunch.get(row.launchId) ?? []), row]);
    return { state: "ready", launches: parsed.data.map((row) => ({
      id: row.id, playerId: row.player_id, playerName: row.player_name, position: row.position, years: row.years,
      contactEmail: row.contact_email, message: row.message, status: row.status, statusNote: row.status_note,
      media: byLaunch.get(row.id) ?? [], createdAt: row.created_at,
    })) };
  } catch {
    return { state: "unavailable", launches: [] };
  }
}

export async function createLaunch(organizationId: string, actorUserId: string, input: z.infer<typeof launchInput>): Promise<PilotLaunch> {
  const db = createServiceClient();
  const { data, error } = await db.from("organization_locker_launches").insert({
    organization_id: organizationId, player_id: input.playerId ?? null, player_name: input.playerName,
    position: input.position ?? null, years: input.years ?? null, contact_email: input.contactEmail ?? null,
    message: input.message || null, created_by: actorUserId,
  }).select(LAUNCH_COLUMNS).single();
  if (error) throw new Error("launch_create_failed");
  const launch = launchRow.parse(data);
  let media: PilotAthleteMedia[] = [];
  if (input.media.length) {
    const inserted = await db.from("organization_athlete_media")
      .insert(mediaRows(organizationId, input.media, { playerId: input.playerId ?? null, launchId: launch.id }, actorUserId)).select(MEDIA_COLUMNS);
    const parsed = z.array(mediaRow).safeParse(inserted.data);
    if (!inserted.error && parsed.success) media = parsed.data.map(toMedia);
  }
  return {
    id: launch.id, playerId: launch.player_id, playerName: launch.player_name, position: launch.position, years: launch.years,
    contactEmail: launch.contact_email, message: launch.message, status: launch.status, statusNote: launch.status_note, media, createdAt: launch.created_at,
  };
}

/** Folds school-connected signals into each player's "next moment" for the Overview. */
export function mergeMediaSignals(roster: PilotRoster, media: readonly PilotAthleteMedia[], today = new Date()): PilotRoster {
  if (!media.length) return roster;
  const players = roster.players.map((player): PilotPlayer => {
    const own = mediaSignals(media.filter((item) => item.playerId === player.id), today).sort((a, b) => a.daysUntil - b.daysUntil)[0];
    if (!own || (player.next && player.next.daysUntil <= own.daysUntil)) return player;
    return { ...player, next: { headline: own.headline, targetDate: own.targetDate, daysUntil: own.daysUntil, verdict: own.verdict }, signalCount: player.signalCount + 1 };
  });
  return { ...roster, players };
}
