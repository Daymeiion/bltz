import { z } from "zod";
import { AthleteCandidateSchema, RawEnvelopeSchema, type AthleteCandidate, type AthleteNormalizer, type RawEnvelope } from "./contracts";

/** Provider-independent field adapter for a fetched identity record. No synthesis. */
export function normalizeAthleteRecord(input: RawEnvelope, fields: {
  fullName: string; dob?: string; school?: string; team?: string;
}): AthleteCandidate {
  const envelope = RawEnvelopeSchema.parse(input);
  function read(pointer: string): unknown {
    if (!/^\/(?:[^~]|~[01])*$/.test(pointer)) throw new Error("invalid_evidence_pointer");
    return pointer.slice(1).split("/").reduce<unknown>((value, key) => {
      const decoded = key.replace(/~1/g, "/").replace(/~0/g, "~");
      if (!value || typeof value !== "object" || !Object.prototype.hasOwnProperty.call(value, decoded)) return undefined;
      return (value as Record<string, unknown>)[decoded];
    }, envelope.payload);
  }
  const values: Record<string, string> = {};
  const evidence: AthleteCandidate["evidence"] = [];
  for (const [field, path] of Object.entries(fields)) {
    if (!path) continue;
    const raw = read(path);
    if (raw === undefined || raw === null || raw === "") continue;
    const value = z.string().trim().min(1).parse(raw);
    values[field] = value;
    evidence.push({ field: field as AthleteCandidate["evidence"][number]["field"], path, observedValue: value });
  }
  const { payload: _payload, ...metadata } = envelope;
  // Deliberately excludes raw payload from normalized candidate/consumer results.
  return AthleteCandidateSchema.parse({ ...metadata, ...values, normalizationStatus: "normalized", evidence });
}

/** Existing profile shape is adapter input; provider IDs never become BLTZ IDs. */
export const sportradarProfileNormalizer: AthleteNormalizer = {
  provider: "sportradar", namespace: "league-profile", version: "1",
  normalize(input) {
    const envelope = RawEnvelopeSchema.parse(input);
    if (envelope.provider !== this.provider || envelope.namespace !== this.namespace
      || envelope.normalizerVersion !== this.version) throw new Error("normalizer_contract_mismatch");
    const payload = z.object({ id: z.string().min(1) }).parse(envelope.payload);
    if (payload.id !== envelope.externalId) throw new Error("provider_identity_conflict");
    return normalizeAthleteRecord(envelope, { fullName: "/name", dob: "/birth_date", school: "/college" });
  },
};
