import { z } from "zod";

const nonempty = z.string().trim().min(1).max(500);
const scope = z.string().regex(/^[a-z0-9][a-z0-9._-]*$/);

/** Locators are evidence references, never authenticated request URLs. */
export function isSafeSourceLocator(value: string): boolean {
  if (/[?#\\\s]/.test(value)) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

const locator = nonempty.refine(isSafeSourceLocator, "unsafe_source_locator");
const secretKey = /^(?:api[_-]?key|authorization|cookie|password|secret|(?:access|refresh)[_-]?token|credentials)$/i;

/** Reject transport secrets before a raw response is accepted for persistence. */
function hasUnsafeTransportData(value: unknown): boolean {
  if (typeof value === "string") {
    return /(?:bearer\s+\S+|[?&](?:api[_-]?key|token|secret|signature)=)/i.test(value)
      || (/^https?:\/\//i.test(value) && !isSafeSourceLocator(value));
  }
  if (Array.isArray(value)) return value.some(hasUnsafeTransportData);
  if (value && typeof value === "object") {
    return Object.entries(value).some(([key, item]) => secretKey.test(key) || hasUnsafeTransportData(item));
  }
  return false;
}

export const RawEnvelopeSchema = z.object({
  provider: scope,
  sport: scope,
  league: scope,
  // Distinguishes multiple identifier systems in the same provider/league.
  namespace: scope,
  externalId: nonempty,
  sourceId: z.string().uuid().optional(),
  locator,
  fetchedAt: z.iso.datetime({ offset: true }),
  normalizerVersion: nonempty,
  payload: z.json().refine(value => !hasUnsafeTransportData(value), "unsafe_raw_transport_data"),
}).strict();
export type RawEnvelope = z.infer<typeof RawEnvelopeSchema>;

export const CandidateEvidenceSchema = z.object({
  field: z.enum(["fullName", "dob", "school", "team"]),
  // JSON Pointer into the immutable fetched payload, rather than synthesized prose.
  path: z.string().regex(/^\/(?:[^~]|~[01])*$/),
  observedValue: nonempty,
}).strict();

export const AthleteCandidateSchema = RawEnvelopeSchema.omit({ payload: true }).extend({
  normalizationStatus: z.literal("normalized"),
  fullName: nonempty,
  dob: z.iso.date().optional(),
  school: nonempty.optional(),
  team: nonempty.optional(),
  evidence: z.array(CandidateEvidenceSchema).min(1),
}).strict().refine(candidate => {
  const fields = ["fullName", "dob", "school", "team"] as const;
  return fields.every(field => candidate[field] === undefined
    || candidate.evidence.some(item => item.field === field && item.observedValue === candidate[field]))
    && candidate.evidence.every(item => candidate[item.field] === item.observedValue);
}, "candidate_evidence_mismatch");
export type AthleteCandidate = z.infer<typeof AthleteCandidateSchema>;

/** Pure adapters parse fetched input. Network policy and canonical writes are separate. */
export interface AthleteNormalizer {
  provider: string;
  namespace: string;
  version: string;
  normalize(envelope: RawEnvelope): AthleteCandidate;
}

export const CanonicalAthleteSchema = z.object({
  playerId: z.string().uuid(),
  fullName: nonempty,
  dob: z.iso.date().nullable().optional(),
  school: nonempty.nullable().optional(),
  team: nonempty.nullable().optional(),
});
export type CanonicalAthlete = z.infer<typeof CanonicalAthleteSchema>;

export const VerifiedAthleteMappingSchema = z.object({
  playerId: z.string().uuid(), provider: scope, sport: scope, league: scope,
  namespace: scope, externalId: nonempty,
  status: z.literal("VERIFIED"),
  confidence: z.number().min(0).max(1).nullable(),
  matchMethod: nonempty,
});
export type VerifiedAthleteMapping = z.infer<typeof VerifiedAthleteMappingSchema>;
