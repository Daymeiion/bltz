import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import PreviewLockerForm from "@/app/admin/preview-lockers/PreviewLockerForm";
import { previewContent } from "@/lib/preview-lockers/validation";
const discovery = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("@/lib/preview-lockers/stream-client", () => ({ readDiscovery: discovery.read }));
let host: HTMLDivElement; let root: Root; let fetcher: ReturnType<typeof vi.fn>;
beforeEach(() => { host = document.createElement("div"); document.body.append(host); root = createRoot(host); fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
async function fill(label: string, value: string) { const input = host.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[aria-label="${label}"]`)!; await act(async () => { Object.getOwnPropertyDescriptor(input.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, "value")!.set!.call(input, value); input.dispatchEvent(new Event("input", { bubbles: true })); }); }
async function click(text: string) { const button = [...host.querySelectorAll("button")].find(b => b.textContent === text)!; expect(button).toBeTruthy(); await act(async () => button.click()); }
it("retains manually entered biography and photo when discovery returns manual fallback", async () => {
  await act(async () => root.render(<PreviewLockerForm />));
  await fill("Full name", "Synthetic Preview"); await fill("Biography", "Manual biography"); await click("Add photo"); await fill("Photo 1 title", "Manual photo"); await fill("Photo 1 url", "https://example.com/manual.jpg");
  fetcher.mockResolvedValue(new Response("")); discovery.read.mockResolvedValue({ draft: previewContent.parse({ slug: "synthetic-preview", full_name: "Synthetic Preview" }), message: "Manual fallback" });
  await click("Build with web scraper");
  expect(host.querySelector<HTMLTextAreaElement>('[aria-label="Biography"]')!.value).toBe("Manual biography"); expect(host.querySelector<HTMLInputElement>('[aria-label="Photo 1 url"]')!.value).toBe("https://example.com/manual.jpg");
  expect(host.textContent).toMatch(/nflverse NFL roster data.*cfbverse college roster data.*Wikipedia.*ESPN.*YouTube/);
  expect(host.textContent).toContain("Google Images is not queried");
});
it("requires review, retains create id on retry and exposes full saved navigation", async () => {
  await act(async () => root.render(<PreviewLockerForm />)); await fill("Full name", "Synthetic Preview");
  expect([...host.querySelectorAll("button")].find(b => b.textContent === "Save private preview")!.disabled).toBe(true);
  await act(async () => host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
  fetcher.mockRejectedValueOnce(new Error("network failure")); await click("Save private preview");
  const first = JSON.parse(fetcher.mock.calls[0][1].body); fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ id: first.id, slug: "synthetic-preview", revision: 1 }), { status: 201 })); await click("Save private preview");
  expect(JSON.parse(fetcher.mock.calls[1][1].body).id).toBe(first.id); expect(host.textContent).toContain("Saved privately"); expect(host.querySelector('a[href="/preview-lockers/synthetic-preview/photos"]')).not.toBeNull();
});
it("retains a conflicted edit draft and supplies a full document reload link", async () => {
  const record = { ...previewContent.parse({ slug: "synthetic-preview", full_name: "Synthetic Preview" }), id: "00000000-0000-4000-8000-000000000001", revision: 3, created_at: "", updated_at: "" };
  await act(async () => root.render(<PreviewLockerForm record={record} />)); await fill("Biography", "Unsaved edit"); await act(async () => host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click()); fetcher.mockResolvedValue(new Response("{}", { status: 409 })); await click("Save changes privately");
  expect(host.textContent).toContain("Save conflict"); expect(host.querySelector<HTMLTextAreaElement>('[aria-label="Biography"]')!.value).toBe("Unsaved edit"); expect(host.textContent).toContain("Reload saved version (discards unsaved draft)"); expect(JSON.parse(fetcher.mock.calls[0][1].body).revision).toBe(3);
});
it("keeps discovery available for a linked saved draft and requires explicit persisted completion", async () => {
  const record = { ...previewContent.parse({ slug: "synthetic-preview", full_name: "Synthetic Preview" }), id: "00000000-0000-4000-8000-000000000001", revision: 3, created_at: "", updated_at: "" };
  await act(async () => root.render(<PreviewLockerForm record={record} gtmLinked />));
  expect([...host.querySelectorAll("button")].some(button => button.textContent === "Build with web scraper")).toBe(true);
  expect(host.textContent).toContain("Draft / incomplete");
  const checks = host.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
  expect(checks).toHaveLength(2);
  await act(async () => checks[1].click());
  fetcher.mockResolvedValue(new Response(JSON.stringify({ complete: true, revision: 3, unchanged: false })));
  await click("Mark preview complete");
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ revision: 3 });
  expect(host.textContent).toContain("Preview complete");
  expect(host.textContent).toContain("identity and media rights remain unverified");
});
it("clears completed presentation after a persisted content edit", async () => {
  const record = { ...previewContent.parse({ slug: "synthetic-preview", full_name: "Synthetic Preview", bio: "Reviewed" }), id: "00000000-0000-4000-8000-000000000001", revision: 3, created_at: "", updated_at: "" };
  await act(async () => root.render(<PreviewLockerForm record={record} gtmLinked gtmCompleted />));
  expect(host.textContent).toContain("Preview complete");
  await fill("Biography", "Persisted change");
  await act(async () => host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
  fetcher.mockResolvedValue(new Response(JSON.stringify({ id: record.id, slug: record.slug, revision: 4, complete: false, completionStatus: "available" })));
  await click("Save changes privately");
  expect(host.textContent).toContain("Draft / incomplete");
});
