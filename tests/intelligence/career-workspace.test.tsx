import { act } from "react";
import { createRoot, hydrateRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup, renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CareerWorkspace, confidencePercent, momentDate, reviewPriority } from "@/app/admin/intelligence/CareerWorkspace";
import type { WorkspaceAthleteSummary, WorkspaceResult } from "@/lib/intelligence/workspace-types";

const theme = vi.hoisted(() => ({ setTheme: vi.fn(), resolvedTheme: "dark" as string | undefined }));
vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: theme.resolvedTheme, setTheme: theme.setTheme }) }));

// Synthetic DTOs test rendering and navigation, never assert real athlete history.
const ATHLETE = "00000000-0000-4000-8000-000000000011";
const SECOND = "00000000-0000-4000-8000-000000000012";
const MOMENT = "00000000-0000-4000-8000-000000000021";
const EVIDENCE = "00000000-0000-4000-8000-000000000031";
const SOURCE = "00000000-0000-4000-8000-000000000041";
function summary(id = ATHLETE, name = "Test Athlete"): WorkspaceAthleteSummary {
  return { id, name, slug: "test-athlete", school: "Test School", position: "LB", teamLabel: null, portraitUrl: null, priority: null, priorityLabel: "Awaiting review", hasIntelligence: false, intelligenceState: "ready" };
}
function fixture(id = ATHLETE, name = "Test Athlete"): WorkspaceResult {
  const section = <T,>(rows: T[] = []) => ({ state: "ready" as const, rows, truncated: false });
  return {
    result: { query: "", asOf: "2026-10-04", evaluatedAt: "2026-10-04T12:00:00Z", search: section([summary(id, name), summary(SECOND, "Second Athlete")]), selectionState: "ready", selected: {
      id, name, slug: "test-athlete", school: "Test School", position: "LB", teamLabel: null, verified: null,
      relationships: section(), statistics: section(), media: section(), externalIdentities: section(),
      moments: section([{ id: MOMENT, title: "Verified test game", occurredOn: "2006-10-07", occurredYear: 2006, datePrecision: "day", sport: "football", eventId: null, status: "verified", confidence: .99, athletes: [{ athleteId: id, relationshipType: "participant", status: "verified", confidence: .99 }], relationship: "participant", relationshipStatus: "verified", relationshipConfidence: .99, evidence: [{ id: EVIDENCE, athleteId: id, momentId: MOMENT, factType: "performance", statement: "The test athlete recorded twelve tackles. Another sentence is secondary.", data: { tackles: 12 }, status: "verified", confidence: .99, source: { id: SOURCE, name: "Test Publisher", provider: "public_web", locator: "https://example.com/test-game", fetchedAt: "2026-10-01T12:00:00Z" }, ingestionId: null }] }]),
      evidence: section(), intelligenceState: "ready", intelligence: { asOf: "2026-10-04T12:00:00Z", signals: [], opportunities: [], skipped: [] },
    } },
    directory: section([summary(id, name)]), profile: { athleteId: id, portraitUrl: null, portraitSource: null, portraitAttribution: { creator: null, owner: null, credits: null, sourceUrl: null, license: null }, status: null, statusDate: null, statusDatePrecision: "unknown", sport: "football", email: null, phone: null, socialLinks: [], lockerHref: null },
    profileState: "ready", media: section(), mediaPreviewState: "ready", content: section(), momentMediaState: "not_supported",
  };
}
let host: HTMLDivElement;
let root: Root;
async function render(data = fixture(), initialMomentId: string | null = null) {
  await act(async () => root.render(<CareerWorkspace initial={data} initialMomentId={initialMomentId} />));
}
function click(element: Element | null) { expect(element).not.toBeNull(); element!.dispatchEvent(new MouseEvent("click", { bubbles: true })); }
function button(label: string): HTMLButtonElement | null { return [...host.querySelectorAll("button")].find(element => element.textContent?.trim() === label) ?? null; }
beforeEach(() => {
  vi.clearAllMocks();
  theme.resolvedTheme = "dark";
  sessionStorage.clear();
  window.history.replaceState(null, "", "/admin/intelligence");
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => fixture() }));
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  Object.defineProperty(window, "matchMedia", { configurable: true, value: () => ({ matches: true }) });
  Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });

