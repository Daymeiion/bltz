import { describe, expect, it } from "vitest";
import { evaluateIntelligenceSignals, signalVerdict } from "@/lib/intelligence/signals/evaluate";
import { signalFactsFromGraph } from "@/lib/intelligence/signals/graph";
import type { AthleteBirthdayFact, SignalMomentFact } from "@/lib/intelligence/signals/types";
import type { GraphEvidence, GraphMoment } from "@/lib/intelligence/contracts";
import { birthdayFromPreview, signalHeadline, whenLabel } from "@/lib/intelligence/signal-copy";

// Synthetic rule fixtures; these UUIDs and dates are not live BLTZ records.
const PLAYER = "10000000-0000-4000-8000-000000000001";
const MOMENT = "20000000-0000-4000-8000-000000000001";
const evidence = (id = "30000000-0000-4000-8000-000000000001") => ({
  id, sourceId: "40000000-0000-4000-8000-000000000001", sourceLabel: "Synthetic archive", sourceProvider: "test",
  sourceLocator: "https://example.test/archive/1", sourceUrl: "https://example.test/archive/1",
  fetchedAt: "2026-09-01T00:00:00Z", assertion: "Synthetic recorded game.", confidence: 0.95,
});
const fact = (patch: Partial<SignalMomentFact> = {}): SignalMomentFact => ({
  playerId: PLAYER, momentId: MOMENT, title: "Synthetic game", occurredOn: "2008-10-05", datePrecision: "day",
  verificationStatus: "verified", confidence: 0.95, evidence: [evidence()], ...patch,
});
const birthday = (dob = "1986-10-12", patch: Partial<AthleteBirthdayFact> = {}): AthleteBirthdayFact => ({
  playerId: PLAYER, dob, evidence: [{ ...evidence("50000000-0000-4000-8000-000000000001"), sourceProvider: "manual", sourceLocator: null, sourceUrl: null, assertion: `Date of birth: ${dob}.`, confidence: 1 }], ...patch,
});
const asOf = "2026-10-02T12:00:00Z";

describe("decisive verdicts", () => {
  it.each([[0, "act_now"], [7, "act_now"], [8, "prepare"], [30, "prepare"], [31, "plan"], [90, "plan"], [91, "upcoming"]] as const)("%i days → %s", (days, verdict) => {
    expect(signalVerdict(days)).toBe(verdict);
  });

  it("always surfaces the next occurrence inside a year-long lookahead, once", () => {
    const result = evaluateIntelligenceSignals([fact({ occurredOn: "2008-10-02" })], { asOf, anniversaryWindowDays: 366 });
    expect(result.signals).toHaveLength(1);
    expect(result.signals[0]).toMatchObject({ targetDate: "2026-10-02", daysUntil: 0, verdict: "act_now" });
    const later = evaluateIntelligenceSignals([fact({ occurredOn: "2008-03-01" })], { asOf, anniversaryWindowDays: 366 });
    expect(later.signals[0]).toMatchObject({ targetDate: "2027-03-01", verdict: "upcoming" });
  });

  it("orders the soonest decision first, not the highest score", () => {
    const soon = fact({ momentId: "20000000-0000-4000-8000-000000000002", occurredOn: "2009-10-04" });
    const roundButLater = fact({ occurredOn: "2006-12-20" });
    const result = evaluateIntelligenceSignals([roundButLater, soon], { asOf, anniversaryWindowDays: 366 });
    expect(result.signals.map(signal => signal.targetDate)).toEqual(["2026-10-04", "2026-12-20"]);
  });
});

describe("birthday signals", () => {
  it("names the age, the exact day and a round-age bonus", () => {
    const result = evaluateIntelligenceSignals([], { asOf, birthdays: [birthday("1986-10-12")] });
    expect(result.signals[0]).toMatchObject({ type: "birthday", momentId: null, targetDate: "2026-10-12", daysUntil: 10, verdict: "prepare", data: { age: 40 } });
    expect(result.signals[0].score).toBe(35 + 27 + 20);
    expect(result.signals[0].sourceEntities).not.toContainEqual(expect.objectContaining({ type: "moment" }));
    expect(result.opportunities[0].type).toBe("birthday_greeting_review");
    expect(signalHeadline(result.signals[0])).toBe("Turns 40");
  });

  it.each([
    ["conflicting dates", [birthday("1986-10-12"), birthday("1986-10-13")], "conflicting_birth_dates_require_resolution"],
    ["impossible date", [birthday("1986-02-30")], "exact_birth_date_required"],
    ["future date", [birthday("2027-01-01")], "exact_birth_date_required"],
    ["missing evidence", [birthday("1986-10-12", { evidence: [] })], "missing_invalid_or_future_evidence"],
  ] as const)("skips %s", (_label, facts, reason) => {
    const result = evaluateIntelligenceSignals([], { asOf, birthdays: [...facts] });
    expect(result.signals).toEqual([]);
    expect(result.skipped[0]).toMatchObject({ momentId: null, reason });
  });

  it("evaluates leap-day birthdays only on February 29", () => {
    expect(evaluateIntelligenceSignals([], { asOf: "2027-02-27T00:00:00Z", birthdays: [birthday("1988-02-29")] }).signals).toEqual([]);
    expect(evaluateIntelligenceSignals([], { asOf: "2028-02-27T00:00:00Z", birthdays: [birthday("1988-02-29")] }).signals[0].data.age).toBe(40);
  });

  it("builds birthday input from a reviewed preview Locker only when a DOB exists", () => {
    expect(birthdayFromPreview({ id: MOMENT, dob: null, updated_at: "2026-10-18T00:00:00+00:00" }, PLAYER)).toBeNull();
    const built = birthdayFromPreview({ id: MOMENT, dob: "1986-10-12", updated_at: "2026-09-18T03:05:20.123456+00:00" }, PLAYER)!;
    expect(evaluateIntelligenceSignals([], { asOf, birthdays: [built] }).signals).toHaveLength(1);
  });
});

