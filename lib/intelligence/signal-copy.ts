import type { AthleteBirthdayFact, IntelligenceSignal, SignalVerdict } from "./signals/types";

/** Every Lab surface evaluates the same lookahead, so each dated fact always has a next occurrence. */
export const LAB_LOOKAHEAD_DAYS = 366;

export const VERDICT_LABEL: Record<SignalVerdict, string> = {
  act_now: "Act now", prepare: "Prepare", plan: "Plan", upcoming: "Upcoming",
};

/** What to do, by when: one instruction per verdict. */
export const VERDICT_ACTION: Record<SignalVerdict, string> = {
  act_now: "Post or send this week.",
  prepare: "Draft and line up media now.",
  plan: "Add it to the content calendar.",
  upcoming: "Nothing to do yet.",
};

export function whenLabel(daysUntil: number): string {
  if (daysUntil < 0) return `${-daysUntil} day${daysUntil === -1 ? "" : "s"} ago`;
  return daysUntil === 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : `In ${daysUntil} days`;
}

/** Short, decisive headline built only from the signal's own recorded data. */
export function signalHeadline(signal: Pick<IntelligenceSignal, "type" | "data">): string {
  const data = signal.data;
  const years = typeof data.anniversaryYears === "number" ? data.anniversaryYears : null;
  const label = typeof data.milestoneLabel === "string" ? data.milestoneLabel : null;
  if (signal.type === "birthday" && typeof data.age === "number") return `Turns ${data.age}`;
  if (label && years) return `${years} years since ${label}`;
  if (signal.type === "career_milestone") return "Career milestone reached";
  return years ? `${years}-year game anniversary` : "Career anniversary";
}

/** Admin-reviewed preview DOB → birthday rule input. The Locker record itself is the evidence. */
export function birthdayFromPreview(preview: { id: string; dob: string | null; updated_at: string }, playerId: string): AthleteBirthdayFact | null {
  if (!preview.dob) return null;
  return { playerId, dob: preview.dob, evidence: [{
    id: preview.id, sourceId: preview.id, sourceLabel: "Preview Locker (admin-reviewed date of birth)", sourceProvider: "manual",
    sourceLocator: null, sourceUrl: null, fetchedAt: preview.updated_at, assertion: `Date of birth: ${preview.dob}.`, confidence: 1,
  }] };
}