describe("Career workspace fact boundaries", () => {
  it("keeps priority thresholds distinct from fractional evidence confidence", () => {
    expect([0, 40, 41, 70, 71, 100].map(reviewPriority)).toEqual(["Low", "Low", "Mid", "Mid", "High", "High"]);
    expect([null, -1, 101, NaN, Infinity].map(reviewPriority)).toEqual(Array(5).fill("Awaiting review"));
    expect([0, .99, 1].map(confidencePercent)).toEqual([0, 99, 100]);
    expect([null, -1, 99, NaN].map(confidencePercent)).toEqual(Array(4).fill(null));
  });
  it("does not manufacture months or exact dates from year-only and unknown records", () => {
    expect(momentDate({ occurredOn: null, occurredYear: 2015, datePrecision: "year" })).toBe("2015");
    expect(momentDate({ occurredOn: "2015-02-30", occurredYear: 2015, datePrecision: "day" })).toBe("Event date not established");
    expect(momentDate({ occurredOn: null, occurredYear: 2015, datePrecision: "unknown" })).toBe("Event date not established");
  });
  it("uses real supplied records with honest image, contact and activation empty states", () => {
    const html = renderToStaticMarkup(<CareerWorkspace initial={fixture()} />);
    expect(html).toContain("Test Athlete"); expect(html).toContain("Portrait not recorded");
    expect(html).toContain("Career status not recorded"); expect(html).toContain("No activations recorded");
    expect(html).not.toMatch(/SAMPLE ACTIVATION|Nike|124,000|Retired July|activation-sample|BLTZ_DATA|ROSTER_DATA/);
    expect(html).not.toContain("See activation"); expect(html).not.toContain("Reach</");
  });
  it("preserves source references and unknown confidence without exposing secret-bearing links", () => {
    const data = fixture();
    const moment = data.result.selected!.moments.rows[0];
    moment.confidence = null; moment.evidence[0].confidence = null;
    moment.evidence[0].source.locator = "https://example.com/game?api_key=private";
    const html = renderToStaticMarkup(<CareerWorkspace initial={data} initialMomentId={MOMENT} />);
    expect(html).toContain("Evidence &amp; dates"); expect(html).toContain("Fetched");
    expect(html).toContain("Not recorded"); expect(html).not.toContain('href="https://example.com/game?api_key');
    expect(html).not.toContain("api_key=private");
  });
  it("never treats an athlete portrait or legacy asset as verified Moment media", () => {
    const data = fixture(); data.profile!.portraitUrl = "https://example.com/portrait.jpg";
    data.media.rows = [{ id: "legacy-1", title: "Athlete photograph", kind: "photo", source: "Photographer", model: "legacy media", previewUrl: "https://example.com/photo.jpg", sourceUrl: null, credits: null, publicationStatus: "unverified", permissionReason: "Clearance not established", momentIds: [] }];
    const html = renderToStaticMarkup(<CareerWorkspace initial={data} initialMomentId={MOMENT} />);
    expect(html).toContain("No verified Moment media"); expect(html).not.toContain("Athlete photograph");
  });
  it("shows source statistics without treating internal review metadata as performance", () => {
    const data = fixture();
    data.result.selected!.moments.rows[0].evidence[0].data = {
      rights: "unknown", review: { version: 1, reviewedAt: "2026-10-01T12:00:00Z", reviewerId: "private-reviewer-id" },
      factType: "performance", significance: "not_evaluated",
      statistics: { total_tackles: 12, pass_deflections: 2, tackles_for_loss: 1 },
    };
    const html = renderToStaticMarkup(<CareerWorkspace initial={data} initialMomentId={MOMENT} />);
    expect(html).toContain("total tackles"); expect(html).toContain("pass deflections"); expect(html).toContain("tackles for loss");
    expect(html).not.toContain("private-reviewer-id"); expect(html).not.toContain("reviewerId");
    expect(html).not.toContain("review / version"); expect(html).not.toContain("factType"); expect(html).not.toContain("not_evaluated");
  });
  it("shows separate publication, release and described-event dates for content", () => {
    const data = fixture();
    data.content.rows = [{ evidenceId: EVIDENCE, athleteId: ATHLETE, sourceId: SOURCE, title: "Test interview", url: "https://example.com/video", publisher: "Test Publisher", contentType: "video", publishedOn: "2025-01-10", releasedOn: null, describedEventOn: null, careerContext: "postcareer", matchMethod: "reviewed source", matchConfidence: .99, status: "verified", fetchedAt: "2026-10-01T12:00:00Z", sourceUrl: "https://example.com/newsletter", assertion: "The publisher links an interview.", metadataDateBasis: "The newsletter date is not the video release date.", sourcePaths: [], youtubeId: null, incompleteReasons: ["publication_or_release_date_unknown"] }];
    const html = renderToStaticMarkup(<CareerWorkspace initial={data} />);
    expect(html).toContain("Post-career content"); expect(html).toContain("Released"); expect(html).toContain("Date not recorded");
    expect(html).toContain("The newsletter date is not the video release date.");
  });
});

