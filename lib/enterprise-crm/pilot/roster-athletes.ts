import "server-only";

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { careerYears, matchesCollege, type LockerState, type RosterAthlete, type RosterInvite } from "./roster-shared";

export * from "./roster-shared";

const CHUNK = 200;
function chunks<T>(rows: readonly T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let index = 0; index < rows.length; index += size) out.push(rows.slice(index, index + size));
  return out;
}

/**
 * Adds every master-list player whose college is exactly `college` to the organization's
 * roster. Players already on the roster are skipped, so it is safe to run again after the
 * master list grows. Returns how many were added.
 */
export async function seedRosterFromMasterList(organizationId: string, college: string, actorUserId: string): Promise<number> {
  const db = createServiceClient();
  const wanted = college.trim();
  if (!wanted) return 0;
  const candidates: Array<{ gsis_id: string; display_name: string; position: string | null; rookie_season: number | null; last_season: number | null; college_name: string | null }> = [];
  for (let from = 0; from < 20_000; from += 1000) {
    const { data, error } = await db.from("nfl_players").select("gsis_id,display_name,position,rookie_season,last_season,college_name")
      .ilike("college_name", `%${wanted.replace(/[%_]/g, "")}%`).order("gsis_id").range(from, from + 999);
    if (error) throw new Error("master_list_unavailable");
    candidates.push(...(data ?? []) as typeof candidates);
    if (!data || data.length < 1000) break;
  }
  const matched = candidates.filter((row) => matchesCollege(row.college_name, wanted));
  if (!matched.length) return 0;

  const existing = new Set<string>();
  for (let from = 0; from < 20_000; from += 1000) {
    const { data } = await db.from("organization_athletes").select("gsis_id").eq("organization_id", organizationId).not("gsis_id", "is", null).range(from, from + 999);
    for (const row of (data ?? []) as Array<{ gsis_id: string }>) existing.add(row.gsis_id);
    if (!data || data.length < 1000) break;
  }
  const fresh = matched.filter((row) => !existing.has(row.gsis_id));
  for (const group of chunks(fresh, 500)) {
    const { error } = await db.from("organization_athletes").insert(group.map((row) => ({
      organization_id: organizationId, gsis_id: row.gsis_id, display_name: row.display_name, position: row.position,
      years: careerYears(row.rookie_season, row.last_season), sport: "Football", relationship: "alumni", source: "master_list", created_by: actorUserId,
    })));
    if (error) throw new Error("roster_seed_failed");
  }
  return fresh.length;
}

const athleteRow = z.object({
  id: z.string(), gsis_id: z.string().nullable(), player_id: z.string().nullable(), display_name: z.string(), position: z.string().nullable(),
  years: z.string().nullable(), sport: z.string().nullable(), contact_email: z.string().nullable(), source: z.enum(["master_list", "staff_added"]),
});
const ATHLETE_COLUMNS = "id,gsis_id,player_id,display_name,position,years,sport,contact_email,source";

type PlayerRecord = { id: string; gsis_id: string | null; user_id: string | null; slug: string | null };

/** The organization's roster with each player's Locker state and latest invite. Caller must authorize. */
export async function listRosterAthletes(organizationId: string): Promise<{ state: "ready" | "unavailable"; athletes: RosterAthlete[] }> {
  try {
    const db = createServiceClient();
    const rows: z.infer<typeof athleteRow>[] = [];
    for (let from = 0; from < 5000; from += 1000) {
      const { data, error } = await db.from("organization_athletes").select(ATHLETE_COLUMNS).eq("organization_id", organizationId).eq("status", "active").order("display_name").range(from, from + 999);
      const parsed = z.array(athleteRow).safeParse(data);
      if (error || !parsed.success) return { state: "unavailable", athletes: [] };
      rows.push(...parsed.data);
      if (parsed.data.length < 1000) break;
    }
    if (!rows.length) return { state: "ready", athletes: [] };

    const players: PlayerRecord[] = [];
    for (const group of chunks(rows.flatMap((row) => row.gsis_id ?? []))) {
      const { data } = await db.from("players").select("id,gsis_id,user_id,slug").in("gsis_id", group);
      players.push(...(data ?? []) as PlayerRecord[]);
    }
    for (const group of chunks(rows.flatMap((row) => row.player_id ?? []))) {
      const { data } = await db.from("players").select("id,gsis_id,user_id,slug").in("id", group);
      players.push(...(data ?? []) as PlayerRecord[]);
    }
    const byGsis = new Map(players.flatMap((row) => row.gsis_id ? [[row.gsis_id, row] as const] : []));
    const byId = new Map(players.map((row) => [row.id, row] as const));

    const invites = new Map<string, RosterInvite>();
    for (const group of chunks(rows.map((row) => row.id))) {
      const { data } = await db.from("organization_athlete_invites").select("id,organization_athlete_id,status,channel,created_at,expires_at")
        .in("organization_athlete_id", group).neq("status", "revoked").order("created_at", { ascending: false });
      for (const row of (data ?? []) as Array<{ id: string; organization_athlete_id: string; status: RosterInvite["status"]; channel: RosterInvite["channel"]; created_at: string; expires_at: string }>) {
        if (!invites.has(row.organization_athlete_id)) invites.set(row.organization_athlete_id, { id: row.id, status: row.status, channel: row.channel, createdAt: row.created_at, expiresAt: row.expires_at });
      }
    }

    return { state: "ready", athletes: rows.map((row) => {
      const player = (row.player_id ? byId.get(row.player_id) : null) ?? (row.gsis_id ? byGsis.get(row.gsis_id) : null) ?? null;
      const lockerState: LockerState = player?.user_id ? "claimed" : player ? "ready" : "none";
      return {
        id: row.id, name: row.display_name, position: row.position, years: row.years, sport: row.sport, source: row.source, lockerState,
        playerId: player?.id ?? null, lockerHref: player?.slug ? `/player/${player.slug}` : null,
        hasEmail: Boolean(row.contact_email), invite: invites.get(row.id) ?? null,
      };
    }) };
  } catch {
    return { state: "unavailable", athletes: [] };
  }
}

export async function addRosterAthlete(organizationId: string, actorUserId: string, input: { name: string; position: string | null; years: string | null; sport: string | null; email: string | null }): Promise<RosterAthlete> {
  const { data, error } = await createServiceClient().from("organization_athletes").insert({
    organization_id: organizationId, display_name: input.name, position: input.position, years: input.years, sport: input.sport,
    contact_email: input.email, relationship: "alumni", source: "staff_added", created_by: actorUserId,
  }).select(ATHLETE_COLUMNS).single();
  if (error) throw new Error("athlete_add_failed");
  const row = athleteRow.parse(data);
  return { id: row.id, name: row.display_name, position: row.position, years: row.years, sport: row.sport, source: row.source, lockerState: "none", playerId: null, lockerHref: null, hasEmail: Boolean(row.contact_email), invite: null };
}

/** One roster row with what an invite needs. Scoped to the organization. */
export async function rosterAthleteForInvite(organizationId: string, athleteId: string): Promise<{ id: string; name: string; gsisId: string | null; playerId: string | null; contactEmail: string | null } | null> {
  const { data } = await createServiceClient().from("organization_athletes").select(ATHLETE_COLUMNS).eq("id", athleteId).eq("organization_id", organizationId).eq("status", "active").maybeSingle();
  const parsed = athleteRow.safeParse(data);
  if (!parsed.success) return null;
  return { id: parsed.data.id, name: parsed.data.display_name, gsisId: parsed.data.gsis_id, playerId: parsed.data.player_id, contactEmail: parsed.data.contact_email };
}
