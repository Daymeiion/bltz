// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createTransport: vi.fn(), sendMail: vi.fn(), smtpClose: vi.fn(), imapConstructor: vi.fn(),
  connect: vi.fn(), lock: vi.fn(), release: vi.fn(), search: vi.fn(), fetchOne: vi.fn(), imapClose: vi.fn(), on: vi.fn(),
  mailbox: { uidValidity: BigInt(937), readOnly: true } }));
vi.mock("nodemailer", () => ({ default: { createTransport: mocks.createTransport } }));
vi.mock("imapflow", () => ({ ImapFlow: vi.fn(function (options) {
  mocks.imapConstructor(options);
  return { connect: mocks.connect, getMailboxLock: mocks.lock, search: mocks.search, fetchOne: mocks.fetchOne,
    close: mocks.imapClose, on: mocks.on, mailbox: mocks.mailbox };
}) }));
import { collectIonosDeliveryReports, getInvitationEmailReadiness, sendIonosInvitation } from "@/lib/preview-lockers/ionos-email";
import { MAX_DSN_BYTES } from "@/lib/preview-lockers/ionos-dsn";

const configured = { BLTZ_PREVIEW_EMAIL_FROM: "dante@bltz.me", BLTZ_PREVIEW_EMAIL_PASSWORD: "synthetic-not-a-real-password",
  BLTZ_PREVIEW_EMAIL_ENABLED: "true", BLTZ_PREVIEW_EMAIL_BOUNCE_SYNC_ENABLED: "true" };
const invitation = { id: "b17a0022-2026-4000-8000-000000000001", messageId: "<bltz-preview-b17a0022-2026-4000-8000-000000000001@bltz.me>",
  recipientEmail: "athlete@example.invalid", recipientName: "Synthetic Athlete", previewName: "Synthetic Athlete", previewUrl: "https://bltz.vercel.app/preview-lockers/synthetic-athlete" };
