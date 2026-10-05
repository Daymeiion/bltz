import { describe, expect, it } from "vitest";
import type { GraphMoment } from "@/lib/intelligence/contracts";
import { evaluateGraphIntelligence } from "@/lib/intelligence/signals";

// Canonical athlete from the repository/database audit; real reviewed USC facts.
// Moment/source/evidence UUIDs below are synthetic test IDs, not live DB receipts.
const athleteId = "c5dae871-a277-4256-9a0c-17a40940ad3f";
const occurrenceUrl = "https://usctrojans.com/news/2006/10/7/USC_vs_Washington_Quotes_10_7_2006";
const performanceUrl = "https://usctrojans.com/documents/download/2015/4/30/07seniorbiosfb-final.pdf";
function sourcedMoment(): GraphMoment {
  const id = "20000000-0000-4000-8000-000000000003";
  return {
    id, title: "Keith Rivers participates in USC vs. Washington", occurredOn: "2006-10-07", occurredYear: 2006,
    datePrecision: "day", sport: "football", eventId: null, status: "verified", confidence: 0.99,
    athletes: [{ athleteId, relationshipType: "participant", status: "verified", confidence: 0.99 }],
    evidence: [
      { id: "30000000-0000-4000-8000-000000000003", athleteId, momentId: id, factType: "moment_occurrence",
        statement: "USC's dated postgame article identifies its linebacker Keith Rivers discussing his participation in the Washington game on October 7, 2006.",
        data: { occurredOn: "2006-10-07", dateBasis: "described_event", sourcePaths: ["dated title", "USC Linebacker Keith Rivers postgame comments"] },
        status: "verified", confidence: 0.99, ingestionId: null,
        source: { id: "40000000-0000-4000-8000-000000000003", name: "USC Athletics", provider: "usc_athletics", locator: occurrenceUrl, fetchedAt: "2026-10-01T03:55:39Z" } },
      { id: "30000000-0000-4000-8000-000000000004", athleteId, momentId: id, factType: "performance",
        statement: "USC's Keith Rivers senior biography, page 30's 2006 prose, credits 12 tackles, 1 tackle for loss, and 2 deflections against Washington.",
        data: { statistics: { total_tackles: 12, tackles_for_loss: 1, pass_deflections: 2 }, seasonYear: 2006, opponent: "Washington", sourcePaths: ["PDF page30 Keith Rivers 2006 prose"] },
        status: "verified", confidence: 0.99, ingestionId: null,
        source: { id: "40000000-0000-4000-8000-000000000004", name: "USC Athletics", provider: "usc_athletics", locator: performanceUrl, fetchedAt: "2026-10-01T03:55:39Z" } },
    ],
  };
}

describe("Keith Rivers reviewed source proof", () => {
  it("creates a real dated anniversary before October10 without manufacturing a milestone", () => {
    const result = evaluateGraphIntelligence([sourcedMoment()], athleteId, { asOf: "2026-10-01T04:00:00Z" });
    expect(result.signals).toHaveLength(1);
    expect(result.signals[0]).toMatchObject({ type: "historical_anniversary", playerId: athleteId, targetDate: "2026-10-07",
      score: 92, data: { anniversaryYears: 20, daysUntil: 6 } });
    expect(result.signals[0].evidence[0].sourceUrl).toBe(occurrenceUrl);
    expect(result.opportunities[0]).toMatchObject({ type: "anniversary_retrospective_review",
      signalKeys: [result.signals[0].key], momentId: sourcedMoment().id, playerId: athleteId });
    expect(result.signals.some(signal => signal.type === "career_milestone")).toBe(false);
  });

  it("does not backdate actual source capture to obtain a historical demonstration", () => {
    const result = evaluateGraphIntelligence([sourcedMoment()], athleteId, { asOf: "2026-09-30T00:00:00Z" });
    expect(result.signals).toEqual([]);
    expect(result.skipped[0].reason).toBe("missing_invalid_or_future_evidence");
  });

  it("does not let publication-only postcareer content establish a sports occurrence", () => {
    const moment = sourcedMoment();
    moment.evidence = [{ ...moment.evidence[0], factType: "content_item", data: { publishedOn: "2021-11-07", describedEventOn: null } }];
    expect(evaluateGraphIntelligence([moment], athleteId, { asOf: "2026-10-01T04:00:00Z" }).signals).toEqual([]);
  });
});