describe("game milestone anniversaries", () => {
  it("types the anniversary by milestone and adds its bonus", () => {
    const first = fact({ gameMilestone: { kind: "career_first", label: "first NFL interception", statistic: "interceptions", value: 1, league: "nfl" } });
    const signal = evaluateIntelligenceSignals([first], { asOf }).signals[0];
    expect(signal).toMatchObject({ type: "career_first_anniversary", targetDate: "2026-10-05", data: { anniversaryYears: 18, milestoneKind: "career_first", milestoneLabel: "first NFL interception" } });
    expect(signal.score).toBe(40 + 36 + 0 + 10);
    expect(signal.explanation).toContain("first NFL interception");
    expect(signalHeadline(signal)).toBe("18 years since first NFL interception");
    const debut = evaluateIntelligenceSignals([fact({ gameMilestone: { kind: "debut", label: "first NFL game with recorded stats", statistic: null, value: null, league: "nfl" } })], { asOf }).signals[0];
    expect(debut.type).toBe("debut_anniversary");
  });

  it("does not signal an unreviewed imported Moment", () => {
    expect(evaluateIntelligenceSignals([fact({ verificationStatus: "candidate", gameMilestone: { kind: "debut", label: "first NFL game with recorded stats", statistic: null, value: null, league: "nfl" } })], { asOf }).signals).toEqual([]);
  });

  it("maps exactly one reviewed game_milestone row from the graph", () => {
    const row = (id: string, data: Record<string, unknown>, factType = "game_milestone"): GraphEvidence => ({ id, athleteId: PLAYER, momentId: MOMENT, factType, statement: "Synthetic", data, status: "verified", confidence: 0.95, ingestionId: null,
      source: { id: "40000000-0000-4000-8000-000000000001", name: "nflverse", provider: "nflverse", locator: "https://github.com/nflverse/nflverse-data/releases/tag/stats_player", fetchedAt: "2026-09-01T00:00:00Z" } });
    const moment = (rows: GraphEvidence[]): GraphMoment => ({ id: MOMENT, title: "Synthetic game", occurredOn: "2008-10-05", occurredYear: 2008, datePrecision: "day", sport: "football", eventId: null, status: "verified", confidence: 0.95,
      athletes: [{ athleteId: PLAYER, relationshipType: "featured", status: "verified", confidence: 0.95 }],
      evidence: [row("30000000-0000-4000-8000-000000000002", { occurredOn: "2008-10-05" }, "moment_occurrence"), ...rows] });
    const milestone = row("30000000-0000-4000-8000-000000000003", { kind: "career_high", label: "career-high 10 tackles", statistic: "tackles", value: 10, league: "nfl" });
    expect(signalFactsFromGraph([moment([milestone])], PLAYER)[0].gameMilestone).toEqual({ kind: "career_high", label: "career-high 10 tackles", statistic: "tackles", value: 10, league: "nfl" });
    const conflicting = row("30000000-0000-4000-8000-000000000004", { kind: "debut", label: "first NFL game with recorded stats", league: "nfl" });
    expect(signalFactsFromGraph([moment([milestone, conflicting])], PLAYER)[0].gameMilestone).toBeUndefined();
    expect(signalFactsFromGraph([moment([row("30000000-0000-4000-8000-000000000005", { kind: "record", label: "x", league: "nfl" })])], PLAYER)[0].gameMilestone).toBeUndefined();
  });
});

describe("signal copy", () => {
  it.each([[0, "Today"], [1, "Tomorrow"], [12, "In 12 days"], [-3, "3 days ago"]] as const)("%i → %s", (days, label) => {
    expect(whenLabel(days)).toBe(label);
  });
});
