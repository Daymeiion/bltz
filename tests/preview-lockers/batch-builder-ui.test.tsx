import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { previewContent } from "@/lib/preview-lockers/validation";

const mock = vi.hoisted(() => ({ match: vi.fn(), cohort: vi.fn(), open: vi.fn(), build: vi.fn() }));
vi.mock("@/app/admin/preview-lockers/batch/actions", () => ({ matchBatchNames: mock.match, addBatchToCohort: mock.cohort, openBatchPreview: mock.open }));
vi.mock("@/lib/preview-lockers/batch", () => ({ buildSavedPreview: mock.build }));
import BatchBuilder from "@/app/admin/preview-lockers/batch/BatchBuilder";

const candidate = (gsis: string, name: string) => ({ gsis_id: gsis, display_name: name, college_name: "Arizona", latest_team: "LAC", position: "CB", last_season: 2015 });
const ok = { ok: true, detail: "ok" };
let host: HTMLDivElement, root: Root;
beforeEach(() => { vi.resetAllMocks(); host = document.createElement("div"); document.body.append(host); root = createRoot(host); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
const button = (text: string) => [...host.querySelectorAll<HTMLButtonElement>("button")].find(x => x.textContent?.startsWith(text))!;
async function type(value: string) {
  const area = host.querySelector("textarea")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(area, value);
    area.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

it("matches names, adds the chosen players to the cohort once, and builds each Locker", async () => {
  mock.match.mockResolvedValue({ ok: true, matches: [
    { name: "Antoine Cason", college: null, candidates: [candidate("00-0000001", "Antoine Cason")], gsisId: "00-0000001" },
    { name: "John Smith", college: null, candidates: [candidate("00-0000002", "John Smith"), candidate("00-0000003", "John Smith")], gsisId: null },
    { name: "Nobody Here", college: null, candidates: [], gsisId: null },
  ] });
  mock.cohort.mockResolvedValue({ ok: true, reviewCount: 0 });
  mock.open.mockImplementation(async (gsisId: string) => ({ ok: true, created: true, preview: { gsisId, id: `id-${gsisId}`, slug: "fixture-player", revision: 1, content: previewContent.parse({ slug: "fixture-player", full_name: "Antoine Cason" }) } }));
  mock.build.mockResolvedValue({ career: ok, save: ok, awards: ok, news: ok, merchandise: { ok: false, detail: "Merchandise is cooling down." }, revision: 2 });
  await act(async () => root.render(<BatchBuilder />));
  await type("Antoine Cason\nJohn Smith\nNobody Here");
  await act(async () => button("Find players").click());
  expect(host.textContent).toContain("1 of 3 ready");
  expect(host.textContent).toContain("Not found in the Player Master list");
  // Pick one of the two John Smiths.
  const select = host.querySelector<HTMLSelectElement>('select[aria-label="Player Master match for John Smith"]')!;
  await act(async () => { select.value = "00-0000003"; select.dispatchEvent(new Event("change", { bubbles: true })); });
  expect(host.textContent).toContain("2 of 3 ready");
  await act(async () => button("Add to cohort and build 2 Lockers").click());
  expect(mock.cohort).toHaveBeenCalledTimes(1);
  expect(mock.cohort).toHaveBeenCalledWith(["00-0000001", "00-0000003"]);
  expect(mock.open.mock.calls.map(call => call[0]).sort()).toEqual(["00-0000001", "00-0000003"]);
  expect(host.textContent).toContain("2 of 2 built");
  expect(host.querySelectorAll('[aria-label="Needs review"]')).toHaveLength(2);
  expect(host.textContent).toContain("Merchandise is cooling down.");
  expect([...host.querySelectorAll("a")].map(a => a.getAttribute("href"))).toContain("/admin/preview-lockers/id-00-0000001/edit");
});

it("builds nothing when the cohort step fails", async () => {
  mock.match.mockResolvedValue({ ok: true, matches: [{ name: "Antoine Cason", college: null, candidates: [candidate("00-0000001", "Antoine Cason")], gsisId: "00-0000001" }] });
  mock.cohort.mockResolvedValue({ ok: false, message: "The cohort connection could not be completed." });
  await act(async () => root.render(<BatchBuilder />));
  await type("Antoine Cason");
  await act(async () => button("Find players").click());
  await act(async () => button("Add to cohort and build 1 Locker").click());
  expect(mock.open).not.toHaveBeenCalled();
  expect(host.textContent).toContain("No Lockers were built.");
});
