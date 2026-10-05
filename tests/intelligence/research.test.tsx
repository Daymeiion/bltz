import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { cooldownAt, FINDINGS, intelligenceView, trialWindowAt } from "@/lib/intelligence/research";
import { intelligenceDisplayExample } from "@/lib/intelligence/display-example";
import { ResearchView } from "@/app/admin/intelligence/ResearchView";
import { DisplayExample } from "@/app/admin/intelligence/DisplayExample";
import { IntelligenceWorkspace } from "@/app/admin/intelligence/Workspace";

describe("Research window and access-state presentation", () => {
  it("uses the corrected October 10 deadline in Pacific calendar days", () => {
    expect(trialWindowAt("2026-09-30T18:30:00Z")).toMatchObject({ daysRemaining: 10, planningDeadline: "2026-10-10" });
    expect(trialWindowAt("2026-10-01T06:59:59Z").daysRemaining).toBe(10);
    expect(trialWindowAt("2026-10-01T07:00:00Z").daysRemaining).toBe(9);
    expect(trialWindowAt("2026-10-10T07:00:00Z").daysRemaining).toBe(0);
    expect(() => trialWindowAt("unknown")).toThrow("invalid_research_clock");
  });
  it("matches the existing one-hour ledger rule without implying quota availability", () => {
    expect(cooldownAt("2026-09-30T18:29:24Z", "2026-09-30T19:29:23Z")).toMatchObject({ state: "active", until: "2026-09-30T19:29:24.000Z" });
    expect(cooldownAt("2026-09-30T18:29:24Z", "2026-09-30T19:29:24Z").state).toBe("elapsed");
    expect(cooldownAt(null, "2026-09-30T18:30:00Z").state).toBe("clear");
    expect(cooldownAt("invalid", "2026-09-30T18:30:00Z").state).toBe("unavailable");
  });
  it("keeps old athlete links usable and validates the view parameter", () => {
    expect(intelligenceView(undefined)).toBe("findings");
    expect(intelligenceView(undefined, true)).toBe("athlete");
    expect(intelligenceView("unexpected", true)).toBe("athlete");
    expect(intelligenceView(["example"])).toBe("findings");
    expect(intelligenceView("example", true)).toBe("example");
  });
  it("labels dated observations and blocked/documented capabilities separately", () => {
    const html = renderToStaticMarkup(<ResearchView data={{ checkedAt: "2026-09-30T18:30:00Z", trial: trialWindowAt("2026-09-30T18:30:00Z"), cooldown: cooldownAt("2026-09-30T18:29:24Z", "2026-09-30T18:30:00Z") }} />);
    expect(html).toContain("Captured September 30, 2026");
    expect(html).toContain("Provider calls paused");
    expect(html).toContain("Documented only");
    expect(html).toContain("Five reserved calls");
    expect(html).toContain("9 unique plays");
    expect(html).toContain("Research deadline");
    expect(html).toContain("October 10, 2026");
    expect(html).not.toContain("October 13, 2026");
    expect(html).toContain("exact expiration time is not yet recorded");
    expect(html).not.toContain("Maya Bennett");
    expect(FINDINGS.find(row => row.id === "game")?.state).toBe("observed");
  });
  it.each(["elapsed", "clear", "unavailable"] as const)("renders %s ledger state honestly", state => {
    const html = renderToStaticMarkup(<ResearchView data={{ checkedAt: "2026-09-30T20:00:00Z", trial: trialWindowAt("2026-09-30T20:00:00Z"), cooldown: { state, until: null, lastRateLimitAt: null } }} />);
    expect(html).not.toContain("Provider calls paused");
    expect(html).toContain(state === "elapsed" ? "does not guarantee access" : state === "clear" ? "not a guarantee" : "Do not assume provider calls are permitted");
  });
});

describe("Isolated intelligence display example", () => {
  it("uses the actual deterministic rule and retains the complete evidence chain", () => {
    const example = intelligenceDisplayExample();
    const signal = example.evaluation.signals[0];
    const opportunity = example.evaluation.opportunities[0];
    expect(example.displayOnly).toBe(true);
    expect(signal.data).toMatchObject({ anniversaryYears: 20, daysUntil: 13 });
    expect(signal.score).toBe(83);
    expect(signal.confidence).toBe(0.92);
    expect(opportunity.signalKeys).toEqual([signal.key]);
    expect(opportunity.momentId).toBe(signal.momentId);
    expect(signal.evidence[0].sourceUrl).toBeNull();
  });
  it("identifies fictional data, missing assets and human review prominently", () => {
    const html = renderToStaticMarkup(<DisplayExample />);
    expect(html).toContain("Illustrative example — not live athlete data");
    expect(html).toContain("Maya Bennett · fictional");
    expect(html).toContain("Human review");
    expect(html).toContain("Usage clearance");
    expect(html).toContain("No real source URL is asserted");
    expect(html).not.toContain('href="#moment-');
    expect(html).not.toContain('href="#signal-');
    expect(html).not.toContain("Keith Rivers");
  });
  it("preserves athlete context between views with encoded URLs and accessible navigation", () => {
    const html = renderToStaticMarkup(<IntelligenceWorkspace view="findings" context={{ q: "name & archive", athlete: "canonical-id", asOf: "2026-09-30" }}><DisplayExample /></IntelligenceWorkspace>);
    expect(html).toContain('aria-label="Intelligence views"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("view=athlete&amp;q=name+%26+archive&amp;athlete=canonical-id");
    expect((html.match(/<h1/g) ?? []).length).toBe(1);
  });
});
