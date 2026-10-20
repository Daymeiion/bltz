import { act } from "react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import PreviewLockerForm from "@/app/admin/preview-lockers/PreviewLockerForm";
import { previewContent } from "@/lib/preview-lockers/validation";

let host: HTMLDivElement; let root: Root; let fetcher: ReturnType<typeof vi.fn>;
const id = "00000000-0000-4000-8000-000000000001";
const record = () => ({ ...previewContent.parse({ slug: "synthetic-preview", full_name: "Synthetic Preview" }), id, revision: 3, created_at: "", updated_at: "" });
const section = () => [...host.querySelectorAll("details")].find(item => item.querySelector("summary")?.textContent?.startsWith("Import NFL statistics"))!;
beforeEach(() => { host = document.createElement("div"); document.body.append(host); root = createRoot(host); fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
async function fill(label: string, value: string) {
  const node = host.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[aria-label="${label}"]`)!;
  await act(async () => { Object.getOwnPropertyDescriptor(node.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, "value")!.set!.call(node, value); node.dispatchEvent(new Event("input", { bubbles: true })); });
}
async function click(text: string, scope: Element = section()) {
  const button = [...scope.querySelectorAll("button")].find(node => node.textContent === text)!;
  expect(button).toBeTruthy();
  await act(async () => button.click());
}
async function review(csv = "Season,Team,G,Sk\n2024,AAA,17,2.5", sourceUrl = "https://www.pro-football-reference.com/players/F/FixtPl00.htm") {
  await fill("NFL player source URL", sourceUrl);
  await fill("NFL statistics CSV", csv);
  await click("Read CSV columns"); await click("Review NFL statistics");
}
async function approve() { await act(async () => section().querySelector<HTMLInputElement>('input[type="checkbox"]')!.click()); }

it("reviews and saves a valid player URL whose PFR ID contains a period", async () => {
  const sourceUrl = "https://www.pro-football-reference.com/players/A/ArriJ.00.htm";
  await act(async () => root.render(<PreviewLockerForm record={record()} />));
  await review("Season,Team,G,Sk\n2005,ARI,15,0", sourceUrl);
  expect(section().querySelector('[role="alert"]')).toBeNull();
  expect(section().textContent).toContain("season/team rows");
  await approve(); await click("Add reviewed statistics to draft");
  fetcher.mockResolvedValueOnce(Response.json({ id, slug: "synthetic-preview", revision: 4 }));
  await click("Save draft", host);
  expect(JSON.parse(fetcher.mock.calls[0][1].body).content.pfr_stats[0].sourceUrl).toBe(sourceUrl);
});
it("reviews, saves, reloads, replaces and removes NFL tables through the existing draft workflow", async () => {
  await act(async () => root.render(<PreviewLockerForm record={record()} />));
  await review("Season,Team,G,Sk\n2024,AAA,17,2.5\nCareer,,17,2.5");
  expect(section().textContent).toContain("PFR career totals included from the CSV");
  const add = [...section().querySelectorAll("button")].find(node => node.textContent === "Add reviewed statistics to draft")!;
  expect(add.disabled).toBe(true);
  await approve(); await click("Add reviewed statistics to draft");
  expect(section().textContent).toContain("NFL tables in this draft");
  expect(fetcher).not.toHaveBeenCalled();
  fetcher.mockResolvedValue(Response.json({ id, slug: "synthetic-preview", revision: 4 }));
  await click("Save draft", host);
  const body = JSON.parse(fetcher.mock.calls[0][1].body);
  expect(body.revision).toBe(3);
  expect(body.content.pfr_stats[0].seasons[0].statistics.sacks).toBe(2.5);
  expect(body.content.pfr_stats[0].careerTotals).toEqual({ gamesPlayed: 17, gamesStarted: null, statistics: { sacks: 2.5 } });
  expect(body.content.cfb_stats).toEqual([]);
  expect(body.content).not.toHaveProperty("player_id");
  await act(async () => root.render(<PreviewLockerForm key="reload" record={{ ...record(), ...body.content, revision: 4 }} />));
  expect(section().textContent).toContain("defense · 1 season/team rows");
  expect(section().textContent).toContain("career totals included");
  await review("Season,Team,G,Sk\n2024,AAA,17,3.5");
  expect(section().textContent).toContain("replaces the existing defense import");
  await approve(); await click("Add reviewed statistics to draft");
  await click("Save draft", host);
  expect(JSON.parse(fetcher.mock.calls[1][1].body).content.pfr_stats).toHaveLength(1);
  expect(JSON.parse(fetcher.mock.calls[1][1].body).content.pfr_stats[0].seasons[0].statistics.sacks).toBe(3.5);
  expect(JSON.parse(fetcher.mock.calls[1][1].body).content.pfr_stats[0]).not.toHaveProperty("careerTotals");
  await click("Remove defense from draft"); await click("Save draft", host);
  expect(JSON.parse(fetcher.mock.calls[2][1].body).content.pfr_stats).toEqual([]);
});
it("reads a CSV file locally on the new builder and rejects invalid or oversized files", async () => {
  await act(async () => root.render(<PreviewLockerForm />));
  const node = host.querySelector<HTMLInputElement>('[aria-label="Upload NFL CSV"]')!;
  const csv = "Season,Team,G,Sk\n2024,AAA,17,2.5";
  Object.defineProperty(node, "files", { configurable: true, value: [new File([csv], "nfl.csv", { type: "text/csv" })] });
  await act(async () => node.dispatchEvent(new Event("change", { bubbles: true })));
  expect(host.querySelector<HTMLTextAreaElement>('[aria-label="NFL statistics CSV"]')!.value).toBe(csv);
  expect(fetcher).not.toHaveBeenCalled();
  Object.defineProperty(node, "files", { configurable: true, value: [new File(["x".repeat(100001)], "nfl.csv")] });
  await act(async () => node.dispatchEvent(new Event("change", { bubbles: true })));
  expect(section().textContent).toContain("100 KB (100,000 bytes)");
});
it("reads the actual 27 KB Sports Reference Excel export through the NFL file picker", async () => {
  await act(async () => root.render(<PreviewLockerForm />));
  const node = host.querySelector<HTMLInputElement>('[aria-label="Upload NFL CSV"]')!;
  const html = readFileSync(path.resolve("tests/preview-lockers/antoine-cason-defense.xls"), "utf8");
  const file = new File([html], "sportsref_download (2).xls", { type: "application/vnd.ms-excel" });
  expect(file.size).toBe(27063);
  Object.defineProperty(node, "files", { configurable: true, value: [file] });
  await act(async () => { node.dispatchEvent(new Event("change", { bubbles: true })); });
  await vi.waitFor(async () => { await act(async () => {}); expect(host.querySelector<HTMLTextAreaElement>('[aria-label="NFL statistics CSV"]')!.value).toContain("Season,Age,Team"); });
  await click("Read CSV columns");
  await fill("NFL player source URL", "https://www.pro-football-reference.com/players/C/CasoAn99.htm");
  await click("Review NFL statistics");
  expect(section().textContent).toContain("8 season/team rows");
  expect(section().textContent).toContain("PFR career totals included");
  expect(fetcher).not.toHaveBeenCalled();
});
it("invalidates review when the source changes and keeps invalid statistics out of the draft", async () => {
  await act(async () => root.render(<PreviewLockerForm record={record()} />));
  await review(); await approve();
  await fill("NFL player source URL", "https://www.pro-football-reference.com/players/O/OtherPl00.htm");
  expect(section().querySelector('input[type="checkbox"]')).toBeNull();
  await review("Season,Team,G,Sk\n2024,AAA,17,=1+1");
  expect(section().textContent).toContain("Invalid Sacks");
  expect(section().textContent).not.toContain("NFL tables in this draft");
  expect(fetcher).not.toHaveBeenCalled();
});
