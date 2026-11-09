import { z } from "zod";
import { signalVerdict } from "@/lib/intelligence/signals/evaluate";
import type { AthleteFile, PilotRoster, SignalSubject } from "./types";

export const SCHOOL_SIGNAL_KINDS = ["anniversary", "birthday", "milestone", "event", "business", "other"] as const;
export type SchoolSignalKind = (typeof SCHOOL_SIGNAL_KINDS)[number];

export type SignalSource = { label: string; url: string | null };

/** A dated reason to feature a former player that the school added itself. */
export type SchoolSignal = {
  id: string;
  playerId: string | null;
  title: string;
  kind: SchoolSignalKind;
  /** The original date (for yearly signals, the first year). */
  targetDate: string;
  recurrence: "yearly" | "once";
  why: string | null;
  sources: SignalSource[];
  origin: "ai" | "manual";
  createdAt: string;
};

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().startsWith(value));
const httpsUrl = z.string().url().max(2048).refine((value) => value.startsWith("https://"));

export const schoolSignalInput = z.object({
  playerId: z.string().uuid().nullable(),
  title: z.string().trim().min(2).max(160),
  kind: z.enum(SCHOOL_SIGNAL_KINDS),
  targetDate: day,
  recurrence: z.enum(["yearly", "once"]),
  why: z.string().trim().max(1000).nullish(),
  sources: z.array(z.object({ label: z.string().trim().min(1).max(200), url: httpsUrl.nullable() }).strict()).max(10).default([]),
  request: z.string().trim().max(2000).nullish(),
  origin: z.enum(["ai", "manual"]).default("manual"),
}).strict();
export type SchoolSignalInput = z.infer<typeof schoolSignalInput>;

/**
 * The next time this date comes around, from today (UTC), within a year.
 * Yearly dates repeat (Feb 29 falls on Feb 28 in other years); one-time dates
 * only count while they are still ahead.
 */
export function nextOccurrence(signal: Pick<SchoolSignal, "targetDate" | "recurrence">, today = new Date()): { targetDate: string; daysUntil: number; years: number } | null {
  const [year, month, dayOfMonth] = signal.targetDate.split("-").map(Number);
  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const at = (candidateYear: number) => {
    const last = new Date(Date.UTC(candidateYear, month, 0)).getUTCDate();
    return Date.UTC(candidateYear, month - 1, Math.min(dayOfMonth, last));
  };
  const candidates = signal.recurrence === "once" ? [year] : [today.getUTCFullYear(), today.getUTCFullYear() + 1];
  for (const candidate of candidates) {
    const target = at(candidate);
    if (target < start) continue;
    const daysUntil = Math.round((target - start) / 86_400_000);
    if (daysUntil > 366) return null;
    return { targetDate: new Date(target).toISOString().slice(0, 10), daysUntil, years: candidate - year };
  }
  return null;
}

const SUBJECT: Record<SchoolSignalKind, SignalSubject> = {
  anniversary: "anniversary", birthday: "birthday", milestone: "milestone", event: "anniversary", business: "business", other: "anniversary",
};

/** A school signal in the same shape as the engine's, so it lists, suggests and plans like one. */
export function toFileSignal(signal: SchoolSignal, today = new Date()): AthleteFile["signals"][number] | null {
  const next = nextOccurrence(signal, today);
  if (!next) return null;
  return {
    key: `school:${signal.id}`, momentId: null, headline: signal.title,
    explanation: signal.why ?? "Added by your staff.",
    targetDate: next.targetDate, daysUntil: next.daysUntil, verdict: signalVerdict(next.daysUntil),
    priority: 75, confidence: 1, sources: signal.sources.length,
    type: SUBJECT[signal.kind], years: signal.recurrence === "yearly" && next.years > 0 ? next.years : null,
    evidence: signal.sources.map((source) => ({ label: source.label, url: source.url, note: "Added by your staff." })),
  };
}

/** Puts each player's soonest school signal into the roster's "next" when it comes first. */
export function mergeSchoolSignals(roster: PilotRoster, signals: readonly SchoolSignal[], today = new Date()): PilotRoster {
  if (!signals.length) return roster;
  const players = roster.players.map((player) => {
    const own = signals.filter((row) => row.playerId === player.id).flatMap((row) => toFileSignal(row, today) ?? []).sort((a, b) => a.daysUntil - b.daysUntil);
    const soonest = own[0];
    if (!soonest) return player;
    const next = player.next && player.next.daysUntil <= soonest.daysUntil ? player.next
      : { headline: soonest.headline, targetDate: soonest.targetDate, daysUntil: soonest.daysUntil, verdict: soonest.verdict };
    return { ...player, next, signalCount: player.signalCount + own.length };
  });
  return { ...roster, players };
}
