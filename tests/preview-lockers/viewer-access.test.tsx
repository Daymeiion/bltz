import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import PreviewViewerAccess from "@/app/admin/preview-lockers/PreviewViewerAccess";

let host: HTMLDivElement; let root: Root; let fetcher: ReturnType<typeof vi.fn>;
beforeEach(() => { vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); host = document.createElement("div"); document.body.append(host); root = createRoot(host); fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
async function fillEmail(value: string) { const input = host.querySelector<HTMLInputElement>('[aria-label="Player BLTZ account email"]')!; await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value); input.dispatchEvent(new Event("input", { bubbles: true })); }); }
async function click(text: string) { const button = [...host.querySelectorAll("button")].find(item => item.textContent === text)!; expect(button).toBeTruthy(); await act(async () => button.click()); }

it("reports exact-email account-not-found without claiming assignment", async () => {
  await act(async () => root.render(<PreviewViewerAccess previewId="00000000-0000-4000-8000-000000000001" initialAssigned={false} />));
  await fillEmail("missing@example.com");
  fetcher.mockResolvedValue(new Response(JSON.stringify({ error: "account_not_found" }), { status: 404 }));
  await click("Assign player access");
  expect(host.textContent).toContain("No existing BLTZ account matches that exact email");
  expect([...host.querySelectorAll("button")].some(item => item.textContent === "Assign player access")).toBe(true);
});

it("assigns, reassigns and revokes without displaying or retaining email", async () => {
  await act(async () => root.render(<PreviewViewerAccess previewId="00000000-0000-4000-8000-000000000001" initialAssigned={false} />));
  await fillEmail("viewer@example.com");
  fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ assigned: true, status: "assigned" })));
  await click("Assign player access");
  expect(host.textContent).toContain("private read-only access");
  expect(host.textContent).not.toContain("viewer@example.com");
  expect(host.querySelector<HTMLInputElement>('[aria-label="Player BLTZ account email"]')!.value).toBe("");

  await fillEmail("replacement@example.com");
  fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ assigned: true, status: "reassigned" })));
  await click("Reassign player access");
  expect(host.textContent).toContain("reassigned and audited");

  fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ assigned: false, status: "revoked" })));
  await click("Revoke player access");
  expect(host.textContent).toContain("revoked and audited");
  expect(fetcher.mock.calls.at(-1)?.[1]).toMatchObject({ method: "DELETE", body: "{}" });
});
