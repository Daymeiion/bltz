import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ action: vi.fn() }));
vi.mock("@/app/admin/gtm/funnel/actions", () => ({ conversionAdminAction: mocks.action }));
import { EnrollmentForm, ManualSentForm, ReviewedInquiryEmailForm } from "@/app/admin/gtm/funnel/AdminForms";

let host: HTMLDivElement, root: Root;
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); host = document.createElement("div"); document.body.append(host); root = createRoot(host); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
async function fill(selector: string, value: string) {
  const input = host.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
  await act(async () => { Object.getOwnPropertyDescriptor(input.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, "value")!.set!.call(input, value); input.dispatchEvent(new Event("input", { bubbles: true })); });
}
async function submit() { await act(async () => host.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))); }

describe("manual preview Admin forms", () => {
  it("offers the manual pilot channels and explicitly allows email-less enrollment", () => {
    const html = renderToStaticMarkup(<EnrollmentForm contacts={[{ id: "contact", label: "Email-less intended athlete" }]} previews={[{ id: "preview", label: "Reviewed preview" }]}/>);
    expect(html).toContain("Contact email is optional");
    for (const channel of ["Instagram", "Facebook", "LinkedIn", "Text / SMS"]) expect(html).toContain(channel);
    expect(html).toContain("immutable"); expect(html).not.toContain('type="email"');
  });
  it("converts the chosen local sent time to UTC and preserves exact details after a rejected save", async () => {
    mocks.action.mockResolvedValue({ message: "Reviewed public link required", error: true });
    await act(async () => root.render(<ManualSentForm preview="preview" enrolledChannel="linkedin"/>));
    const select = host.querySelector<HTMLSelectElement>('select[name="channel"]')!;
    await act(async () => { select.value = "instagram"; select.dispatchEvent(new Event("change", { bubbles: true })); });
    const local = "2026-10-01T11:30";
    await fill('input[name="sent_at_local"]', local); await submit();
    const sent = mocks.action.mock.calls[0][1] as FormData;
    expect(sent.get("channel")).toBe("instagram"); expect(sent.get("sent_at")).toBe(new Date(local).toISOString());
    expect(host.querySelector<HTMLInputElement>('input[name="sent_at_local"]')!.value).toBe(local);
    expect(select.value).toBe("instagram"); expect(host.querySelector('[role="alert"]')?.textContent).toContain("public link required");
    await submit(); expect((mocks.action.mock.calls[1][1] as FormData).get("sent_at")).toBe(sent.get("sent_at"));
  });
  it("keeps reviewed-email reason and confirmation after a concurrent-email conflict", async () => {
    mocks.action.mockResolvedValue({ message: "Existing email cannot be replaced", error: true });
    await act(async () => root.render(<ReviewedInquiryEmailForm preview="preview" inquiry="inquiry" contact="contact" submittedEmail="visitor@example.test"/>));
    expect(host.querySelector("button")!.disabled).toBe(true);
    await fill('textarea[name="reason"]', "Reviewed submission and intended contact");
    await act(async () => host.querySelector<HTMLInputElement>('input[name="reviewed"]')!.click());
    await submit();
    const sent = mocks.action.mock.calls[0][1] as FormData;
    expect(sent.get("inquiry")).toBe("inquiry"); expect(sent.get("contact")).toBe("contact"); expect(sent.get("reviewed")).toBe("on");
    expect(host.querySelector<HTMLTextAreaElement>("textarea")!.value).toBe("Reviewed submission and intended contact");
    expect(host.querySelector<HTMLInputElement>('input[name="reviewed"]')!.checked).toBe(true);
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("cannot be replaced");
    expect(host.textContent).toContain("does not verify identity or ownership");
  });
});
