import "server-only";
import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";
import { invitationEmailAddress, invitationMessageId, MAX_DSN_BYTES, parseIonosDeliveryReport, validInvitationReportAttempt,
  type InvitationDeliveryReport, type InvitationReportAttempt } from "./ionos-dsn";

type InvitationEmailEnv = Record<string, string | undefined>;
const SENDER = "dante@bltz.me";
const SMTP_BUDGET_MS = 20_000;
const IMAP_BUDGET_MS = 25_000;
const approvedOrigins = new Set(["https://bltz.me", "https://www.bltz.me", "https://bltz.vercel.app"]);
export type InvitationEmailReadiness = { enabled: boolean; bounceSyncEnabled: boolean; sender: string | null; reason: string | null };
export type IonosInvitationInput = { id: string; messageId: string; recipientEmail: string; recipientName: string; previewName: string; previewUrl: string };
export type IonosSendResult = { state: "smtp_accepted" | "send_failed" | "send_uncertain";
  failureCode: "smtp_rejected" | "smtp_auth_failed" | "smtp_unavailable" | "smtp_uncertain" | null };

export function getInvitationEmailReadiness(env: InvitationEmailEnv = process.env): InvitationEmailReadiness {
  const sender = env.BLTZ_PREVIEW_EMAIL_FROM?.trim() === SENDER ? SENDER : null;
  const credentialsReady = Boolean(sender && env.BLTZ_PREVIEW_EMAIL_PASSWORD?.trim());
  const requestedSending = env.BLTZ_PREVIEW_EMAIL_ENABLED === "true";
  const requestedSync = env.BLTZ_PREVIEW_EMAIL_BOUNCE_SYNC_ENABLED === "true";
  return { enabled: requestedSending && credentialsReady, bounceSyncEnabled: requestedSync && credentialsReady, sender,
    reason: !requestedSending && !requestedSync ? "Invitation email sending and bounce checks are disabled."
      : !sender ? "The approved invitation sender is not configured."
      : !credentialsReady ? "The invitation mailbox password is not configured." : null };
}
function validPreviewUrl(value: string, env: InvitationEmailEnv): boolean {
  try {
    const url = new URL(value);
    const local = env.BLTZ_ANALYTICS_ENVIRONMENT === "development" && env.NODE_ENV !== "production" && env.VERCEL_ENV !== "production"
      && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
    return (approvedOrigins.has(url.origin) || local) && !url.username && !url.password && !url.hash && !url.search
      && /^\/(?:preview-lockers\/|[a-z0-9]+(?:-[a-z0-9]+)*$)/.test(url.pathname);
  } catch { return false; }
}
function safeText(value: string, maximum: number): boolean {
  return Boolean(value.trim()) && value.length <= maximum && !/[\x00-\x1f\x7f]/.test(value);
}
function failed(code: NonNullable<IonosSendResult["failureCode"]>): IonosSendResult {
  return { state: code === "smtp_uncertain" ? "send_uncertain" : "send_failed", failureCode: code };
}
function classifySendFailure(error: unknown): IonosSendResult {
  const smtp = error && typeof error === "object" ? error as { code?: string; command?: string; responseCode?: number } : {};
  if (smtp.code === "EAUTH") return failed("smtp_auth_failed");
  if (smtp.responseCode && smtp.responseCode >= 400 && smtp.responseCode <= 599
    && ["RCPT TO", "DATA", "MAIL FROM"].includes(smtp.command ?? "")) return failed("smtp_rejected");
  // Connection setup/auth failures cannot have accepted the message; post-DATA timeouts can.
  if (["CONN", "EHLO", "HELO", "STARTTLS", "AUTH"].includes(smtp.command ?? "")
    || ["EDNS", "ECONNECTION", "ETLS"].includes(smtp.code ?? "")) return failed("smtp_unavailable");
  return failed("smtp_uncertain");
}

