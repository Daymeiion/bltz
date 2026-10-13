import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ admin: vi.fn(), rpc: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/preview-lockers/server", () => ({ previewAdmin: mocks.admin }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { conversionAdminAction } from "@/app/admin/gtm/funnel/actions";

const preview = "10000000-0000-4000-8000-000000000001", contact = "20000000-0000-4000-8000-000000000001", inquiry = "30000000-0000-4000-8000-000000000001";
function form(action: string, entries: Record<string, string> = {}) { const data = new FormData(); Object.entries({ action, preview, ...entries }).forEach(([key, value]) => data.set(key, value)); return data; }
beforeEach(() => { vi.clearAllMocks(); mocks.admin.mockResolvedValue({ client: { rpc: mocks.rpc } }); mocks.rpc.mockResolvedValue({ error: null }); });

describe("manual preview Admin action boundary", () => {
  it.each(["instagram", "facebook", "linkedin", "sms"])("records actual %s channel and the exact selected sent time", async channel => {
    const sent_at = "2026-10-01T14:30:00.000Z";
    const result = await conversionAdminAction({ message: "" }, form("sent", { channel, sent_at }));
    expect(mocks.rpc).toHaveBeenCalledWith("preview_conversion", expect.objectContaining({ p_preview: preview, p_action: "sent", p_data: { channel, sent_at } }));
    expect(result.message).toContain("No message or email was sent");
  });
  it("rejects missing, unknown and future sent details before a database write", async () => {
    const cases: Record<string,string>[] = [{ channel: "instagram" }, { channel: "unknown", sent_at: "2026-10-01T14:30:00.000Z" }, { channel: "sms", sent_at: "2099-10-01T14:30:00.000Z" }];
    for (const entries of cases) {
      expect((await conversionAdminAction({ message: "" }, form("sent", entries))).error).toBe(true);
    }
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("keeps review required and sends only the inquiry/contact/reason to the guarded RPC", async () => {
    const details = { inquiry, contact, reason: "Reviewed exact contact match" };
    expect((await conversionAdminAction({ message: "" }, form("review_inquiry_email", details))).error).toBe(true);
    expect(mocks.rpc).not.toHaveBeenCalled();
    const result = await conversionAdminAction({ message: "" }, form("review_inquiry_email", { ...details, reviewed: "on", email: "forged@example.test" }));
    expect(mocks.rpc).toHaveBeenCalledWith("accept_preview_inquiry_email", { p_inquiry: inquiry, p_contact: contact, p_reason: details.reason });
    expect(result.message).toContain("ownership remain unverified"); expect(result.message).toContain("No email was sent");
    expect(mocks.revalidate).toHaveBeenCalledWith(`/admin/preview-lockers/${preview}/link`);
  });
  it("reports a concurrent contact-email change or rejected association without claiming success", async () => {
    mocks.rpc.mockResolvedValue({ error: { code: "22023" } });
    const result = await conversionAdminAction({ message: "" }, form("review_inquiry_email", { inquiry, contact, reason: "Reviewed exact contact match", reviewed: "on" }));
    expect(result.error).toBe(true); expect(result.message).toContain("cannot be replaced"); expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it("authorizes each submission and never reaches an RPC for an unauthorized actor", async () => {
    mocks.admin.mockRejectedValue(new Error("forbidden"));
    const result = await conversionAdminAction({ message: "" }, form("sent", { channel: "sms", sent_at: "2026-10-01T14:30:00.000Z" }));
    expect(result.error).toBe(true); expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("does not claim a failed write when the RPC transport outcome is unknown", async () => {
    mocks.rpc.mockRejectedValue(new Error("response lost after commit"));
    const result = await conversionAdminAction({ message: "" }, form("sent", { channel: "sms", sent_at: "2026-10-01T14:30:00.000Z" }));
    expect(result.error).toBe(true); expect(result.message).toContain("Could not confirm a save");
    expect(result.message).toContain("same details"); expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
