import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import PreviewBuilderWorkspace from "@/app/admin/preview-lockers/PreviewBuilderWorkspace";
import PreviewLockerForm from "@/app/admin/preview-lockers/PreviewLockerForm";
import { readBuilderContext, type BuilderContext } from "@/app/admin/preview-lockers/builder-workspace-data";
import { previewContent } from "@/lib/preview-lockers/validation";

let host: HTMLDivElement; let root: Root;
beforeEach(() => { host = document.createElement("div"); document.body.append(host); root = createRoot(host); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
const id = "00000000-0000-4000-8000-000000000001";
const otherId = "00000000-0000-4000-8000-000000000002";
const context = (): BuilderContext => ({
  athletes: [{ id, full_name: "First Athlete", school: "First School", position: "WR", level: "pro", slug: "first-athlete" }, { id: otherId, full_name: "Second Athlete", school: "Second School", position: "QB", level: "pro", slug: "second-athlete" }],
  rosterUnavailable: false, feedbackUnavailable: false,
  claim: { preview_id: id, state: "accepted", email: "first@example.test", dashboard_interest: true, updates_permission: true, feature_requests: "Add first athlete’s season", decline_reason: null, created_at: "2026-10-01T12:00:00Z" },
  referrals: [{ id: "referral", referrer_preview_id: id, full_name: "First Referral", email: "referral@example.test", phone: null }],
});
async function input(label: string, value: string) {
  const node = host.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!;
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(node, value); node.dispatchEvent(new Event("input", { bubbles: true })); });
}
it("searches saved athletes without changing the selected athlete’s feedback and never shows stale feedback for another selection", async () => {
  await act(async () => root.render(<PreviewBuilderWorkspace context={context()} selectedId={id} athleteName="First Athlete"><p>Editor</p></PreviewBuilderWorkspace>));
  await input("Search athletes with preview lockers", "Second School");
  const roster = host.querySelector('[aria-label="Athlete preview search"]')!;
  expect(roster.textContent).toContain("Second Athlete");
  expect(roster.textContent).not.toContain("First Athlete");
  expect(host.querySelector('[aria-label="Selected athlete claim feedback"]')?.textContent).toContain("first@example.test");
  await act(async () => root.render(<PreviewBuilderWorkspace context={context()} selectedId={otherId} athleteName="Second Athlete"><p>Editor</p></PreviewBuilderWorkspace>));
  const feedback = host.querySelector('[aria-label="Selected athlete claim feedback"]')!;
  expect(feedback.textContent).toContain("No claim response yet");
  expect(feedback.textContent).not.toContain("first@example.test");
  expect(feedback.textContent).not.toContain("First Referral");
});
it("keeps edits and upload controls mounted across keyboard folder navigation, and saves the original athlete revision", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id, slug: "first-athlete", revision: 4 })));
  vi.stubGlobal("fetch", fetcher);
  const record = { ...previewContent.parse({ slug: "first-athlete", full_name: "First Athlete" }), id, revision: 3, created_at: "", updated_at: "" };
  await act(async () => root.render(<PreviewLockerForm record={record} />));
  await input("Full name", "Edited First Athlete");
  const tabs = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  expect(tabs).toHaveLength(6);
  await act(async () => tabs[0].dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true })));
  expect(tabs[5].getAttribute("aria-selected")).toBe("true");
  expect(document.activeElement).toBe(tabs[5]);
  expect(host.querySelector('#locker-panel-info')?.hasAttribute("hidden")).toBe(true);
  expect(host.querySelector('[aria-label="Upload multiple private photos"]')).not.toBeNull();
  await act(async () => tabs[0].click());
  expect(host.querySelector<HTMLInputElement>('[aria-label="Full name"]')?.value).toBe("Edited First Athlete");
  const save = [...host.querySelectorAll<HTMLButtonElement>("button")].find(node => node.textContent === "Save draft")!;
  await act(async () => save.click());
  expect(fetcher.mock.calls[0][0]).toBe(`/api/preview-lockers/${id}`);
  const payload = JSON.parse(fetcher.mock.calls[0][1].body);
  expect(payload.revision).toBe(3);
  expect(payload.content.full_name).toBe("Edited First Athlete");
});
it("scopes claim and referrals in the database query and refuses mismatched data", async () => {
  const queries: Array<{ table: string; eq: ReturnType<typeof vi.fn> }> = [];
  const client = { from: vi.fn((table: string) => {
    const result = { data: table === "preview_lockers" ? context().athletes : table === "preview_conversion_responses" ? { ...context().claim, preview_id: otherId } : [{ ...context().referrals[0], referrer_preview_id: otherId }], error: null };
    const chain = { select: vi.fn(), order: vi.fn(), range: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(async () => result), then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve) };
    for (const method of [chain.select, chain.order, chain.range, chain.eq]) method.mockReturnValue(chain);
    queries.push({ table, eq: chain.eq }); return chain;
  }) };
  const loaded = await readBuilderContext(client as unknown as SupabaseClient, id);
  expect(queries.find(row => row.table === "preview_conversion_responses")?.eq).toHaveBeenCalledWith("preview_id", id);
  expect(queries.find(row => row.table === "preview_locker_candidates")?.eq).toHaveBeenCalledWith("referrer_preview_id", id);
  expect(loaded.claim).toBeNull(); expect(loaded.referrals).toEqual([]);
  expect(loaded.athletes).toHaveLength(2);
});
