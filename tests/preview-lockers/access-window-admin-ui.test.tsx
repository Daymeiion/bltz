import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
import { PreviewAccessWindow } from "@/app/admin/preview-lockers/[id]/link/PreviewAccessWindow";

const previewId = "10000000-0000-4000-8000-000000000001";
const observedAt = "2026-10-13T12:00:00Z";
const started = "2026-10-10T12:00:00Z", expired = "2026-10-12T12:00:00Z", active = "2026-10-15T12:00:00Z";
let host: HTMLDivElement, root: Root;
const fetcher = vi.fn();
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); vi.stubGlobal("fetch", fetcher); host = document.createElement("div"); document.body.append(host); root = createRoot(host); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
function element(expiresAt: string | null, startedAt: string | null = started, extendedAt: string | null = null, published = true) {
  return <PreviewAccessWindow previewId={previewId} published={published} observedAt={observedAt} initialAccess={{ access_started_at: startedAt, access_expires_at: expiresAt, access_extended_at: extendedAt }}/>;
}
async function request() {
  const textarea = host.querySelector("textarea")!;
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(textarea, "Personal request for more review time"); textarea.dispatchEvent(new Event("input", { bubbles: true })); });
  await act(async () => host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
}
async function submit() { await act(async () => host.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))); }

describe("Admin preview viewing window", () => {
  it("shows unopened access without admitting a visitor or offering an extension", () => {
    const html = renderToStaticMarkup(element(null, null));
    expect(html).toContain("Pending first open"); expect(html).toContain("Admin inspection does not start it");
    expect(html).not.toContain("<form"); expect(fetcher).not.toHaveBeenCalled();
  });
  it("distinguishes active, expired, extended and unpublished status", () => {
    expect(renderToStaticMarkup(element(active))).toContain(">Active<");
    expect(renderToStaticMarkup(element(expired))).toContain(">Expired<");
    expect(renderToStaticMarkup(element(active, started, observedAt))).toContain(">Extended<");
    expect(renderToStaticMarkup(element(expired, started, null, false))).toContain(">Unpublished<");
  });
  it("requires a personal request and reason, and sends no client deadline", async () => {
    await act(async () => root.render(element(expired)));
    await submit(); expect(fetcher).not.toHaveBeenCalled();
    fetcher.mockResolvedValue(new Response(JSON.stringify({ saved: true, access_started_at: started, access_expires_at: active, access_extended_at: observedAt })));
    await request(); await submit();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toBe(`/api/admin/preview-lockers/${previewId}/access-extension`);
    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(Object.keys(body).sort()).toEqual(["reason", "requestId"]);
    expect(body.reason).toBe("Personal request for more review time"); expect(body.requestId).toMatch(/^[\da-f-]{36}$/);
    expect(host.textContent).toContain("Access extended by 48 hours"); expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });
  it("retains the same request after an uncertain outcome and recovers the audited result", async () => {
    fetcher.mockRejectedValueOnce(new Error("connection lost")).mockResolvedValueOnce(new Response(JSON.stringify({ saved: true, duplicate: true, access_started_at: started, access_expires_at: active, access_extended_at: observedAt })));
    await act(async () => root.render(element(expired))); await request(); await submit();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("Could not confirm");
    expect(host.querySelector("textarea")!.disabled).toBe(true);
    await submit();
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual(JSON.parse(fetcher.mock.calls[0][1].body));
    expect(host.textContent).toContain("already applied");
  });
  it("blocks concurrent submissions and reports unauthorized sessions without success", async () => {
    let finish!: (value: Response) => void;
    fetcher.mockReturnValue(new Promise<Response>(resolve => { finish = resolve; }));
    await act(async () => root.render(element(expired))); await request();
    await submit(); await submit(); expect(fetcher).toHaveBeenCalledTimes(1);
    await act(async () => finish(new Response("{}", { status: 403 })));
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("not authorized");
    expect(host.textContent).not.toContain("Access extended by"); expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it("treats an unreadable success response as uncertain rather than claiming an extension", async () => {
    fetcher.mockResolvedValue(new Response("{}"));
    await act(async () => root.render(element(expired))); await request(); await submit();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("Could not confirm"); expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
