import { describe, expect, it } from "vitest";
import { evaluateIntelligenceSignals } from "@/lib/intelligence/signals/evaluate";
import type { SignalMomentFact } from "@/lib/intelligence/signals/types";

// Explicit synthetic rule fixtures. These UUIDs and career facts are not live BLTZ records.
const fixture = (patch: Partial<SignalMomentFact> = {}): SignalMomentFact => ({
  playerId: "10000000-0000-4000-8000-000000000001",
  momentId: "20000000-0000-4000-8000-000000000001",
  title: "Synthetic historical performance",
  occurredOn: "2006-10-10", datePrecision: "day", verificationStatus: "verified", confidence: 0.9,
  evidence: [{
    id: "30000000-0000-4000-8000-000000000001", sourceId: "40000000-0000-4000-8000-000000000001",
    sourceLabel: "Synthetic test archive", sourceProvider: "test", sourceLocator: "https://example.test/archive/1", sourceUrl: "https://example.test/archive/1",
    fetchedAt: "2026-09-01T00:00:00Z", assertion: "Synthetic athlete participated in the historical performance on 2006-10-10.", confidence: 0.85,
  }], ...patch,
});
const asOf = "2026-09-30T12:00:00Z";
const evaluate = (facts = [fixture()], at = asOf) => evaluateIntelligenceSignals(facts, { asOf: at });

