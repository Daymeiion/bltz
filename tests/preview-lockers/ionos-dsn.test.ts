// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_DSN_BYTES, parseIonosDeliveryReport, type InvitationReportAttempt } from "@/lib/preview-lockers/ionos-dsn";

const attempt: InvitationReportAttempt = {
  id: "b17a0022-2026-4000-8000-000000000001", message_id: "<bltz-preview-b17a0022-2026-4000-8000-000000000001@bltz.me>",
  recipient_email: "athlete@example.invalid", created_at: "2026-10-11T10:00:00.000Z",
};
const receipt = { uidValidity: "937", uid: 42, internalDate: new Date("2026-10-11T11:00:00.000Z") };
function report(options: { action?: string; status?: string; envelope?: string | null; recipient?: string; originalId?: string | null; type?: string; extra?: string } = {}) {
  const envelope = options.envelope === null ? "" : `Original-Envelope-Id: ${options.envelope ?? attempt.id}\r\n`;
  const originalId = options.originalId === null ? "" : options.originalId ?? attempt.message_id;
  return Buffer.from([
    "From: Mail Delivery System <mailer-daemon@ionos.com>", "To: dante@bltz.me", "Date: Sun, 11 Oct 2099 12:00:00 +0000",
    "Message-ID: <outer-report@ionos.com>", "MIME-Version: 1.0",
    `Content-Type: multipart/report; report-type=${options.type ?? "delivery-status"}; boundary=bltz-report`, "", "--bltz-report",
    "Content-Type: text/plain; charset=utf-8", "", "This is an automatically generated delivery report.", "--bltz-report",
    "Content-Type: message/delivery-status", "", `Reporting-MTA: dns; mx.ionos.com\r\n${envelope}`,
    `Final-Recipient: rfc822; ${options.recipient ?? attempt.recipient_email}`,
    `Action: ${options.action ?? "failed"}`, `Status: ${options.status ?? "5.1.1"}`, "Diagnostic-Code: smtp; private diagnostic and recipient content",
    options.extra ?? "", "", "--bltz-report", "Content-Type: text/rfc822-headers", "",
    "Received: from first.example by second.example", "Received: from second.example by third.example",
    originalId ? `Message-ID: ${originalId}` : "Subject: no original message ID", "", "--bltz-report--", "",
  ].join("\r\n"));
}
afterEach(() => vi.useRealTimers());

describe("strict RFC 3464 invitation reports", () => {
  it.each([["delivered", "2.0.0"], ["failed", "5.1.1"], ["delayed", "4.2.0"]])("matches %s with a consistent enhanced status", async (action, status) => {
    vi.setSystemTime(new Date("2026-10-11T12:00:00.000Z"));
    const reports = await parseIonosDeliveryReport(report({ action, status }), [attempt], receipt);
    expect(reports).toEqual([{ attemptId: attempt.id, receiptId: "937:42", messageId: attempt.message_id,
      recipient: attempt.recipient_email, action, status, observedAt: "2026-10-11T11:00:00.000Z" }]);
    expect(JSON.stringify(reports)).not.toContain("Diagnostic");
    expect(JSON.stringify(reports)).not.toContain("2099");
  });
  it("matches an original Message-ID when the envelope ID is not returned, including repeated Received headers", async () => {
    expect(await parseIonosDeliveryReport(report({ envelope: null }), [attempt], receipt)).toHaveLength(1);
  });
  it("matches the Message-ID from returned message/rfc822 content", async () => {
    const returnedMessage = Buffer.from(report({ envelope: null }).toString().replace("Content-Type: text/rfc822-headers", "Content-Type: message/rfc822"));
    expect(await parseIonosDeliveryReport(returnedMessage, [attempt], receipt)).toHaveLength(1);
  });
  it("matches the envelope ID without returned message headers and normalizes recipient casing", async () => {
    expect(await parseIonosDeliveryReport(report({ originalId: null, recipient: "ATHLETE@EXAMPLE.INVALID" }), [attempt], receipt)).toHaveLength(1);
  });
  it.each([
    { recipient: "other@example.invalid" }, { envelope: "b17a0022-2026-4000-8000-000000000002" },
    { originalId: "<unrelated@bltz.me>" }, { action: "delivered", status: "5.1.1" }, { action: "failed", status: "2.0.0" },
    { action: "delayed", status: "5.0.0" }, { action: "relayed", status: "2.0.0" }, { status: "5.99999.1" },
    { type: "disposition-notification" }, { envelope: null, originalId: null }, { extra: "Action: delivered" },
    { extra: "Original-Recipient: rfc822; different@example.invalid" },
  ])("ignores unrelated, malformed or inconsistent reports: %j", async options => {
    expect(await parseIonosDeliveryReport(report(options), [attempt], receipt)).toEqual([]);
  });
  it("ignores ordinary mail mentioning the invitation and an outer Message-ID that copies the known ID", async () => {
    const ordinary = Buffer.from(`From: sender@example.invalid\r\nMessage-ID: ${attempt.message_id}\r\nContent-Type: text/plain\r\n\r\n${attempt.id}\r\nAction: failed\r\nStatus: 5.1.1`);
    expect(await parseIonosDeliveryReport(ordinary, [attempt], receipt)).toEqual([]);
  });
  it("ignores unknown attempts, ambiguous duplicated attempts and oversized sources", async () => {
    expect(await parseIonosDeliveryReport(report(), [], receipt)).toEqual([]);
    expect(await parseIonosDeliveryReport(report(), [attempt, attempt], receipt)).toEqual([]);
    expect(await parseIonosDeliveryReport(Buffer.alloc(MAX_DSN_BYTES + 1), [attempt], receipt)).toEqual([]);
  });
  it("rejects invalid receipt IDs, an earlier receipt and a future internal date", async () => {
    expect(await parseIonosDeliveryReport(report(), [attempt], { ...receipt, uid: 0 })).toEqual([]);
    expect(await parseIonosDeliveryReport(report(), [attempt], { ...receipt, uidValidity: "0" })).toEqual([]);
    expect(await parseIonosDeliveryReport(report(), [attempt], { ...receipt, internalDate: new Date("2026-10-11T09:00:00Z") })).toEqual([]);
    expect(await parseIonosDeliveryReport(report(), [attempt], { ...receipt, internalDate: new Date(Date.now() + 3600_000) })).toEqual([]);
  });
});


