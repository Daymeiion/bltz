import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
import { PreviewInvitationEmailPanel } from "@/app/admin/gtm/funnel/PreviewInvitationEmailPanel";
import { PreviewInvitationEmailForm } from "@/app/admin/gtm/funnel/PreviewInvitationEmailForm";
import { invitationEmailStates, type InvitationEmailReport } from "@/lib/preview-lockers/invitation-email";

const previewId = "10000000-0000-4000-8000-000000000001", contactId = "20000000-0000-4000-8000-000000000001";
const contacts = [{ id: contactId, label: "Reviewed player", email: "player@example.test" }];
function report(): InvitationEmailReport { return { previewId, status: "available", reason: null,
  readiness: { enabled: false, bounceSyncEnabled: false, sender: null, reason: "disabled" }, totalAttempts: 0, limited: false,
  counts: Object.fromEntries(invitationEmailStates.map(state => [state, 0])) as NonNullable<InvitationEmailReport["counts"]>, attempts: [] }; }
let container: HTMLDivElement | null = null, root: Root | null = null;
beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear(); });
afterEach(async () => { if (root) await act(async () => root?.unmount()); container?.remove(); container = null; root = null; vi.unstubAllGlobals(); });
describe("invitation email evidence panel", () => {
  it("labels SMTP acceptance separately, with disabled sending and manual evidence preserved", () => {
    const html = renderToStaticMarkup(<PreviewInvitationEmailPanel report={report()} previewName="Keith Rivers" contacts={contacts} privateInvitation={false}/>);
    expect(html).toContain("Accepted by SMTP"); expect(html).toContain("Delivery reported"); expect(html).toContain("Sending is disabled");
    expect(html).toContain("not imported as confirmed email delivery"); expect(html).toContain("disabled"); expect(html).not.toContain("mailbox password value");
  });
  it("does not render false zeros or a send form when history is unavailable", () => {
    const value = report(); value.status = "unavailable"; value.counts = null; value.totalAttempts = null;
    const html = renderToStaticMarkup(<PreviewInvitationEmailPanel report={value} previewName="Keith Rivers" contacts={contacts} privateInvitation/>);
    expect(html).toContain("Missing data is not counted as zero"); expect(html).not.toContain("Review one invitation");
  });
  it("reuses the same request reference after a transport error and a page remount", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error("network disappeared"))
      .mockResolvedValue({ status: 202, json: async () => ({ ok: false, state: "send_uncertain" }) });
    vi.stubGlobal("fetch", fetchMock);
    container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
    const element = <PreviewInvitationEmailForm previewId={previewId} previewName="Keith Rivers" contacts={contacts} enabled privateInvitation/>;
    await act(async () => root?.render(element));
    await act(async () => (container!.querySelector('input[type="checkbox"]') as HTMLInputElement).click());
    await act(async () => container!.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    const first = JSON.parse(fetchMock.mock.calls[0][1].body);
    await act(async () => { root?.unmount(); root = createRoot(container!); root.render(element); });
    await act(async () => (container!.querySelector('input[type="checkbox"]') as HTMLInputElement).click());
    await act(async () => container!.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    const second = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(second).toEqual(first); expect(first).toMatchObject({ contactId, confirmed: true });
    expect(Object.keys(first).sort()).toEqual(["confirmed", "contactId", "requestId"]);
    expect(container!.textContent).toContain("outcome is uncertain"); expect(container!.textContent).not.toContain("Prepare a separate attempt");
  });
});
