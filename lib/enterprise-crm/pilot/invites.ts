import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { sendInviteEmail } from "./invite-email";
import { rosterAthleteForInvite } from "./roster-athletes";
import type { RosterInvite } from "./roster-shared";

export const INVITE_COOKIE = "bltz_org_invite";
export const INVITE_DAYS = 30;
/** Email invites one organization can send in a day, so a mistake cannot mail a whole roster repeatedly. */
export const DAILY_EMAIL_LIMIT = 100;

const TOKEN = /^[A-Za-z0-9_-]{32}$/;
export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type InviteResult =
  | { state: "created"; invite: RosterInvite; url: string; emailed: boolean; emailState: "sent" | "not_configured" | "failed" | null }
  | { state: "not_found" | "already_claimed" | "email_required" | "daily_limit" | "failed" };

/**
 * Creates a personal signup link for one roster player. With channel "email" it is also
 * sent from BLTZ on the organization's behalf; either way the link is returned once so
 * staff can copy it. A new email address is saved on the player for next time.
 */
export async function createInvite(input: { organizationId: string; organizationName: string; actorUserId: string; athleteId: string; channel: "email" | "link"; email: string | null; origin: string }): Promise<InviteResult> {
  const db = createServiceClient();
  const athlete = await rosterAthleteForInvite(input.organizationId, input.athleteId);
  if (!athlete) return { state: "not_found" };
  const player = athlete.playerId || athlete.gsisId
    ? await db.from("players").select("id,user_id").or([athlete.playerId ? `id.eq.${athlete.playerId}` : null, athlete.gsisId ? `gsis_id.eq.${athlete.gsisId}` : null].filter(Boolean).join(",")).limit(1).maybeSingle()
    : { data: null };
  if ((player.data as { user_id: string | null } | null)?.user_id) return { state: "already_claimed" };

  const email = input.email ?? athlete.contactEmail;
  if (input.channel === "email") {
    if (!email) return { state: "email_required" };
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const sentToday = await db.from("organization_athlete_invites").select("id", { count: "exact", head: true }).eq("organization_id", input.organizationId).eq("channel", "email").gte("created_at", since);
    if ((sentToday.count ?? 0) >= DAILY_EMAIL_LIMIT) return { state: "daily_limit" };
  }
  if (input.email && input.email !== athlete.contactEmail) {
    await db.from("organization_athletes").update({ contact_email: input.email, updated_at: new Date().toISOString() }).eq("id", athlete.id).eq("organization_id", input.organizationId);
  }

  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_DAYS * 86_400_000).toISOString();
  const created = await db.from("organization_athlete_invites").insert({
    organization_id: input.organizationId, organization_athlete_id: athlete.id, token_hash: hashInviteToken(token), channel: input.channel,
    email: input.channel === "email" ? email : null, expires_at: expiresAt, created_by: input.actorUserId,
  }).select("id,created_at").single();
  if (created.error || !created.data) return { state: "failed" };
  const row = created.data as { id: string; created_at: string };
  const url = `${input.origin}/join/${token}`;

  let status: RosterInvite["status"] = "created";
  let emailState: "sent" | "not_configured" | "failed" | null = null;
  if (input.channel === "email" && email) {
    emailState = await sendInviteEmail({ inviteId: row.id, recipientEmail: email, athleteName: athlete.name, organizationName: input.organizationName, joinUrl: url });
    status = emailState === "sent" ? "sent" : "send_failed";
    await db.from("organization_athlete_invites").update({ status }).eq("id", row.id);
  }
  return { state: "created", url, emailed: emailState === "sent", emailState, invite: { id: row.id, status, channel: input.channel, createdAt: row.created_at, expiresAt } };
}

export type OpenedInvite = { inviteId: string; organizationName: string; athleteName: string; playerId: string | null; claimed: boolean };

/** Marks a live invite opened and returns what the landing page shows; null for dead links. */
export async function openInvite(token: string): Promise<OpenedInvite | null> {
  if (!TOKEN.test(token)) return null;
  try {
    const db = createServiceClient();
    const opened = await db.rpc("open_organization_invite", { p_token_hash: hashInviteToken(token) });
    const info = opened.data as { invite_id: string; organization_id: string; organization_athlete_id: string } | null;
    if (opened.error || !info) return null;
    const [organization, athlete] = await Promise.all([
      db.from("organizations").select("name").eq("id", info.organization_id).maybeSingle(),
      db.from("organization_athletes").select("display_name,gsis_id,player_id").eq("id", info.organization_athlete_id).maybeSingle(),
    ]);
    const person = athlete.data as { display_name: string; gsis_id: string | null; player_id: string | null } | null;
    if (!organization.data || !person) return null;
    const player = person.player_id || person.gsis_id
      ? await db.from("players").select("id,user_id").or([person.player_id ? `id.eq.${person.player_id}` : null, person.gsis_id ? `gsis_id.eq.${person.gsis_id}` : null].filter(Boolean).join(",")).limit(1).maybeSingle()
      : { data: null };
    const record = player.data as { id: string; user_id: string | null } | null;
    return { inviteId: info.invite_id, organizationName: (organization.data as { name: string }).name, athleteName: person.display_name, playerId: record?.id ?? null, claimed: Boolean(record?.user_id) };
  } catch {
    return null;
  }
}

/**
 * Where a signed-in player goes for this invite: an existing unclaimed player record gets
 * a fresh claim link into onboarding; otherwise they start a new Locker. Null for dead
 * links and Lockers that are already claimed.
 */
export async function inviteOnboardingPath(token: string): Promise<string | null> {
  const invite = await openInvite(token);
  if (!invite || invite.claimed) return null;
  if (!invite.playerId) return "/onboarding";
  const claim = randomBytes(24).toString("base64url");
  const { error } = await createServiceClient().from("claim_tokens").insert({ player_id: invite.playerId, token: claim, expires_at: new Date(Date.now() + 14 * 86_400_000).toISOString() });
  return error ? "/onboarding" : `/onboarding/claim/${claim}`;
}

/**
 * After "Claim your Locker": signed-in players go straight into onboarding. Everyone else
 * creates an account first; the invite cookie brings them back to the right place.
 */
export async function startInvite(token: string, signedIn: boolean): Promise<string | null> {
  if (signedIn) return inviteOnboardingPath(token);
  const invite = await openInvite(token);
  return !invite || invite.claimed ? null : "/auth/sign-up";
}

/** After the player publishes their Locker: the invite is marked signed up and the roster row points at their player record. */
export async function completeInvite(token: string, userId: string, playerId: string | null): Promise<void> {
  if (!TOKEN.test(token)) return;
  const db = createServiceClient();
  const { data } = await db.from("organization_athlete_invites")
    .update({ status: "signed_up", signed_up_at: new Date().toISOString(), signed_up_user_id: userId })
    .eq("token_hash", hashInviteToken(token)).neq("status", "revoked").select("organization_athlete_id").maybeSingle();
  const athleteId = (data as { organization_athlete_id: string } | null)?.organization_athlete_id;
  if (athleteId && playerId) await db.from("organization_athletes").update({ player_id: playerId, updated_at: new Date().toISOString() }).eq("id", athleteId);
}
