import { describe, expect, it } from "vitest";
import type { GraphMoment } from "@/lib/intelligence/contracts";
import { evaluateGraphIntelligence, signalFactsFromGraph } from "@/lib/intelligence/signals/graph";

// Synthetic adapter fixture. No live BLTZ athlete or event facts are asserted.
const playerId = "10000000-0000-4000-8000-000000000001";
const asOf = "2026-09-30T00:00:00Z";
function moment(): GraphMoment {
  const id = "20000000-0000-4000-8000-000000000001";
  return {
    id, title: "Synthetic sourced moment", occurredOn: "2006-10-10", occurredYear: null,
    datePrecision: "day", sport: "test", eventId: null, status: "verified", confidence: 0.95,
    athletes: [{ athleteId: playerId, relationshipType: "participant", status: "verified", confidence: 0.8 }],
    evidence: [{ id: "30000000-0000-4000-8000-000000000001", athleteId: playerId, momentId: id,
      factType: "moment_occurrence", statement: "Synthetic reviewed participation on October 10, 2006.",
      data: { occurredOn: "2006-10-10" }, status: "verified", confidence: 0.9, ingestionId: null,
      source: { id: "40000000-0000-4000-8000-000000000001", name: "Synthetic archive", provider: "test",
        locator: "https://example.test/moment", fetchedAt: "2026-09-01T00:00:00Z" } }],
  };
}
const evaluate = (input: GraphMoment) => evaluateGraphIntelligence([input], playerId, { asOf });

describe("canonical graph signal adapter", () => {
  it("preserves the shared GraphMoment evidence and association confidence", () => {
    expect(evaluate(moment()).signals[0]).toMatchObject({ playerId, confidence: 0.8 });
  });

  it("does not assign a moment to an athlete without its explicit relationship", () => {
    const input = moment(); input.athletes = [];
    expect(evaluate(input).signals).toEqual([]);
  });

  it("consolidates multiple reviewed athlete roles into one signal using minimum confidence", () => {
    const input = moment();
    input.athletes.push({ athleteId: playerId, relationshipType: "contributor", status: "verified", confidence: 0.7 });
    const result = evaluate(input);
    expect(result.signals).toHaveLength(1);
    expect(result.opportunities).toHaveLength(1);
    expect(result.signals[0].confidence).toBe(0.7);
    expect(result.skipped).toEqual([]);
  });

  it("does not invalidate verified participation when another role is candidate or rejected", () => {
    const input = moment();
    input.athletes.push({ athleteId: playerId, relationshipType: "contributor", status: "candidate", confidence: 0.2 });
    input.athletes.push({ athleteId: playerId, relationshipType: "featured", status: "rejected", confidence: 0.1 });
    expect(evaluate(input).signals).toHaveLength(1);
    expect(evaluate(input).signals[0].confidence).toBe(0.8);
  });

  it("rejects candidate relationships and date conflicts", () => {
    const input = moment(); input.athletes[0].status = "candidate";
    expect(evaluate(input).signals).toEqual([]);
    input.athletes[0].status = "verified";
    input.evidence.push({ ...input.evidence[0], id: "30000000-0000-4000-8000-000000000002", data: { occurredOn: "2006-10-11" } });
    expect(evaluate(input).signals).toEqual([]);
  });

  it("rejects provenance without canonical source identity or fetched timestamp", () => {
    const input = moment(); input.evidence[0].source.id = null;
    expect(evaluate(input).signals).toEqual([]);
    input.evidence[0].source.id = "40000000-0000-4000-8000-000000000001";
    input.evidence[0].source.fetchedAt = null;
    expect(evaluate(input).signals).toEqual([]);
  });

  it("requires retrieved source locators but permits identified reviewed manual evidence", () => {
    const input = moment(); input.evidence[0].source.locator = null;
    expect(evaluate(input).signals).toEqual([]);
    input.evidence[0].source.provider = "manual";
    expect(evaluate(input).signals).toHaveLength(1);
  });

  it("cannot use identity-only provenance or evidence for a different athlete", () => {
    const input = moment(); input.evidence[0].factType = "identity";
    expect(evaluate(input).signals).toEqual([]);
    input.evidence[0].factType = "moment_occurrence";
    input.evidence[0].athleteId = "10000000-0000-4000-8000-000000000002";
    expect(evaluate(input).signals).toEqual([]);
  });

  it("does not promote candidate, rejected, or unknown-confidence source facts", () => {
    const input = moment(); input.evidence[0].status = "candidate";
    expect(evaluate(input).signals).toEqual([]);
    input.evidence[0].status = "verified"; input.evidence[0].confidence = null;
    expect(evaluate(input).signals).toEqual([]);
  });

  it("reads an explicit milestone assertion and suppresses ambiguous milestone selection", () => {
    const input = moment(); input.occurredOn = "2026-09-20";
    input.evidence[0].data.occurredOn = input.occurredOn;
    input.evidence[0].statement = "Synthetic reviewed participation on September 20, 2026.";
    input.evidence.push({ ...input.evidence[0], id: "30000000-0000-4000-8000-000000000002", factType: "career_milestone",
      statement: "Synthetic reviewed cumulative career points reached 1000 on this date.",
      data: { label: "Synthetic milestone", statistic: "career_points", value: 1000, threshold: 1000, unit: "points" } });
    expect(evaluate(input).signals[0].type).toBe("career_milestone");
    input.evidence.push({ ...input.evidence[1], id: "30000000-0000-4000-8000-000000000003" });
    expect(signalFactsFromGraph([input], playerId)[0].milestone).toBeUndefined();
    expect(evaluate(input).signals).toEqual([]);
  });
});
