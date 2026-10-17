import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import PreviewLockerForm from "@/app/admin/preview-lockers/PreviewLockerForm";
import { previewContent } from "@/lib/preview-lockers/validation";
import type { MerchandiseCandidate } from "@/lib/enrichment/merchandise";
const record = { ...previewContent.parse({ slug: "fixture-player", full_name: "Fixture Player", school: "Arizona" }), id: "00000000-0000-4000-8000-000000000001", revision: 3, created_at: "", updated_at: "" };
const candidate: MerchandiseCandidate = { title: "Fixture Player Arizona football trading card", category: "trading_card", productUrl: "https://shop.example.com/products/card", canonicalUrl: "https://shop.example.com/products/card", imageUrl: null, retailer: "Card Shop", priceLabel: "USD 12.99", availability: "unknown", description: "Football card", matchedAffiliations: ["Arizona"] };
const result = (items = [candidate]) => ({ revision: 3, result: { items, status: "complete", candidates: items.length, rejected: 0, errors: [] } });
let host: HTMLDivElement; let root: Root; let fetcher: ReturnType<typeof vi.fn>;
beforeEach(() => { host = document.createElement("div"); document.body.append(host); root = createRoot(host); fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
const button = (text: string, scope: ParentNode = host) => [...scope.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent === text)!;
async function click(text: string, scope: ParentNode = host) { expect(button(text, scope), text).toBeTruthy(); await act(async () => button(text, scope).click()); }
async function fill(label: string, value: string) { const input = host.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!; await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value); input.dispatchEvent(new Event("input", { bubbles: true })); }); }
it("searches saved identity only and requires per-listing review before adding anything to the persisted draft", async () => {
  await act(async () => root.render(<PreviewLockerForm record={record} />));
  expect(fetcher).not.toHaveBeenCalled();
  fetcher.mockResolvedValueOnce(Response.json(result()));
  await click("Search merchandise");
  expect(fetcher.mock.calls[0][0]).toBe(`/api/preview-lockers/${record.id}/merchandise`);
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ revision: 3 });
  expect(host.querySelector('[aria-label="Merchandise 1 title"]')).toBeNull();
  const card = host.querySelector<HTMLElement>('section[aria-label="Merchandise search results"] article')!;
  expect(card.textContent).toContain("Matched college/team: Arizona"); expect(button("Add to draft", card).disabled).toBe(true);
  await act(async () => card.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
  await click("Add to draft", card);
  expect(host.querySelector<HTMLInputElement>('[aria-label="Merchandise 1 title"]')?.value).toBe(candidate.title);
  expect(button("In draft", card).disabled).toBe(true); expect(button("Search merchandise").disabled).toBe(true);
  fetcher.mockResolvedValueOnce(Response.json({ id: record.id, slug: record.slug, revision: 4 }));
  await click("Save draft");
  const payload = JSON.parse(fetcher.mock.calls[1][1].body);
  expect(payload.content.merchandise).toEqual([expect.objectContaining({ title: candidate.title, productUrl: candidate.productUrl, visible: true, priceLabel: "USD 12.99" })]);
  expect(payload.content.merchandise[0]).not.toHaveProperty("matchedAffiliations");
  expect(payload.content.article_edits).toEqual(record.article_edits); expect(payload.content.pfr_stats).toEqual(record.pfr_stats);
  expect(button("Search merchandise").disabled).toBe(false);
});
it("allows selecting multiple candidates before saving, prevents duplicates and dismisses suggestions independently", async () => {
  const jersey = { ...candidate, title: "Fixture Player jersey", category: "jersey" as const, productUrl: "https://shop.example.com/products/jersey", canonicalUrl: "https://shop.example.com/products/jersey" };
  await act(async () => root.render(<PreviewLockerForm record={record} />));
  fetcher.mockResolvedValueOnce(Response.json(result([candidate, jersey]))); await click("Search merchandise");
  const cards = [...host.querySelectorAll<HTMLElement>('section[aria-label="Merchandise search results"] article')];
  for (const card of cards) { await act(async () => card.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click()); await click("Add to draft", card); }
  expect(host.querySelectorAll('[aria-label^="Merchandise "][aria-label$=" title"]')).toHaveLength(2);
  await click("Dismiss listing", cards[0]);
  expect(host.querySelectorAll('section[aria-label="Merchandise search results"] article')).toHaveLength(1);
  expect(host.querySelectorAll('[aria-label^="Merchandise "][aria-label$=" title"]')).toHaveLength(2);
});
it("labels search-only suggestions as unverified and requires review before adding them", async () => {
  await act(async () => root.render(<PreviewLockerForm record={record} />));
  fetcher.mockResolvedValueOnce(Response.json(result([{ ...candidate, evidence: "search_result", priceLabel: null }])));
  await click("Search merchandise");
  const card = host.querySelector<HTMLElement>('section[aria-label="Merchandise search results"] article')!;
  expect(card.textContent).toContain("Search result only · seller page unverified");
  expect(card.textContent).toContain("Search title mentions: Arizona");
  expect(button("Add to draft", card).disabled).toBe(true);
  expect(fetcher).toHaveBeenCalledTimes(1);
  await act(async () => card.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
  await click("Add to draft", card);
  expect(host.querySelector<HTMLInputElement>('[aria-label="Merchandise 1 title"]')?.value).toBe(candidate.title);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("preserves previous results on failure and refuses stale or malformed responses", async () => {
  await act(async () => root.render(<PreviewLockerForm record={record} />));
  fetcher.mockResolvedValueOnce(Response.json(result())); await click("Search merchandise");
  fetcher.mockResolvedValueOnce(Response.json({ error: "merchandise_rate_limited" }, { status: 429 })); await click("Search merchandise");
  expect(host.textContent).toContain("cooling down"); expect(host.querySelector('section[aria-label="Merchandise search results"] article')).not.toBeNull();
  fetcher.mockResolvedValueOnce(Response.json({ ...result(), revision: 4 })); await click("Search merchandise");
  expect(host.textContent).toContain("preview changed");
  expect(button("Add to draft").disabled).toBe(true);
  fetcher.mockResolvedValueOnce(Response.json(result([{ ...candidate, productUrl: "javascript:alert(1)" }]))); await click("Search merchandise");
  expect(host.textContent).toContain("response was invalid"); expect(host.querySelector('a[href^="javascript:"]')).toBeNull();
});
it("disables discovery for unsaved drafts and disables stale suggestions after an identity change", async () => {
  await act(async () => root.render(<PreviewLockerForm />)); expect(button("Search merchandise").disabled).toBe(true);
  await act(async () => root.render(<PreviewLockerForm key="saved" record={record} />));
  fetcher.mockResolvedValueOnce(Response.json(result())); await click("Search merchandise");
  await fill("Full name", "Different Player");
  expect(button("Search merchandise").disabled).toBe(true); expect(button("Add to draft").disabled).toBe(true);
  expect(host.textContent).toContain("identity changed");
});
it("preserves existing products and shows an honest empty result without writing to the Locker", async () => {
  const existing = { id: "existing", title: "Saved jersey", category: "jersey" as const, productUrl: "https://shop.example.com/products/saved", imageUrl: null, retailer: null, priceLabel: null, visible: false };
  await act(async () => root.render(<PreviewLockerForm record={{ ...record, merchandise: [existing] }} />));
  fetcher.mockResolvedValueOnce(Response.json(result([]))); await click("Search merchandise");
  expect(host.textContent).toContain("No matching merchandise listings available to review");
  expect(host.querySelector<HTMLInputElement>('[aria-label="Merchandise 1 title"]')?.value).toBe("Saved jersey");
  expect(fetcher).toHaveBeenCalledTimes(1);
});
