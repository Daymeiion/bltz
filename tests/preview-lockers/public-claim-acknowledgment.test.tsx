import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import PublicPreviewClaim from "@/components/preview-lockers/PublicPreviewClaim";

const previewId = "10000000-0000-4000-8000-000000000001";
const sessionId = "70000000-0000-4000-8000-000000000001";
vi.mock("@/lib/analytics/preview-client", () => ({
  previewAnalyticsSessionId: () => "70000000-0000-4000-8000-000000000001",
  trackPreviewEvent: vi.fn(async () => undefined),
}));
const fetcher = vi.fn();
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  vi.stubGlobal("fetch", fetcher); fetcher.mockReset();
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });

async function submit() {
  await act(async () => root.render(<PublicPreviewClaim previewId={previewId} />));
  await act(async () => document.querySelector<HTMLButtonElement>("#preview-locker-claim-trigger")!.click());
  const input = document.querySelector<HTMLInputElement>('input[type="email"]')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "claim-canary@example.invalid");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    document.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
  });
  await act(async () => document.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
}

it.each([null, {}, { saved: false }])("does not display a saved claim for an unconfirmed HTTP success: %j", async (data) => {
  fetcher.mockResolvedValue(Response.json(data));
  await submit();
  expect(document.body.textContent).not.toContain("Your request is saved.");
  expect(document.querySelector('[role="alert"]')?.textContent).toContain("could not save");
  expect(document.querySelector<HTMLInputElement>('input[type="email"]')?.value).toBe("claim-canary@example.invalid");
});

it("confirms only a saved request and submits the existing anonymous viewing session", async () => {
  fetcher.mockResolvedValue(Response.json({ saved: true }));
  await submit();
  expect(document.body.textContent).toContain("Your request is saved.");
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0][0]).toBe("/api/preview-link-inquiries");
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({ previewId, sessionId, consent: true });
});
