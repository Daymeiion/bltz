// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ admin: vi.fn(), readiness: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/preview-lockers/server", () => ({ previewAdmin: mocks.admin }));
vi.mock("@/lib/preview-lockers/ionos-email", () => ({ getInvitationEmailReadiness: mocks.readiness }));
import { loadInvitationEmailReport } from "@/lib/preview-lockers/invitation-email-report";
import { invitationEmailRegistryReportSchema, invitationEmailRequestSchema, invitationEmailStates } from "@/lib/preview-lockers/invitation-email";

const previewId = "10000000-0000-4000-8000-000000000001";
const attemptId = "20000000-0000-4000-8000-000000000001";
const timestamp = "2026-10-11T12:00:00+00:00";
const counts = () => Object.fromEntries(invitationEmailStates.map(state => [state, state === "smtp_accepted" ? 1 : 0]));
function registry() { return { preview_id: previewId, total_attempts: 1, limited: false, counts: counts(), attempts: [{
  id: attemptId, state: "smtp_accepted", recipient_masked: "p***@example.test", created_at: timestamp, updated_at: timestamp,
  smtp_accepted_at: timestamp, report_at: null, failure_code: null,
}] }; }
function response(data: unknown, error: unknown = null) { mocks.rpc.mockReturnValue({ abortSignal: () => Promise.resolve({ data, error }) }); }
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv("VERCEL_ENV", "production");
  mocks.admin.mockResolvedValue({ client: { rpc: mocks.rpc } });
  mocks.readiness.mockReturnValue({ enabled: false, bounceSyncEnabled: false, sender: null, reason: "disabled" });
  response(registry());
});
afterEach(() => vi.unstubAllEnvs());
describe("invitation email Admin report", () => {
  it("authorizes before reading readiness or calling the report RPC", async () => {
    mocks.admin.mockRejectedValue(new Error("forbidden"));
    await expect(loadInvitationEmailReport({ previewId })).rejects.toThrow("forbidden");
    expect(mocks.readiness).not.toHaveBeenCalled(); expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("keeps historical email evidence visible when sending is disabled", async () => {
    const report = await loadInvitationEmailReport({ previewId });
    expect(mocks.rpc).toHaveBeenCalledWith("preview_invitation_email_report", { p_preview: previewId, p_environment: "production" });
    expect(report.status).toBe("available"); expect(report.readiness.enabled).toBe(false);
    expect(report.counts?.smtp_accepted).toBe(1); expect(report.attempts[0].recipient_masked).toBe("p***@example.test");
  });
  it("uses development identity outside Vercel Production", async () => {
    vi.stubEnv("VERCEL_ENV", "preview"); await loadInvitationEmailReport({ previewId });
    expect(mocks.rpc).toHaveBeenCalledWith("preview_invitation_email_report", { p_preview: previewId, p_environment: "development" });
  });
  it("does not call the registry without a selected shared preview", async () => {
    expect((await loadInvitationEmailReport()).status).toBe("unselected"); expect(mocks.rpc).not.toHaveBeenCalled();
    expect((await loadInvitationEmailReport({ previewId: "invalid" })).status).toBe("unavailable"); expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("withholds unavailable data rather than replacing it with zero or raw provider errors", async () => {
    response(null, { message: "private mailbox password and raw recipient" });
    const report = await loadInvitationEmailReport({ previewId });
    expect(report.status).toBe("unavailable"); expect(report.totalAttempts).toBeNull(); expect(report.counts).toBeNull();
    expect(JSON.stringify(report)).not.toContain("password");
  });
  it("rejects mismatched scope, leaked fields, unmasked email, and inconsistent totals", async () => {
    for (const bad of [{ ...registry(), preview_id: attemptId }, { ...registry(), message_id: "private" },
      { ...registry(), total_attempts: 2 }, { ...registry(), attempts: [{ ...registry().attempts[0], recipient_masked: "player@example.test" }] }]) {
      response(bad); expect((await loadInvitationEmailReport({ previewId })).status).toBe("unavailable");
    }
  });
  it("rejects duplicate attempt rows and an unconfirmed send request", () => {
    const bad = registry(); bad.attempts.push(bad.attempts[0]);
    expect(invitationEmailRegistryReportSchema.safeParse(bad).success).toBe(false);
    expect(invitationEmailRequestSchema.safeParse({ contactId: previewId, requestId: attemptId, confirmed: false }).success).toBe(false);
    expect(invitationEmailRequestSchema.safeParse({ contactId: previewId, requestId: attemptId, confirmed: true, recipientEmail: "arbitrary@example.test" }).success).toBe(false);
  });
});
