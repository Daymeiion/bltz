import { describe, expect, it } from "vitest";
import { RawEnvelopeSchema, isSafeSourceLocator, type RawEnvelope } from "@/lib/intelligence/ingestion/contracts";
import { normalizeAthleteRecord, sportradarProfileNormalizer } from "@/lib/intelligence/ingestion/normalize";
import { resolveAthleteCandidate } from "@/lib/intelligence/ingestion/resolve";
import { candidateSourceReference, legacyVerifiedMapping } from "@/lib/intelligence/ingestion/mapping";

// Public identity fields observed by read-only DB audit on 2026-09-30.
// Only the small identity subset is a fixture; tests never access a live database.
const athlete = { playerId: "c5dae871-a277-4256-9a0c-17a40940ad3f", fullName: "Keith Rivers", dob: "1986-05-05", school: "USC", team: "BUF" };
const envelope: RawEnvelope = {
  provider: "sportradar", sport: "football", league: "nfl", namespace: "league-profile",
  externalId: "d2c5d2fa-dd75-444e-b8e0-63c31a3791be",
  locator: "/nfl/official/trial/v7/en/players/d2c5d2fa-dd75-444e-b8e0-63c31a3791be/profile.json",
  fetchedAt: "2026-09-18T20:29:20.256+00:00", normalizerVersion: "1",
  payload: { id: "d2c5d2fa-dd75-444e-b8e0-63c31a3791be", name: "Keith Rivers", birth_date: "1986-05-05", college: "USC" },
};
const mapping = legacyVerifiedMapping({
  player_id: athlete.playerId, provider: "sportradar", sport: "football", league: "nfl",
  provider_player_id: envelope.externalId, status: "VERIFIED", match_confidence: null, match_method: "manual_review",
});
const candidate = () => sportradarProfileNormalizer.normalize(envelope);

describe("provider-independent ingestion safety", () => {
  it("retains source, fetch time and per-field raw pointers without leaking raw data", () => {
    const value = candidate();
    expect(value.fullName).toBe("Keith Rivers");
    expect(value.evidence).toContainEqual({ field: "dob", path: "/birth_date", observedValue: "1986-05-05" });
    expect(value).not.toHaveProperty("payload");
    expect(candidateSourceReference(value)).toEqual({ id: null, name: "sportradar football/nfl", provider: "sportradar", locator: envelope.locator, fetchedAt: envelope.fetchedAt });
  });
  it("supports another sport/provider with explicit field mapping", () => {
    const value = normalizeAthleteRecord({ ...envelope, provider: "archive", sport: "basketball", league: "college", externalId: "record:42", namespace: "archive-roster", payload: { athlete: { display_name: "Keith Rivers" } } }, { fullName: "/athlete/display_name" });
    expect(value.provider).toBe("archive");
    expect(value.dob).toBeUndefined();
    expect(value.evidence[0].path).toBe("/athlete/display_name");
  });
  it("decodes JSON Pointer property names without reading inherited properties", () => {
    const value = normalizeAthleteRecord({ ...envelope, payload: { "display/name": "Keith Rivers" } }, { fullName: "/display~1name" });
    expect(value.fullName).toBe("Keith Rivers");
    expect(() => normalizeAthleteRecord({ ...envelope, payload: {} }, { fullName: "/constructor" })).toThrow();
  });
  it.each([
    "https://api.example.com/player?api_key=credential", "https://api.example.com/player?limit=1",
    "https://user:password@api.example.com/player", "http://api.example.com/player",
    "//evil.example/player", "/player#credential", "https://api.example.com\\player",
  ])("rejects unsafe evidence locator %s", locator => {
    expect(isSafeSourceLocator(locator)).toBe(false);
    expect(() => RawEnvelopeSchema.parse({ ...envelope, locator })).toThrow();
  });
  it.each([
    { api_key: "credential" }, { nested: { Authorization: "credential" } },
    { url: "https://api.example.com/feed?token=credential" }, { text: "Bearer credential" },
  ])("rejects secret-bearing fetched transport data", payload => {
    expect(() => RawEnvelopeSchema.parse({ ...envelope, payload })).toThrow();
  });
  it("rejects wrong provider ID, normalizer version and invalid dates", () => {
    expect(() => sportradarProfileNormalizer.normalize({ ...envelope, externalId: "wrong" })).toThrow("provider_identity_conflict");
    expect(() => sportradarProfileNormalizer.normalize({ ...envelope, normalizerVersion: "2" })).toThrow("normalizer_contract_mismatch");
    expect(() => sportradarProfileNormalizer.normalize({ ...envelope, payload: { ...envelope.payload as object, birth_date: "1986-02-30" } })).toThrow();
  });
});

describe("canonical identity resolution", () => {
  it("reuses an existing verified mapping; unknown confidence remains unknown", () => {
    expect(resolveAthleteCandidate(candidate(), [athlete], [mapping])).toMatchObject({ status: "matched", playerId: athlete.playerId, confidence: null, matchMethod: "manual_review" });
  });
  it("requires review even when name, DOB and school all match", () => {
    expect(resolveAthleteCandidate(candidate(), [athlete], [])).toMatchObject({ status: "needs_review", playerId: null, confidence: null });
  });
  it("never silently picks between homonymous athletes", () => {
    const another = { ...athlete, playerId: "308ab807-9748-4cdd-b0ea-771ff8001ca1", dob: null, school: "Other" };
    const result = resolveAthleteCandidate(candidate(), [athlete, another], []);
    expect(result.status).toBe("ambiguous");
    expect(result.playerId).toBeNull();
    expect(result.options).toHaveLength(2);
  });
  it.each(["provider", "sport", "league", "namespace", "externalId"] as const)("keeps mappings scoped by %s", field => {
    const result = resolveAthleteCandidate(candidate(), [athlete], [{ ...mapping, [field]: "different" }]);
    expect(result.status).toBe("needs_review");
    expect(result.playerId).toBeNull();
  });
  it("blocks conflicting duplicate mappings, missing mapped athlete and mismatching DOB", () => {
    expect(resolveAthleteCandidate(candidate(), [athlete], [mapping, mapping]).status).toBe("conflict");
    expect(resolveAthleteCandidate(candidate(), [], [mapping]).status).toBe("conflict");
    expect(resolveAthleteCandidate(candidate(), [{ ...athlete, dob: "1987-05-05" }], [mapping]).status).toBe("conflict");
  });
  it("does not select a conflicting DOB as a name candidate", () => {
    expect(resolveAthleteCandidate(candidate(), [{ ...athlete, dob: "1987-05-05" }], []).status).toBe("unmatched");
  });
  it("does not treat legacy unverified mappings as verified", () => {
    expect(() => legacyVerifiedMapping({ player_id: athlete.playerId, provider: "sportradar", sport: "football", league: "nfl", provider_player_id: envelope.externalId, status: "CANDIDATE", match_confidence: 0.99, match_method: "name_only" })).toThrow();
  });
  it("returns unmatched instead of creating an athlete", () => {
    expect(resolveAthleteCandidate(candidate(), [], [])).toMatchObject({ status: "unmatched", playerId: null, options: [] });
  });
});