const attempt = { id: invitation.id, message_id: invitation.messageId, recipient_email: invitation.recipientEmail, created_at: "2026-10-11T10:00:00.000Z" };
const source = Buffer.from([
  "MIME-Version: 1.0", "Content-Type: multipart/report; report-type=delivery-status; boundary=fixture", "", "--fixture",
  "Content-Type: text/plain", "", "Delivery report", "--fixture", "Content-Type: message/delivery-status", "",
  "Reporting-MTA: dns; mx.ionos.com", `Original-Envelope-Id: ${attempt.id}`, "",
  `Final-Recipient: rfc822; ${attempt.recipient_email}`, "Action: failed", "Status: 5.1.1", "", "--fixture--", "",
].join("\r\n"));
beforeEach(() => {
  vi.useRealTimers(); vi.clearAllMocks(); vi.setSystemTime(new Date("2026-10-11T12:00:00.000Z"));
  mocks.createTransport.mockReturnValue({ sendMail: mocks.sendMail, close: mocks.smtpClose });
  mocks.sendMail.mockResolvedValue({ accepted: [invitation.recipientEmail], rejected: [] });
  mocks.connect.mockResolvedValue(undefined); mocks.lock.mockResolvedValue({ release: mocks.release });
  mocks.search.mockResolvedValue([42]); mocks.mailbox.readOnly = true;
  mocks.fetchOne.mockImplementation(async (_uid, query) => query.source ? { source } : { size: source.length, internalDate: new Date("2026-10-11T11:00:00.000Z") });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("IONOS invitation sending", () => {
  it("requires opt-in, exact approved sender and server-only credentials without exposing credentials in readiness", async () => {
    expect(getInvitationEmailReadiness({})).toMatchObject({ enabled: false, bounceSyncEnabled: false, sender: null });
    expect(getInvitationEmailReadiness({ ...configured, BLTZ_PREVIEW_EMAIL_FROM: "other@bltz.me" })).toMatchObject({ enabled: false, bounceSyncEnabled: false });
    expect(getInvitationEmailReadiness({ ...configured, BLTZ_PREVIEW_EMAIL_PASSWORD: "" })).toMatchObject({ enabled: false, bounceSyncEnabled: false });
    expect(getInvitationEmailReadiness({ ...configured, BLTZ_PREVIEW_EMAIL_ENABLED: "false" })).toMatchObject({ enabled: false, bounceSyncEnabled: true });
    expect(JSON.stringify(getInvitationEmailReadiness(configured))).not.toContain(configured.BLTZ_PREVIEW_EMAIL_PASSWORD);
    expect(await sendIonosInvitation(invitation, { ...configured, BLTZ_PREVIEW_EMAIL_ENABLED: "false" })).toEqual({ state: "send_failed", failureCode: "smtp_unavailable" });
    expect(mocks.createTransport).not.toHaveBeenCalled();
  });
  it("sends one plain-text invitation with fixed TLS, one envelope recipient, deterministic ID and DSN; acceptance is not delivery", async () => {
    expect(await sendIonosInvitation(invitation, configured)).toEqual({ state: "smtp_accepted", failureCode: null });
    expect(mocks.createTransport).toHaveBeenCalledWith(expect.objectContaining({ host: "smtp.ionos.com", port: 465, secure: true, pool: false,
      tls: { rejectUnauthorized: true, servername: "smtp.ionos.com", minVersion: "TLSv1.2" },
      connectionTimeout: 10_000, socketTimeout: 10_000, greetingTimeout: 10_000, dnsTimeout: 10_000,
      logger: false, debug: false, disableFileAccess: true, disableUrlAccess: true }));
    const mail = mocks.sendMail.mock.calls[0][0];
    expect(mail).toMatchObject({ from: { address: "dante@bltz.me" }, to: { address: invitation.recipientEmail },
      envelope: { from: "dante@bltz.me", to: [invitation.recipientEmail] }, messageId: invitation.messageId,
      headers: { "X-BLTZ-Invitation-ID": invitation.id }, dsn: { id: invitation.id, return: "headers", notify: ["failure", "delay", "success"], recipient: invitation.recipientEmail } });
    expect(mail.text).toContain(invitation.previewUrl); expect(mail.text).toContain("does not verify identity or establish ownership");
    expect(mail.html).toBeUndefined(); expect(mail.attachments).toBeUndefined(); expect(mail.cc).toBeUndefined(); expect(mail.bcc).toBeUndefined();
    expect(mocks.sendMail).toHaveBeenCalledTimes(1); expect(mocks.smtpClose).toHaveBeenCalledTimes(1);
  });
  it.each(["https://evil.example/preview-lockers/test", "https://bltz.vercel.app.evil.example/preview-lockers/test", "http://bltz.me/test", "https://user:secret@bltz.me/test", "not-a-url", "http://localhost:3000/preview-lockers/test", "https://bltz.vercel.app/preview-lockers/test?redirect=https://evil.example"])("rejects unapproved invitation URL without connecting: %s", async url => {
    expect(await sendIonosInvitation({ ...invitation, previewUrl: url }, configured)).toEqual({ state: "send_failed", failureCode: "smtp_rejected" });
    expect(mocks.createTransport).not.toHaveBeenCalled();
  });
  it("only permits localhost in explicit development and not the production runtime", async () => {
    const local = { ...invitation, previewUrl: "http://localhost:3000/preview-lockers/test" };
    expect((await sendIonosInvitation(local, { ...configured, BLTZ_ANALYTICS_ENVIRONMENT: "development", NODE_ENV: "development" })).state).toBe("smtp_accepted");
    mocks.createTransport.mockClear();
    expect((await sendIonosInvitation(local, { ...configured, BLTZ_ANALYTICS_ENVIRONMENT: "development", NODE_ENV: "production" })).state).toBe("send_failed");
    expect(mocks.createTransport).not.toHaveBeenCalled();
  });
  it.each([{ recipientEmail: "athlete@example.invalid,second@example.invalid" }, { recipientName: "Name\r\nBcc: stolen@example.invalid" }, { messageId: "bad\r\nid" }, { messageId: "<safe-but-unbound@bltz.me>" }, { id: "invalid" }])("rejects malformed identifiers, recipients or header controls before transport creation", async invalid => {
    expect((await sendIonosInvitation({ ...invitation, ...invalid }, configured)).state).toBe("send_failed");
    expect(mocks.createTransport).not.toHaveBeenCalled();
  });
  it.each([
    [{ code: "EAUTH", response: "private provider data" }, "send_failed", "smtp_auth_failed"],
    [{ code: "EENVELOPE", command: "RCPT TO", responseCode: 550 }, "send_failed", "smtp_rejected"],
    [{ code: "EMESSAGE", command: "DATA", responseCode: 451 }, "send_failed", "smtp_rejected"],
    [{ code: "EDNS" }, "send_failed", "smtp_unavailable"],
    [{ code: "ETIMEDOUT", command: "DATA" }, "send_uncertain", "smtp_uncertain"],
    [{ code: "ESOCKET", command: "DATA", response: "private token and mailbox" }, "send_uncertain", "smtp_uncertain"],
  ])("classifies SMTP failures without retrying or returning provider details", async (error, state, failureCode) => {
    mocks.sendMail.mockRejectedValue(error);
    expect(await sendIonosInvitation(invitation, configured)).toEqual({ state, failureCode });
    expect(mocks.sendMail).toHaveBeenCalledTimes(1); expect(mocks.smtpClose).toHaveBeenCalledTimes(1);
  });
  it("classifies rejection responses and inconclusive successful responses safely", async () => {
    mocks.sendMail.mockResolvedValue({ accepted: [], rejected: [invitation.recipientEmail] });
    expect((await sendIonosInvitation(invitation, configured)).state).toBe("send_failed");
    mocks.sendMail.mockResolvedValue({ accepted: [], rejected: [] });
    expect((await sendIonosInvitation(invitation, configured)).state).toBe("send_uncertain");
  });
  it("closes transport at the total deadline and does not automatically retry an uncertain send", async () => {
    vi.useFakeTimers(); mocks.sendMail.mockReturnValue(new Promise(() => {}));
    const sending = sendIonosInvitation(invitation, configured);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(await sending).toEqual({ state: "send_uncertain", failureCode: "smtp_uncertain" });
    expect(mocks.smtpClose).toHaveBeenCalledTimes(1); expect(mocks.sendMail).toHaveBeenCalledTimes(1);
  });
});

describe("scoped IONOS report collection", () => {
  it("never opens a mailbox when sync is disabled or there are no eligible attempts", async () => {
    expect(await collectIonosDeliveryReports([attempt], { ...configured, BLTZ_PREVIEW_EMAIL_BOUNCE_SYNC_ENABLED: "false" })).toEqual([]);
    expect(await collectIonosDeliveryReports([], configured)).toEqual([]);
    expect(await collectIonosDeliveryReports([{ ...attempt, created_at: "2026-01-01T00:00:00Z" }], configured)).toEqual([]);
    expect(mocks.imapConstructor).not.toHaveBeenCalled();
  });
  it("uses read-only INBOX, scoped MIME/BODY search, metadata size gate and capped BODY.PEEK source fetch", async () => {
    expect(await collectIonosDeliveryReports([attempt], configured)).toEqual([{ attemptId: attempt.id, receiptId: "937:42",
      messageId: attempt.message_id, recipient: attempt.recipient_email, action: "failed", status: "5.1.1", observedAt: "2026-10-11T11:00:00.000Z" }]);
    expect(mocks.imapConstructor).toHaveBeenCalledWith(expect.objectContaining({ host: "imap.ionos.com", port: 993, secure: true,
      logger: false, logRaw: false, emitLogs: false, disableAutoIdle: true, tls: { rejectUnauthorized: true, servername: "imap.ionos.com", minVersion: "TLSv1.2" } }));
    expect(mocks.lock).toHaveBeenCalledWith("INBOX", { readOnly: true });
    expect(mocks.search).toHaveBeenCalledWith({ since: new Date("2026-09-27T12:00:00Z"), smaller: MAX_DSN_BYTES + 1,
      header: { "Content-Type": "delivery-status" }, or: [{ body: attempt.id }, { body: attempt.message_id.slice(1, -1) }] }, { uid: true });
    expect(mocks.fetchOne.mock.calls).toEqual([[42, { size: true, internalDate: true }, { uid: true }],
      [42, { source: { start: 0, maxLength: MAX_DSN_BYTES } }, { uid: true }]]);
    expect(mocks.release).toHaveBeenCalledTimes(1); expect(mocks.imapClose).toHaveBeenCalled();
  });
  it("limits both eligible attempts and latest matching report UIDs to twenty", async () => {
    const attempts = Array.from({ length: 25 }, (_, index) => ({ ...attempt, id: `b17a0022-2026-4000-8000-${String(index + 1).padStart(12, "0")}` }));
    mocks.search.mockResolvedValue(Array.from({ length: 35 }, (_, i) => i + 1));
    mocks.fetchOne.mockResolvedValue({ size: MAX_DSN_BYTES + 1, internalDate: new Date() });
    expect(await collectIonosDeliveryReports(attempts, configured)).toEqual([]);
    expect(mocks.search.mock.calls[0][0].or).toHaveLength(40);
    expect(mocks.fetchOne.mock.calls.map(([uid]) => uid)).toEqual(Array.from({ length: 20 }, (_, i) => 35 - i));
    expect(mocks.fetchOne.mock.calls.every(([, query]) => !query.source)).toBe(true);
  });
  it("requires the selected mailbox to actually be read-only", async () => {
    mocks.mailbox.readOnly = false;
    await expect(collectIonosDeliveryReports([attempt], configured)).rejects.toThrow("IONOS delivery report sync unavailable");
    expect(mocks.search).not.toHaveBeenCalled(); expect(mocks.imapClose).toHaveBeenCalled();
  });
  it("does not parse truncated sources or ordinary matched mail", async () => {
    mocks.fetchOne.mockImplementation(async (_uid, query) => query.source ? { source: source.subarray(0, 100) } : { size: source.length, internalDate: new Date("2026-10-11T11:00:00Z") });
    expect(await collectIonosDeliveryReports([attempt], configured)).toEqual([]);
    const ordinary = Buffer.from(`Content-Type: text/plain\r\n\r\n${attempt.id}`);
    mocks.fetchOne.mockImplementation(async (_uid, query) => query.source ? { source: ordinary } : { size: ordinary.length, internalDate: new Date("2026-10-11T11:00:00Z") });
    expect(await collectIonosDeliveryReports([attempt], configured)).toEqual([]);
  });
  it("sanitizes connection errors and closes without performing mailbox writes", async () => {
    mocks.connect.mockRejectedValue(new Error("password and raw provider response"));
    await expect(collectIonosDeliveryReports([attempt], configured)).rejects.toThrow("IONOS delivery report sync unavailable");
    expect(mocks.lock).not.toHaveBeenCalled(); expect(mocks.imapClose).toHaveBeenCalled();
  });
  it("ends a stalled mailbox connection at the total deadline", async () => {
    vi.useFakeTimers(); mocks.connect.mockReturnValue(new Promise(() => {}));
    const collecting = collectIonosDeliveryReports([attempt], configured);
    const rejected = expect(collecting).rejects.toThrow("IONOS delivery report sync unavailable");
    await vi.advanceTimersByTimeAsync(25_000); await rejected;
    expect(mocks.imapClose).toHaveBeenCalled(); expect(mocks.search).not.toHaveBeenCalled();
  });
});




