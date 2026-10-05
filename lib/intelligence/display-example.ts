import { evaluateIntelligenceSignals } from "./signals";

/** Isolated display fixture requested by the founder. Never persisted or used by live evaluation. */
export function intelligenceDisplayExample() {
  const athlete = { name: "Maya Bennett", label: "Fictional athlete", affiliation: "Illustrative university · 2003–2006", sport: "Basketball" };
  const moment = { title: "Conference championship performance", occurredOn: "2006-10-13", summary: "An illustrative archive record establishes the date, athlete participation and performance context." };
  const evaluation = evaluateIntelligenceSignals([{
    playerId: "00000000-0000-4000-8000-000000000101", momentId: "00000000-0000-4000-8000-000000000102",
    title: moment.title, occurredOn: moment.occurredOn, datePrecision: "day", verificationStatus: "verified", confidence: 0.92,
    evidence: [{ id: "00000000-0000-4000-8000-000000000103", sourceId: "00000000-0000-4000-8000-000000000104", sourceLabel: "Illustrative university archive", sourceProvider: "manual", sourceLocator: null, sourceUrl: null, fetchedAt: "2026-09-29T12:00:00.000Z", assertion: "Illustrative record: Maya Bennett participated in the championship performance on October 13, 2006.", confidence: 0.92 }],
  }], { asOf: "2026-09-30T23:59:59.999Z", anniversaryWindowDays: 30 });
  return { displayOnly: true as const, athlete, moment, evaluation };
}
