import { z } from "zod";

/** Where a roster player stands with their Locker. */
export type LockerState = "claimed" | "ready" | "none";

export type RosterInvite = { id: string; status: "created" | "sent" | "send_failed" | "opened" | "signed_up" | "revoked"; channel: "email" | "link"; createdAt: string; expiresAt: string };

/** One player on an organization's roster, with or without a Locker. */
export type RosterAthlete = {
  id: string;
  name: string;
  position: string | null;
  years: string | null;
  sport: string | null;
  source: "master_list" | "staff_added";
  lockerState: LockerState;
  /** The BLTZ player record, when there is one (opens their Intelligence page). */
  playerId: string | null;
  lockerHref: string | null;
  /** Whether staff saved an email for invites. The address itself stays on the server. */
  hasEmail: boolean;
  invite: RosterInvite | null;
};

export const LOCKER_STATE_LABEL: Record<LockerState, string> = { claimed: "Locker claimed", ready: "Locker ready, not claimed", none: "No Locker yet" };

export const addAthleteInput = z.object({
  name: z.string().trim().min(2).max(120),
  position: z.string().trim().max(40).nullish().transform((value) => value || null),
  years: z.string().trim().max(40).nullish().transform((value) => value || null),
  sport: z.string().trim().max(60).nullish().transform((value) => value || null),
  email: z.string().trim().toLowerCase().email().max(254).nullish().or(z.literal("")).transform((value) => value || null),
}).strict();

export const inviteInput = z.object({
  athleteId: z.string().uuid(),
  channel: z.enum(["email", "link"]),
  /** Required for email invites unless one is already saved for the player. */
  email: z.string().trim().toLowerCase().email().max(254).nullish().or(z.literal("")).transform((value) => value || null),
}).strict();

/** The master list writes several colleges in one field ("California; Oregon"). */
export function collegeParts(value: string | null | undefined): string[] {
  return (value ?? "").split(";").map((part) => part.trim()).filter(Boolean);
}

export function matchesCollege(collegeName: string | null | undefined, target: string): boolean {
  const wanted = target.trim().toLowerCase();
  return Boolean(wanted) && collegeParts(collegeName).some((part) => part.toLowerCase() === wanted);
}

export function careerYears(rookie: number | null, last: number | null): string | null {
  if (!rookie) return null;
  return last && last !== rookie ? `${rookie}–${last}` : String(rookie);
}