/** A successful SMTP response means acceptance by IONOS, never confirmed recipient delivery. */
export async function sendIonosInvitation(input: IonosInvitationInput, env: InvitationEmailEnv = process.env): Promise<IonosSendResult> {
  const readiness = getInvitationEmailReadiness(env);
  if (!readiness.enabled) return failed("smtp_unavailable");
  const recipient = invitationEmailAddress(input.recipientEmail);
  if (!recipient || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.id)
    || input.messageId !== `<bltz-preview-${input.id}@bltz.me>` || !safeText(input.recipientName, 200) || !safeText(input.previewName, 200)
    || !validPreviewUrl(input.previewUrl, env)) return failed("smtp_rejected");
  const transport = nodemailer.createTransport({
    host: "smtp.ionos.com", port: 465, secure: true, pool: false,
    auth: { user: SENDER, pass: env.BLTZ_PREVIEW_EMAIL_PASSWORD! },
    tls: { rejectUnauthorized: true, servername: "smtp.ionos.com", minVersion: "TLSv1.2" },
    connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 10_000, dnsTimeout: 10_000,
    logger: false, debug: false, disableFileAccess: true, disableUrlAccess: true,
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const info = await Promise.race([
      transport.sendMail({ from: { name: "BLTZ", address: SENDER }, to: { name: input.recipientName, address: recipient },
        envelope: { from: SENDER, to: [recipient] }, messageId: input.messageId,
        headers: { "X-BLTZ-Invitation-ID": input.id },
        dsn: { id: input.id, return: "headers", notify: ["failure", "delay", "success"], recipient },
        subject: `Your BLTZ preview locker: ${input.previewName}`,
        text: `Hi ${input.recipientName},\n\nBLTZ has prepared a preview locker for ${input.previewName}. You can review the career information and connected media here:\n\n${input.previewUrl}\n\nThis is a preview invitation. Reviewing the locker or submitting the interest form does not verify identity or establish ownership.\n\nIf you have questions or need a correction, reply to this email.\n\nDante\nBLTZ`,
        disableFileAccess: true, disableUrlAccess: true,
      }),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("SMTP deadline exceeded")), SMTP_BUDGET_MS); }),
    ]);
    const accepted = info.accepted?.map(address => invitationEmailAddress(address));
    if (accepted?.length === 1 && accepted[0] === recipient && !info.rejected?.length) return { state: "smtp_accepted", failureCode: null };
    return info.rejected?.length ? failed("smtp_rejected") : failed("smtp_uncertain");
  } catch (error) {
    return classifySendFailure(error);
  } finally {
    if (timer) clearTimeout(timer);
    transport.close();
  }
}

/** Only scoped RFC 3464 reports are read. No flags, folders or mailbox contents are changed. */
export async function collectIonosDeliveryReports(attempts: InvitationReportAttempt[], env: InvitationEmailEnv = process.env): Promise<InvitationDeliveryReport[]> {
  if (!getInvitationEmailReadiness(env).bounceSyncEnabled || !attempts.length) return [];
  const now = Date.now();
  const scoped = attempts.filter(attempt => validInvitationReportAttempt(attempt, now))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0, 20);
  if (!scoped.length) return [];
  const client = new ImapFlow({ host: "imap.ionos.com", port: 993, secure: true,
    auth: { user: SENDER, pass: env.BLTZ_PREVIEW_EMAIL_PASSWORD! },
    tls: { rejectUnauthorized: true, servername: "imap.ionos.com", minVersion: "TLSv1.2" },
    connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 10_000,
    logger: false, logRaw: false, emitLogs: false, disableAutoIdle: true, disableCompression: true, disableBinary: true,
  });
  // ImapFlow emits asynchronous errors as well as rejecting its command promise. Never log mailbox data.
  client.on("error", () => {});
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  let release: (() => void) | undefined;
  try {
    return await Promise.race([
      (async () => {
        await client.connect();
        if (stopped) return [];
        const lock = await client.getMailboxLock("INBOX", { readOnly: true });
        release = () => lock.release();
        if (stopped) return [];
        if (!client.mailbox || !client.mailbox.readOnly) throw new Error("Read-only mailbox required");
        const uidValidity = String(client.mailbox.uidValidity);
        const matches = await client.search({ since: new Date(now - 14 * 24 * 60 * 60 * 1000), smaller: MAX_DSN_BYTES + 1,
          header: { "Content-Type": "delivery-status" }, or: scoped.flatMap(attempt => [{ body: attempt.id }, { body: invitationMessageId(attempt.message_id)! }]),
        }, { uid: true });
        if (stopped || !Array.isArray(matches)) return [];
        const uids = [...new Set(matches)].filter(uid => Number.isSafeInteger(uid) && uid > 0).sort((a, b) => b - a).slice(0, 20);
        const reports: InvitationDeliveryReport[] = [];
        for (const uid of uids) {
          if (stopped) break;
          const metadata = await client.fetchOne(uid, { size: true, internalDate: true }, { uid: true });
          if (stopped || !metadata || !metadata.size || metadata.size > MAX_DSN_BYTES || !metadata.internalDate) continue;
          // ImapFlow fetch source uses BODY.PEEK[], never BODY[], with a hard partial byte cap.
          const message = await client.fetchOne(uid, { source: { start: 0, maxLength: MAX_DSN_BYTES } }, { uid: true });
          if (stopped || !message || !message.source || message.source.length !== metadata.size) continue;
          reports.push(...await parseIonosDeliveryReport(message.source, scoped, { uidValidity, uid, internalDate: typeof metadata.internalDate === "string" ? new Date(metadata.internalDate) : metadata.internalDate }));
        }
        return reports;
      })(),
      new Promise<never>((_, reject) => { timer = setTimeout(() => { stopped = true; client.close(); reject(new Error("IONOS report deadline exceeded")); }, IMAP_BUDGET_MS); }),
    ]);
  } catch {
    throw new Error("IONOS delivery report sync unavailable");
  } finally {
    stopped = true;
    if (timer) clearTimeout(timer);
    release?.();
    client.close();
  }
}



