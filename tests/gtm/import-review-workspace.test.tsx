import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { GtmCsvPreview } from "@/app/admin/gtm/actions";
import { captureImportReviewProgress } from "@/lib/gtm/import-review-progress";

const actions = vi.hoisted(() => ({ inspect: vi.fn(), preview: vi.fn(), commit: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/admin/gtm/imports" }));
vi.mock("@/app/admin/gtm/actions", () => ({ inspectGtmCsv: actions.inspect, previewGtmCsv: actions.preview, commitGtmCsv: actions.commit }));
import { GtmImportWorkspace } from "@/components/admin/gtm/GtmImportWorkspace";

const sourceId = (number: number) => number.toString(16).padStart(64, "0");
function preview(count = 535): GtmCsvPreview {
  return {
    filename: "synthetic.csv", contentSha256: "a".repeat(64), idempotencyKey: "00000000-0000-4000-8000-000000000001",
    headers: ["Name"], mapping: { displayName: "Name" },
    counts: { found: count, newContacts: count, existingContacts: 0, updates: 0, duplicate: 0, matchedPlayers: 1, possiblePlayerMatches: count - 1, automaticClassifications: 1, needsReview: count - 1, unclassified: 0, invalid: 0 },
    sample: [], issues: [],
    playerReviews: Array.from({ length: count }, (_, index) => ({
      sourceRecordId: sourceId(index + 1), rowNumber: index + 2, displayName: `Synthetic Player ${index}`, currentCompany: "Synthetic Team",
      strength: index === 0 ? "strong" : "possible",
      candidates: [{ id: `00-${index.toString().padStart(7, "0")}`, playerId: null, name: `Synthetic Player ${index}`, team: "Synthetic Team", school: null, college: null, position: "QB", level: "NFL", status: "RET", matchType: index === 0 ? "name_and_team" : "name_only", confidence: index === 0 ? 0.96 : 0.65 }],
    })),
  };
}
let host: HTMLDivElement; let root: Root; let current: GtmCsvPreview;
beforeEach(async () => {
  vi.clearAllMocks(); Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  current = preview();
  actions.inspect.mockResolvedValue({ ok: true, value: { filename: "synthetic.csv", headers: ["Name"], mapping: { displayName: "Name" }, rowsFound: 535, invalidRows: 0 } });
  actions.preview.mockImplementation(async () => ({ ok: true, value: structuredClone(current) }));
  actions.commit.mockResolvedValue({ ok: true, value: { jobId: "job", created: 535, updated: 0, skipped: 0, failed: 0 } });
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root.render(<GtmImportWorkspace />));
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); });
function button(text: string) { const found = [...host.querySelectorAll("button")].find((item) => item.textContent?.trim() === text); expect(found).toBeTruthy(); return found!; }
async function click(text: string) { await act(async () => button(text).click()); }
async function load() {
  const input = host.querySelector<HTMLInputElement>('[aria-label="LinkedIn CSV file"]')!;
  Object.defineProperty(input, "files", { configurable: true, value: [new File(["Name\nSynthetic"], "synthetic.csv", { type: "text/csv" })] });
  await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
  await click("Read headers"); await click("3. Validate and preview");
}
async function confirm() { await act(async () => host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click()); }
async function settle() {
  await vi.waitFor(async () => {
    await act(async () => { await Promise.resolve(); });
    expect(host.querySelector<HTMLInputElement>('[aria-label="LinkedIn CSV file"]')!.disabled).toBe(false);
  }, { interval: 10, timeout: 1500 });
}

describe("Large contact matching review", () => {
  it("renders 20 uncertain rows and collapses automatic suggestions without dropping the rest", async () => {
    await load();
    expect(host.querySelectorAll("fieldset")).toHaveLength(20);
    expect(host.textContent).not.toContain("Row 2 · Synthetic Player 0");
    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Next uncertain matches page"]')!.click());
    expect(host.textContent).toContain("Row 23 · Synthetic Player 21");
    expect(host.querySelectorAll("fieldset")).toHaveLength(20);
  });
  it("bulk defers uncertain matches and omits automatic defaults from manual decisions", async () => {
    await load();
    expect(button("7. Import contacts").disabled).toBe(true);
    await click("Defer remaining uncertain matches"); await confirm(); await click("7. Import contacts");
    const submitted = actions.commit.mock.calls[0][0] as FormData;
    expect(JSON.parse(String(submitted.get("playerMatchDecisions")))).toEqual({});
    expect(JSON.parse(String(submitted.get("deferredPlayerMatches")))).toHaveLength(534);
    expect(host.textContent).toContain("Import complete");
  });
  it("keeps an explicit selection and defers only undecided uncertain rows", async () => {
    current = preview(4); await load();
    await act(async () => host.querySelector<HTMLInputElement>('fieldset input[type="radio"]')!.click());
    await click("Defer remaining uncertain matches"); await confirm(); await click("7. Import contacts");
    const submitted = actions.commit.mock.calls[0][0] as FormData;
    expect(JSON.parse(String(submitted.get("playerMatchDecisions")))).toEqual({ [sourceId(2)]: "00-0000001" });
    expect(JSON.parse(String(submitted.get("deferredPlayerMatches")))).toEqual([sourceId(3), sourceId(4)]);
  });
  it("preserves valid choices after revalidation but clears confirmation", async () => {
    current = preview(4); await load(); await click("Defer remaining uncertain matches"); await confirm();
    await click("Validate again"); await settle();
    expect(host.textContent).toContain("3 deferred for later review");
    expect(host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.checked).toBe(false);
    expect(button("7. Import contacts").disabled).toBe(true);
  });
  it("resumes a matching checkpoint without restoring approval or storing browser data", async () => {
    current = preview(4); await load();
    const localWrite = vi.spyOn(localStorage, "setItem"); const sessionWrite = vi.spyOn(sessionStorage, "setItem");
    const checkpoint = await captureImportReviewProgress(current, { matches: {}, deferred: [sourceId(2), sourceId(3), sourceId(4)] });
    const input = host.querySelector<HTMLInputElement>('[aria-label="Resume review checkpoint"]')!;
    Object.defineProperty(input, "files", { configurable: true, value: [new File([checkpoint], "progress.json", { type: "application/json" })] });
    await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
    await settle();
    expect(host.textContent).toContain("3 deferred for later review");
    expect(host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.checked).toBe(false);
    expect(localWrite).not.toHaveBeenCalled(); expect(sessionWrite).not.toHaveBeenCalled();
  });
  it("retains existing choices on a failed revalidation and clears approval", async () => {
    current = preview(4); await load(); await click("Defer remaining uncertain matches"); await confirm();
    actions.preview.mockResolvedValueOnce({ ok: false, code: "invalid", message: "Synthetic preview unavailable" });
    await click("Validate again"); await settle();
    expect(host.textContent).toContain("Synthetic preview unavailable");
    expect(host.textContent).toContain("3 deferred for later review");
    expect(host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.checked).toBe(false);
    expect(actions.commit).not.toHaveBeenCalled();
  });
  it("keeps every excluded-row diagnostic reachable through bounded pages", async () => {
    current = preview(4); current.counts.invalid = 278;
    current.issues = Array.from({ length: 278 }, (_, index) => ({ rowNumber: index + 1000, message: "Synthetic validation issue" }));
    await load();
    expect(host.querySelectorAll("details li")).toHaveLength(20);
    expect(host.textContent).toContain("278 total · Page 1 of 14");
    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Next excluded rows page"]')!.click());
    expect(host.textContent).toContain("Row 1020: Synthetic validation issue");
    expect(host.querySelectorAll("details li")).toHaveLength(20);
    expect(button("Download all row diagnostics")).toBeTruthy();
  });
  it("does not approve an empty import and freezes upload/mapping while validation is pending", async () => {
    current = preview(0); current.counts.matchedPlayers = 0; current.counts.possiblePlayerMatches = 0;
    await load();
    expect(host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.disabled).toBe(true);
    expect(button("7. Import contacts").disabled).toBe(true);
    let finish: ((value: unknown) => void) | undefined;
    actions.preview.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    await click("Validate again");
    expect(host.querySelector<HTMLInputElement>('[aria-label="LinkedIn CSV file"]')!.disabled).toBe(true);
    expect([...host.querySelectorAll("select")].every((select) => select.disabled)).toBe(true);
    await act(async () => finish!({ ok: true, value: current }));
    expect(host.querySelector<HTMLInputElement>('[aria-label="LinkedIn CSV file"]')!.disabled).toBe(false);
  });
});
