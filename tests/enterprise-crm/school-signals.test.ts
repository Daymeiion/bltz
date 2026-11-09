// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { mergeSchoolSignals, nextOccurrence, schoolSignalInput, toFileSignal, type SchoolSignal } from "@/lib/enterprise-crm/pilot/school-signals-shared";
import { settleDraft, type DraftContext } from "@/lib/enterprise-crm/pilot/signal-ai";
import { previewDraft } from "@/components/organization/pilot/AddSignal";
import { previewRoster } from "@/components/organization/pilot/preview-data";

const TODAY = new Date("2026-11-09T12:00:00Z");
const PLAYER = "33333333-3333-4333-8333-333333333333";
const signal = (values: Partial<SchoolSignal>): SchoolSignal => ({
  id: "44444444-4444-4444-8444-444444444444", playerId: PLAYER, title: "20 years since the Big Game pick", kind: "anniversary",
  targetDate: "2006-11-18", recurrence: "yearly", why: null, sources: [], origin: "ai", createdAt: "2026-11-09T00:00:00Z", ...values,
});

describe("when a school signal comes around", () => {
  it("repeats yearly and counts the years", () => {
    expect(nextOccurrence(signal({}), TODAY)).toEqual({ targetDate: "2026-11-18", daysUntil: 9, years: 20 });
    expect(nextOccurrence(signal({ targetDate: "2001-03-01" }), TODAY)).toEqual({ targetDate: "2027-03-01", daysUntil: 112, years: 26 });
  });

  it("puts Feb 29 birthdays on Feb 28 in other years", () => {
    expect(nextOccurrence(signal({ targetDate: "1988-02-29", kind: "birthday" }), TODAY)?.targetDate).toBe("2027-02-28");
  });

  it("counts a one-time date only while it is ahead", () => {
    expect(nextOccurrence(signal({ targetDate: "2026-12-01", recurrence: "once" }), TODAY)?.daysUntil).toBe(22);
    expect(nextOccurrence(signal({ targetDate: "2026-10-01", recurrence: "once" }), TODAY)).toBeNull();
  });

  it("becomes an engine-shaped signal that lists, suggests and plans like the others", () => {
    expect(toFileSignal(signal({ sources: [{ label: "Cal box score", url: "https://calbears.com/x" }] }), TODAY)).toMatchObject({
      key: "school:44444444-4444-4444-8444-444444444444", headline: "20 years since the Big Game pick", verdict: "prepare", daysUntil: 9,
      type: "anniversary", years: 20, sources: 1, evidence: [{ label: "Cal box score", url: "https://calbears.com/x" }],
    });
  });

  it("moves into the roster's next date when it comes first", () => {
    const roster = { state: "ready" as const, players: [{ ...previewRoster.players[4], id: PLAYER }] };
    const merged = mergeSchoolSignals(roster, [signal({})], TODAY).players[0];
    expect(merged.next?.headline).toBe("20 years since the Big Game pick");
    expect(merged.signalCount).toBe(roster.players[0].signalCount + 1);
  });

  it("rejects bad dates and non-https sources", () => {
    const base = { playerId: null, title: "Reunion", kind: "event", targetDate: "2026-12-01", recurrence: "once" };
    expect(schoolSignalInput.safeParse(base).success).toBe(true);
    expect(schoolSignalInput.safeParse({ ...base, targetDate: "2026-02-30" }).success).toBe(false);
    expect(schoolSignalInput.safeParse({ ...base, sources: [{ label: "x", url: "http://x.com" }] }).success).toBe(false);
  });
});

describe("settling an AI draft", () => {
  const context: DraftContext = {
    request: "Dante's pick in the 2006 Big Game, November 18, 2006", schoolName: "Cal Athletics", today: "2026-11-09",
    roster: [{ id: PLAYER, name: "Dante Hughes", position: "CB", team: "Cal" }],
    existing: [{ key: "next:" + PLAYER, playerId: PLAYER, headline: "20 years since his Lott IMPACT Trophy season", targetDate: "2026-11-28" }],
    moments: [], sources: [{ id: "web:0", title: "Big Game recap", url: "https://calbears.com/recap", detail: null }, { id: "web:1", title: "Old link", url: "http://insecure.example", detail: null }],
  };

  it("keeps only the roster player, known signals and sources it was given", () => {
    const result = settleDraft({
      playerId: PLAYER,
      matches: [{ key: "next:" + PLAYER, reason: "Same season" }, { key: "made-up", reason: "x" }],
      draft: { title: "20 years since the Big Game pick", kind: "anniversary", targetDate: "2006-11-18", recurrence: "yearly", why: "Recap confirms it.", sourceIds: ["web:0", "web:1", "web:9"] },
      question: null,
    }, context);
    expect(result.draft).toEqual({ playerId: PLAYER, title: "20 years since the Big Game pick", kind: "anniversary", targetDate: "2006-11-18", recurrence: "yearly", why: "Recap confirms it.", sources: [{ label: "Big Game recap", url: "https://calbears.com/recap" }] });
    expect(result.matches).toEqual([{ key: "next:" + PLAYER, reason: "Same season" }]);
  });

  it("drops an invented player or an impossible date and asks instead", () => {
    const result = settleDraft({ playerId: "not-on-roster", matches: [], draft: { title: "Big Game", kind: "anniversary", targetDate: "2006-02-30", recurrence: "yearly", why: "", sourceIds: [] }, question: null }, context);
    expect(result.draft).toBeNull();
    expect(result.question).toBe("What date should this signal use?");
  });
});

describe("template drafting", () => {
  it("reads a written date and the player's name, and asks when there is no date", () => {
    const players = previewRoster.players;
    const ok = previewDraft("Marcus Hale's first touchdown, November 4, 2016", players, null);
    expect(ok.draft).toMatchObject({ playerId: "p1", targetDate: "2016-11-04", recurrence: "yearly" });
    expect(previewDraft("Marcus scored a lot", players, null)).toMatchObject({ draft: null });
  });
});
