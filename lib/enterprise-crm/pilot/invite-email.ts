import "server-only";

import nodemailer from "nodemailer";
import { getInvitationEmailReadiness } from "@/lib/preview-lockers/ionos-email";
import { invitationEmailAddress } from "@/lib/preview-lockers/ionos-dsn";

const SENDER = "dante@bltz.me";
const SMTP_BUDGET_MS = 20_000;
const APPROVED_ORIGINS = new Set(["https://bltz.me", "https://www.bltz.me", "https://bltz.vercel.app"]);

function plain(value: string, maximum: number): string | null {
  const text = value.trim();
  return text && text.length <= maximum && !/[\x00-\x1f\x7f]/.test(text) ? text : null;
}

/** Only links to a BLTZ /join page go out; local links are allowed outside production for testing. */
export function validJoinUrl(value: string, env: Record<string, string | undefined> = process.env): boolean {
  try {
    const url = new URL(value);
    const local = env.NODE_ENV !== "production" && env.VERCEL_ENV !== "production" && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
    return (APPROVED_ORIGINS.has(url.origin) || local) && !url.username && !url.password && !url.hash && !url.search && /^\/join\/[A-Za-z0-9_-]{32}$/.test(url.pathname);
  } catch {
    return false;
  }
}

export function inviteEmailText(input: { athleteName: string; organizationName: string; joinUrl: string }): { subject: string; text: string } {
  const first = input.athleteName.split(/\s+/)[0];
  return {
    subject: `${input.organizationName} invited you to claim your BLTZ Locker`,
    text: [
      `Hi ${first},`,
      "",
      `${input.organizationName} is working with BLTZ to celebrate its former players, and invited you to claim your Locker: a page for your career, stats, photos and video that fans can visit. You decide what is on it.`,
      "",
      `Claim your Locker here:`,
      input.joinUrl,
      "",
      `This link is personal to you. If you were not expecting it, you can ignore this email.`,
      "",
      "BLTZ",
    ].join("\n"),
  };
}

/** Sends one invite from the BLTZ mailbox on the organization's behalf. "sent" means the mail server accepted it. */
export async function sendInviteEmail(input: { inviteId: string; recipientEmail: string; athleteName: string; organizationName: string; joinUrl: string }, env: Record<string, string | undefined> = process.env): Promise<"sent" | "not_configured" | "failed"> {
  if (!getInvitationEmailReadiness(env).enabled) return "not_configured";
  const recipient = invitationEmailAddress(input.recipientEmail);
  const athleteName = plain(input.athleteName, 200);
  const organizationName = plain(input.organizationName, 200);
  if (!recipient || !athleteName || !organizationName || !validJoinUrl(input.joinUrl, env)) return "failed";
  const transport = nodemailer.createTransport({
    host: "smtp.ionos.com", port: 465, secure: true, pool: false,
    auth: { user: SENDER, pass: env.BLTZ_PREVIEW_EMAIL_PASSWORD! },
    tls: { rejectUnauthorized: true, servername: "smtp.ionos.com", minVersion: "TLSv1.2" },
    connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 10_000, dnsTimeout: 10_000,
    logger: false, debug: false, disableFileAccess: true, disableUrlAccess: true,
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const message = inviteEmailText({ athleteName, organizationName, joinUrl: input.joinUrl });
    const info = await Promise.race([
      transport.sendMail({
        from: { name: `BLTZ for ${organizationName}`, address: SENDER }, to: { name: athleteName, address: recipient },
        envelope: { from: SENDER, to: [recipient] }, messageId: `<bltz-invite-${input.inviteId}@bltz.me>`,
        headers: { "X-BLTZ-Invite-ID": input.inviteId }, subject: message.subject, text: message.text,
        disableFileAccess: true, disableUrlAccess: true,
      }),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("SMTP deadline exceeded")), SMTP_BUDGET_MS); }),
    ]);
    return info.accepted?.length === 1 && !info.rejected?.length ? "sent" : "failed";
  } catch {
    return "failed";
  } finally {
    if (timer) clearTimeout(timer);
    transport.close();
  }
}
