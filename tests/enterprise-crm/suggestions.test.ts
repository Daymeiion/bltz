import { describe, expect, it } from "vitest";
import { backingFor, reachHistory, reachLine, signalReasons, suggestActivations, type ReachHistory } from "@/lib/enterprise-crm/pilot/suggestions";
import type { AthleteFile, PilotActivation, PilotAthleteMedia } from "@/lib/enterprise-crm/pilot/types";

type Signal = AthleteFile["signals"][number];

const signal = (values: Partial<Signal>): Signal => ({
  key: "s1", momentId: null, headline: "20 years since his Lott IMPACT Trophy season", explanation: "", targetDate: "2026-11-28",
  daysUntil: 19, verdict: "prepare", priority: 80, confidence: 0.9, sources: 2, type: "anniversary", years: 20, ...values,
});

const activation = (values: Partial<PilotActivation>): PilotActivation => ({
  id: "a", playerId: "p", playerName: null, athletes: [], media: [], kind: "video", title: "", brief: null, signalKey: null, momentId: null, dueOn: null,
  status: "posted", channel: null, postUrl: null, postedAt: null, impressions: null, engagements: null, visits: 0, trackedHref: "/player/x", createdAt: "2026-10-01T00:00:00.000Z", ...values,
});

const media = (kind: PilotAthleteMedia["kind"], reviewStatus: PilotAthleteMedia["reviewStatus"] = "approved"): PilotAthleteMedia => ({
  id: `${kind}-${reviewStatus}`, playerId: "p", launchId: null, kind, title: kind, url: null, description: null, occurredOn: null, reviewStatus,
  createdAt: "2026-10-01T00:00:00.000Z", source: "upload", thumbUrl: null, activationId: null,
});

const empty: ReachHistory = reachHistory([]);
const base = { playerName: "Dante Hughes", momentTitle: null, media: [], hasContact: false, followers: 0, history: empty };

describe("reach estimates", () => {
  it("averages only posted activations of that kind", () => {
    const history = reachHistory([
      activation({ impressions: 40_000, visits: 300 }),
      activation({ impressions: 20_000, visits: 100 }),
      activation({ status: "planned", impressions: 999_999, visits: 999 }),
      activation({ kind: "post", impressions: 5000, visits: 10 }),
    ]);
    expect(history.video).toEqual({ posted: 2, avgReach: 30_000, avgVisits: 200 });
    expect(reachLine("video", history, 0, "Dante")).toBe("Your 2 posted videos averaged 30K reach and 200 Locker visits.");
  });

  it("never invents a number when the school has no history for that kind", () => {
    expect(reachLine("article", empty, 0, "Dante")).toBe("No articles posted yet, so no estimate. This would be your first.");
  });

  it("adds the athlete's followers for posts and videos only", () => {
    expect(reachLine("post", empty, 12_400, "Dante")).toContain("Dante can share it with 12K followers.");
    expect(reachLine("event", empty, 12_400, "Dante")).not.toContain("followers");
  });
});

describe("suggested activations", () => {
  it("offers post, clip and interview for an anniversary, plus an event on round years", () => {
    const ideas = suggestActivations({ ...base, signal: signal({}) });
    expect(ideas.map((idea) => idea.kind)).toEqual(["post", "video", "article", "event"]);
    expect(suggestActivations({ ...base, signal: signal({ years: 11 }) }).map((idea) => idea.kind)).not.toContain("event");
  });

  it("marks ideas ready only when the media or contact they need is on file", () => {
    const without = suggestActivations({ ...base, signal: signal({}) });
    expect(without.find((idea) => idea.kind === "video")).toMatchObject({ ready: false, status: "Needs video" });
    expect(without.find((idea) => idea.kind === "article")).toMatchObject({ ready: false, status: "Add an email first" });
    const withAll = suggestActivations({ ...base, signal: signal({}), hasContact: true, media: [media("highlight"), media("highlight", "rejected")] });
    expect(withAll.find((idea) => idea.kind === "video")).toMatchObject({ ready: true, status: "Footage ready", reasons: ["Cut from 1 connected video."] });
    expect(withAll.find((idea) => idea.kind === "article")).toMatchObject({ ready: true, status: "Contact on file" });
  });

  it("pre-writes a brief that names the milestone and the game", () => {
    const [post] = suggestActivations({ ...base, momentTitle: "Cal vs. USC", signal: signal({}) });
    expect(post.brief).toBe("On this day: 20 years since his Lott IMPACT Trophy season (Cal vs. USC). Tag Dante and link the fan Locker.");
  });

  it("fits birthdays and businesses", () => {
    expect(suggestActivations({ ...base, signal: signal({ type: "birthday", years: 42 }) })[0].brief).toContain("Happy 42nd birthday to Dante Hughes!");
    expect(suggestActivations({ ...base, signal: signal({ type: "business", years: 3, headline: "Hale Training turns 3" }) }).map((idea) => idea.title)).toEqual(["Feature Dante's business", "Dante's life after football"]);
  });
});

describe("why it matters", () => {
  it("explains the date, the sources, the media and the athlete's reach", () => {
    const lines = signalReasons({ ...base, signal: signal({}), momentTitle: "Cal vs. USC", media: [media("image")], followers: 12_400 });
    expect(lines).toEqual([
      "Nov 28: 20 years since his Lott IMPACT Trophy season, a round anniversary fans and letterwinners tend to revisit.",
      "The game on record: Cal vs. USC.",
      "2 checked sources back it up, so every claim can be cited.",
      "Your staff has connected 1 image to build from.",
      "Dante reaches 12K followers, so a tag or share extends the post past your own accounts.",
    ]);
  });
});

describe("what backs a planned activation", () => {
  const research = (id: string, date: string | null, aboutDate: string | null = null) =>
    ({ id, title: id, url: `https://example.com/${id}`, publisher: "Pub", type: "article" as const, date, aboutDate });
  const file = {
    signals: [signal({ key: "s1", momentId: "m1", evidence: [{ label: "nflverse box score", url: null, note: "8 INT in 2006." }] })],
    moments: [{ id: "m1", title: "Cal vs. USC", date: "2006-11-18", status: "verified", sources: 1 }],
    research: [research("old", "2010-01-01"), research("new", "2024-05-01"), research("same-year", "2006-12-01"), research("same-day", "2015-01-01", "2006-11-18"), research("extra", "2023-01-01")],
  };

  it("lists the signal's sources and puts coverage of the same game first, then the newest, four at most", () => {
    const backing = backingFor(file, "s1")!;
    expect(backing.sources).toEqual([{ label: "nflverse box score", url: null, note: "8 INT in 2006." }]);
    expect(backing.research.map((item) => item.id)).toEqual(["same-day", "same-year", "new", "extra"]);
  });

  it("still offers research for school-media signals, and nothing when there is none", () => {
    expect(backingFor(file, "school-media:x")!.sources).toEqual([]);
    expect(backingFor({ ...file, research: [] }, "school-media:x")).toBeNull();
  });
});
