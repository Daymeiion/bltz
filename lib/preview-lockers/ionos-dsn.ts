import "server-only";
import { simpleParser } from "mailparser";

export const MAX_DSN_BYTES = 256 * 1024;
export type InvitationReportAttempt = {
  id: string;
  message_id: string;
  recipient_email: string;
  created_at: string;
};
export type InvitationDeliveryReport = {
  attemptId: string;
  receiptId: string;
  messageId: string;
  recipient: string;
  action: "delivered" | "failed" | "delayed";
  status: string;
  observedAt: string;
};
export type DeliveryReportReceipt = { uidValidity: string; uid: number; internalDate: Date };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function invitationEmailAddress(value: string): string | null {
  if (value.length > 254 || !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}$/.test(value)) return null;
  return value.toLowerCase();
}
export function invitationMessageId(value: string): string | null {
  const normalized = value.replace(/^<([^<>]+)>$/, "$1");
  return normalized.length <= 254 && /^[^<>\s@]+@[^<>\s@]+$/.test(normalized) ? normalized : null;
}
export function validInvitationReportAttempt(attempt: InvitationReportAttempt, now = Date.now()): boolean {
  const created = Date.parse(attempt.created_at);
  return uuid.test(attempt.id) && invitationMessageId(attempt.message_id) !== null && invitationEmailAddress(attempt.recipient_email) !== null
    && Number.isFinite(created) && created <= now && created >= now - 14 * 24 * 60 * 60 * 1000;
}

// RFC 3464 fields are header-like blocks. Ambiguous duplicate fields fail closed.
function fields(block: string): Map<string, string> | null {
  const result = new Map<string, string>();
  for (const line of block.replace(/\r\n/g, "\n").replace(/\n[ \t]+/g, " ").split("\n")) {
    if (!line.trim()) continue;
    const match = /^([A-Za-z0-9-]+):[ \t]*(.*)$/.exec(line);
    if (!match || result.has(match[1].toLowerCase())) return null;
    result.set(match[1].toLowerCase(), match[2].trim());
  }
  return result;
}
function recipientField(value: string | undefined): string | null {
  const match = value && /^rfc822\s*;\s*(.+)$/i.exec(value);
  return match ? invitationEmailAddress(match[1]) : null;
}

/** A matched mailbox report is evidence reported by email, not cryptographic proof of delivery. */
export async function parseIonosDeliveryReport(source: Buffer, attempts: InvitationReportAttempt[], receipt: DeliveryReportReceipt): Promise<InvitationDeliveryReport[]> {
  const observed = receipt.internalDate.getTime();
  if (!source.length || source.length > MAX_DSN_BYTES || !/^[1-9]\d*$/.test(receipt.uidValidity)
    || !Number.isSafeInteger(receipt.uid) || receipt.uid < 1 || !Number.isFinite(observed) || observed > Date.now() + 5 * 60 * 1000) return [];
  try {
    const mail = await simpleParser(source, {
      keepDeliveryStatus: true, skipHtmlToText: true, skipTextToHtml: true,
      skipImageLinks: true, skipTextLinks: true, maxHtmlLengthToParse: 0,
    });
    const contentType = mail.headers.get("content-type");
    if (!contentType || typeof contentType !== "object" || !("value" in contentType) || !("params" in contentType)
      || contentType.value !== "multipart/report" || contentType.params?.["report-type"] !== "delivery-status") return [];
    const statuses = mail.attachments.filter(part => part.contentType === "message/delivery-status");
    if (statuses.length !== 1) return [];
    const blocks = statuses[0].content.toString("utf8").replace(/\r\n/g, "\n").trim().split(/\n[ \t]*\n/);
    if (blocks.length < 2) return [];
    const perMessage = fields(blocks[0]);
    if (!perMessage?.get("reporting-mta")) return [];
    const envelopeId = perMessage.get("original-envelope-id");
    if (envelopeId && !uuid.test(envelopeId)) return [];
    const originalIds = new Set<string>();
    for (const part of mail.attachments.filter(part => ["message/rfc822", "text/rfc822-headers"].includes(part.contentType))) {
      const originalHeaders = part.content.toString("utf8").split(/\r?\n\r?\n/, 1)[0].replace(/\r\n/g, "\n").replace(/\n[ \t]+/g, " ");
      const messageIdHeaders = originalHeaders.split("\n").filter(line => /^message-id:/i.test(line));
      if (messageIdHeaders.length > 1) return [];
      const id = messageIdHeaders[0]?.replace(/^message-id:[ \t]*/i, "").trim();
      if (id) {
        const normalized = invitationMessageId(id);
        if (!normalized) return [];
        originalIds.add(normalized);
      }
    }
    if (originalIds.size > 1) return [];
    const returnedId = [...originalIds][0];
    if (!envelopeId && !returnedId) return [];
    const matches = attempts.filter(attempt => {
      const ownId = invitationMessageId(attempt.message_id);
      return (!envelopeId || attempt.id.toLowerCase() === envelopeId.toLowerCase()) && (!returnedId || ownId === returnedId);
    });
    if (matches.length !== 1) return [];
    const attempt = matches[0];
    const created = Date.parse(attempt.created_at);
    if (!Number.isFinite(created) || observed < created || !invitationEmailAddress(attempt.recipient_email)) return [];
    const reports: InvitationDeliveryReport[] = [];
    for (const block of blocks.slice(1)) {
      const perRecipient = fields(block);
      if (!perRecipient) return [];
      const recipient = recipientField(perRecipient.get("final-recipient"));
      const originalRecipient = perRecipient.get("original-recipient");
      const action = perRecipient.get("action");
      const status = perRecipient.get("status");
      if (!recipient || recipient !== invitationEmailAddress(attempt.recipient_email)
        || (originalRecipient && recipientField(originalRecipient) !== recipient)
        || !action || !status || !/^[245]\.\d{1,3}\.\d{1,3}$/.test(status)) continue;
      if ((action === "delivered" && status.startsWith("2.")) || (action === "failed" && status.startsWith("5.")) || (action === "delayed" && status.startsWith("4."))) {
        reports.push({ attemptId: attempt.id, receiptId: `${receipt.uidValidity}:${receipt.uid}`, messageId: attempt.message_id,
          recipient, action, status, observedAt: receipt.internalDate.toISOString() });
      }
    }
    // One-recipient invitations must not acquire contradictory results from a malformed report.
    return reports.length === 1 ? reports : [];
  } catch {
    return [];
  }
}