describe("Career workspace interaction", () => {
  it("hydrates a stored dark appearance without a server/client icon mismatch", async () => {
    const data = fixture();
    theme.resolvedTheme = undefined;
    const html = renderToString(<CareerWorkspace initial={data} />);
    theme.resolvedTheme = "dark";
    const recoverable = vi.fn();
    await act(async () => {
      root.unmount();
      host.innerHTML = html;
      root = hydrateRoot(host, <CareerWorkspace initial={data} />, { onRecoverableError: recoverable });
    });
    expect(recoverable).not.toHaveBeenCalled();
    expect(host.querySelector('button[aria-label="Use light appearance"]')).not.toBeNull();
    expect(host.querySelector('button[aria-label="Use light appearance"]')?.hasAttribute("disabled")).toBe(false);
  });
  it("opens the Intelligence folder first and supports keyboard folder navigation", async () => {
    await render();
    expect(button("Intelligence")?.getAttribute("aria-selected")).toBe("true");
    await act(async () => button("Intelligence")!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })));
    expect(button("Moments")?.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(button("Moments"));
    await act(async () => button("Moments")!.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true })));
    expect(button("Media")?.getAttribute("aria-selected")).toBe("true");
  });
  it("selects the actual Moment ID and returns to the athlete without reloading data", async () => {
    await render();
    await act(async () => click([...host.querySelectorAll("button")].find(row => row.querySelector("strong")?.textContent === "Verified test game")!));
    expect(button("Evidence")?.getAttribute("aria-selected")).toBe("true");
    expect(window.location.search).toContain(`moment=${MOMENT}`);
    expect(host.textContent).toContain("Test Publisher");
    await act(async () => click(button("Back to athlete")));
    expect(button("Intelligence")?.getAttribute("aria-selected")).toBe("true");
    expect(window.location.search).not.toContain("moment=");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("opens cards natively with metrics centered in the signal body and real evidence", async () => {
    const data = fixture();
    data.result.selected!.intelligence.signals = [{ key: "signal-test", type: "historical_anniversary", ruleVersion: "v1", playerId: ATHLETE, momentId: MOMENT, score: 92, scoreScale: "Editorial review priority; not probability or earnings", confidence: .99, explanation: "A reviewed anniversary is approaching.", evidence: [{ id: EVIDENCE, sourceId: SOURCE, sourceLabel: "Test Publisher", sourceProvider: "public_web", sourceLocator: null, sourceUrl: "https://example.com/game", fetchedAt: "2026-10-01T12:00:00Z", assertion: "The exact test game date is sourced.", confidence: .99 }], sourceEntities: [{ type: "moment", id: MOMENT }], detectedAt: "2026-10-04T12:00:00Z", asOf: "2026-10-04T12:00:00Z", targetDate: "2026-10-07", data: {}, status: "candidate" }];
    await render(data);
    const signal = host.querySelector('section[aria-label="Signals"] details') as HTMLDetailsElement;
    expect(signal.open).toBe(false); expect(signal.querySelector('div[aria-label="Review priority: High"]')).not.toBeNull();
    expect(signal.querySelector('div[aria-label="Evidence confidence: 99%"]')).not.toBeNull();
    expect(signal.textContent).toContain("The exact test game date is sourced.");
    await act(async () => click(signal.querySelector("summary")));
    expect(signal.open).toBe(true);
  });
  it("pins provenance and dismisses it with Escape while returning focus", async () => {
    await render(); const identity = host.querySelector('button[aria-label="Identity and provenance"]')!;
    await act(async () => click(identity));
    expect(host.querySelector('div[role="region"][aria-label="Identity and provenance"]')).not.toBeNull();
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(host.querySelector('div[role="region"][aria-label="Identity and provenance"]')).toBeNull();
    expect(document.activeElement).toBe(identity);
  });
  it("adds searched athletes without selecting, guards duplicates, and permits plain removal", async () => {
    await render();
    const input = host.querySelector('input[role="combobox"]') as HTMLInputElement;
    await act(async () => input.focus());
    expect(host.textContent).toContain("Verified test game");
    await act(async () => click(host.querySelector('button[aria-label="Add Second Athlete to watchlist"]')));
    expect(host.querySelectorAll('aside[aria-label="Athlete watchlist"] > ul > li')).toHaveLength(2);
    expect(host.querySelector('section[aria-label="Athlete identity"]')?.textContent).toContain("Test Athlete");
    expect(window.location.search).not.toContain(`athlete=${SECOND}`);
    expect(host.querySelector('button[aria-label="Second Athlete already in watchlist"]')?.hasAttribute("disabled")).toBe(true);
    expect(host.querySelectorAll('aside[aria-label="Athlete watchlist"] > ul > li')).toHaveLength(2);
    const next = fixture(SECOND, "Second Athlete"); vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => next } as Response);
    await act(async () => click(host.querySelectorAll('button[role="option"]')[1]));
    expect(window.location.search).toContain(`athlete=${SECOND}`);
    await act(async () => click(host.querySelector('button[aria-label="Remove Second Athlete from watchlist"]')));
    expect(host.querySelectorAll('aside[aria-label="Athlete watchlist"] > ul > li')).toHaveLength(1);
    expect(host.querySelector("h2")?.textContent).toBe("Review watchlist");
    expect(host.querySelector('section[aria-label="Athlete identity"]')?.textContent).toContain("Second Athlete");
  });
  it("dismisses search with Escape from the result button and restores input focus", async () => {
    await render(); const input = host.querySelector('input[role="combobox"]') as HTMLInputElement;
    await act(async () => input.focus()); const result = host.querySelector('button[role="option"]') as HTMLButtonElement;
    await act(async () => { result.focus(); result.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    expect(input.getAttribute("aria-expanded")).toBe("false"); expect(document.activeElement).toBe(input);
  });
  it("opens and dismisses the mobile top-nav watchlist panel with Escape", async () => {
    await render(); const toggle = host.querySelector('button[aria-label="Open athlete watchlist"]')!;
    await act(async () => click(toggle));
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(host.querySelector('#career-watchlist')?.getAttribute("data-mobile-open")).toBe("true");
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(toggle.getAttribute("aria-expanded")).toBe("false"); expect(document.activeElement).toBe(toggle);
  });
  it("preserves the prior career file on authorization or network failure", async () => {
    await render(); vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 403 } as Response);
    await act(async () => click(host.querySelector('button[aria-current="true"]')));
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("Sign in again");
    expect(host.querySelector('section[aria-label="Athlete identity"]')?.textContent).toContain("Test Athlete");
  });
  it("aborts a stale athlete selection so it cannot replace the newer selection", async () => {
    await render();
    let resolveFirst!: (value: Response) => void;
    const first = new Promise<Response>(resolve => { resolveFirst = resolve; });
    vi.mocked(fetch).mockReturnValueOnce(first);
    await act(async () => click(host.querySelector('button[aria-current="true"]')));
    const input = host.querySelector('input[role="combobox"]') as HTMLInputElement;
    await act(async () => input.focus());
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => fixture(SECOND, "Second Athlete") } as Response);
    await act(async () => click(host.querySelectorAll('button[role="option"]')[1]));
    await act(async () => resolveFirst({ ok: true, json: async () => fixture() } as Response));
    expect(host.querySelector('section[aria-label="Athlete identity"]')?.textContent).toContain("Second Athlete");
    const options = vi.mocked(fetch).mock.calls[0][1]; expect(options?.signal?.aborted).toBe(true);
  });
});