describe("deterministic intelligence signals", () => {
  it("preserves athlete → moment → signal → opportunity and sourced explanation", () => {
    const result = evaluate();
    const signal = result.signals[0];
    expect(signal).toMatchObject({ type: "historical_anniversary", score: 87, confidence: 0.85,
      targetDate: "2026-10-10", ruleVersion: "v1", data: { anniversaryYears: 20, daysUntil: 10 }, status: "candidate" });
    expect(signal.explanation).toContain("20-year anniversary");
    expect(signal.explanation).toContain("87/100");
    expect(signal.scoreScale).toContain("not probability");
    expect(signal.evidence[0].assertion).toContain("2006-10-10");
    expect(signal.sourceEntities).toContainEqual({ type: "source", id: fixture().evidence[0].sourceId });
    expect(result.opportunities[0]).toMatchObject({ momentId: signal.momentId, playerId: signal.playerId,
      signalKeys: [signal.key], strength: signal.score, confidence: signal.confidence });
    expect(result.opportunities[0].explanation).toContain("rights");
  });

  it("is reproducible and creates stable identities across evaluations in a window", () => {
    expect(evaluate()).toEqual(evaluate());
    expect(evaluate(undefined, "2026-10-01T12:00:00Z").signals[0].key).toBe(evaluate().signals[0].key);
    expect(evaluate().signals[0].detectedAt).toBe("2026-09-30T12:00:00.000Z");
  });

  it.each([
    ["candidate", { verificationStatus: "candidate" }],
    ["rejected", { verificationStatus: "rejected" }],
    ["year-only", { datePrecision: "year" }],
    ["unknown date", { occurredOn: null }],
    ["impossible date", { occurredOn: "2006-02-30" }],
    ["future moment", { occurredOn: "2026-10-10" }],
    ["no evidence", { evidence: [] }],
    ["invalid confidence", { confidence: Number.NaN }],
    ["provider ID as athlete ID", { playerId: "sportradar-person-1" }],
  ] as Array<[string, Partial<SignalMomentFact>]>) ("does not generate from %s", (_label, patch) => {
    expect(evaluate([fixture(patch)]).signals).toEqual([]);
    expect(evaluate([fixture(patch)]).opportunities).toEqual([]);
    expect(evaluate([fixture(patch)]).skipped).toHaveLength(1);
  });

  it("rejects evidence not known by asOf or lacking a usable assertion", () => {
    const fact = fixture();
    fact.evidence[0].fetchedAt = "2026-10-01T00:00:00Z";
    expect(evaluate([fact]).skipped[0].reason).toBe("missing_invalid_or_future_evidence");
    fact.evidence[0].fetchedAt = "2026-09-01T00:00:00Z";
    fact.evidence[0].assertion = " ";
    expect(evaluate([fact]).signals).toEqual([]);
  });

  it("does not infer an anniversary from a birth date or account creation", () => {
    // Daymeion Hughes is a name already used by repository pipeline tests. No career
    // date is assigned here: the repository name alone establishes no dated Moment.
    expect(evaluate([fixture({ title: "Daymeion Hughes: career evidence not supplied", occurredOn: null })]).signals).toEqual([]);
  });

  it("handles a next-year anniversary and its new stable identity", () => {
    const fact = fixture({ occurredOn: "2007-01-02" });
    expect(evaluate([fact], "2026-12-31T00:00:00Z").signals[0]).toMatchObject({ targetDate: "2027-01-02", data: { anniversaryYears: 20, daysUntil: 2 } });
    expect(evaluate([fact], "2027-12-31T00:00:00Z").signals[0].key)
      .not.toBe(evaluate([fact], "2026-12-31T00:00:00Z").signals[0].key);
  });

  it("uses explicit UTC calendar days across timezones", () => {
    expect(evaluate([fixture()], "2026-09-30T23:30:00-07:00").signals[0].data.daysUntil).toBe(9);
  });

  it("handles leap-day anniversaries without inventing February 28 dates", () => {
    const fact = fixture({ occurredOn: "2004-02-29" });
    fact.evidence[0].fetchedAt = "2026-01-01T00:00:00Z";
    expect(evaluate([fact], "2027-02-28T00:00:00Z").signals).toEqual([]);
    expect(evaluate([fact], "2028-02-29T00:00:00Z").signals[0]).toMatchObject({ targetDate: "2028-02-29", data: { anniversaryYears: 24 } });
  });

  it("includes same-day anniversaries and excludes just-outside windows", () => {
    expect(evaluateIntelligenceSignals([fixture()], { asOf: "2026-10-10T00:00:00Z", anniversaryWindowDays: 0 }).signals[0].score).toBe(100);
    expect(evaluateIntelligenceSignals([fixture()], { asOf, anniversaryWindowDays: 9 }).signals).toEqual([]);
    expect(evaluateIntelligenceSignals([fixture()], { asOf, anniversaryWindowDays: 10 }).signals).toHaveLength(1);
  });

  it("does not silently choose conflicting duplicate moments", () => {
    const result = evaluate([fixture(), fixture({ occurredOn: "2006-10-11" })]);
    expect(result.signals).toEqual([]);
    expect(result.skipped[0].reason).toBe("duplicate_moment_facts_require_resolution");
  });

  it("supports multiple athletes connected to the same moment without merging them", () => {
    const result = evaluate([fixture(), fixture({ playerId: "10000000-0000-4000-8000-000000000002" })]);
    expect(result.signals).toHaveLength(2);
    expect(new Set(result.signals.map(s => s.key)).size).toBe(2);
    expect(result.signals[0].momentId).toBe(result.signals[1].momentId);
  });

  it("emits a career milestone only from a reviewed explicit threshold assertion", () => {
    const fact = fixture({ occurredOn: "2026-09-25" });
    fact.milestone = { label: "Synthetic career milestone", statistic: "career_points", value: 1020,
      threshold: 1000, unit: "points", verificationStatus: "verified", evidence: fact.evidence };
    const result = evaluate([fact]);
    expect(result.signals[0]).toMatchObject({ type: "career_milestone", score: 70, targetDate: "2026-09-25",
      data: { value: 1020, threshold: 1000, ageDays: 5 } });
    expect(result.signals[0].explanation).toContain("does not infer a first crossing");
    expect(result.opportunities[0].type).toBe("career_milestone_review");
    fact.milestone.value = 999;
    expect(evaluate([fact]).signals).toEqual([]);
    fact.milestone.value = 1020;
    fact.milestone.verificationStatus = "candidate";
    expect(evaluate([fact]).signals).toEqual([]);
  });

  it("does not label high season totals as a career milestone without explicit facts", () => {
    expect(evaluate([fixture({ occurredOn: "2026-09-25" })]).signals).toEqual([]);
  });

  it("expires milestone signals outside the configured recency window", () => {
    const fact = fixture({ occurredOn: "2026-08-29" });
    fact.milestone = { label: "Synthetic milestone", statistic: "career_points", value: 1000,
      threshold: 1000, unit: "points", verificationStatus: "verified", evidence: fact.evidence };
    expect(evaluate([fact]).signals).toEqual([]);
  });

  it.each(["2026-02-30T00:00:00Z", "2026-09-30", "invalid"]) ("rejects invalid asOf %s", invalid => {
    expect(() => evaluate(undefined, invalid)).toThrow(RangeError);
  });

  it.each([-1, 1.5, 367, Number.NaN])("rejects invalid window %s", invalid => {
    expect(() => evaluateIntelligenceSignals([], { asOf, anniversaryWindowDays: invalid })).toThrow(RangeError);
  });

  it("renders empty input as empty intelligence rather than fixture recommendations", () => {
    expect(evaluate([])).toEqual({ asOf: "2026-09-30T12:00:00.000Z", signals: [], opportunities: [], skipped: [] });
  });

  it("preserves inputs and orders equivalent evaluations identically", () => {
    const first = fixture();
    const second = fixture({ playerId: "10000000-0000-4000-8000-000000000002" });
    const before = JSON.stringify([first, second]);
    expect(evaluate([first, second])).toEqual(evaluate([second, first]));
    expect(JSON.stringify([first, second])).toBe(before);
  });

  it("does not silently overwrite conflicting assertions with the same evidence ID", () => {
    const fact = fixture();
    fact.evidence.push({ ...fact.evidence[0], assertion: "Conflicting test assertion" });
    expect(evaluate([fact]).signals).toEqual([]);
  });
});
