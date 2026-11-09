import { z } from "zod";

/** A signal or Moment the school hid from its own workspace. */
export type Dismissal = {
  id: string;
  playerId: string | null;
  targetType: "signal" | "moment";
  targetKey: string;
  scope: "this_year" | "always";
  label: string | null;
  reason: string | null;
  createdAt: string;
};

export const MOMENT_REASONS = ["Not our player's moment", "Wrong date", "Not something we would feature"] as const;

export const dismissalInput = z.object({
  playerId: z.string().uuid().nullable(),
  targetType: z.enum(["signal", "moment"]),
  targetKey: z.string().min(1).max(300),
  scope: z.enum(["this_year", "always"]).default("always"),
  label: z.string().trim().max(200).nullish(),
  reason: z.string().trim().max(300).nullish(),
}).strict();
export type DismissalInput = z.infer<typeof dismissalInput>;

/** A signal key without its date, so "always" covers the same occasion every year. */
export function stableSignalKey(key: string): string {
  return key.replace(/:\d{4}-\d{2}-\d{2}$/, "");
}

/** The key to store for a signal dismissal of the given scope. */
export function dismissalKey(signalKey: string, scope: "this_year" | "always"): string {
  return scope === "always" ? stableSignalKey(signalKey) : signalKey;
}

/** A signal is hidden when it, its occasion, or the Moment it comes from was dismissed. */
export function isSignalDismissed(signal: { key: string; momentId: string | null }, dismissals: readonly Dismissal[]): Dismissal | null {
  return dismissals.find((row) => (row.targetType === "signal" && (row.targetKey === signal.key || row.targetKey === stableSignalKey(signal.key)))
    || (row.targetType === "moment" && signal.momentId !== null && row.targetKey === signal.momentId)) ?? null;
}

export function isMomentDismissed(momentId: string, dismissals: readonly Dismissal[]): Dismissal | null {
  return dismissals.find((row) => row.targetType === "moment" && row.targetKey === momentId) ?? null;
}
