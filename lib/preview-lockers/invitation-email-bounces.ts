import "server-only";
import { z } from "zod";
import { Receiver } from "@upstash/qstash";
import { createServiceClient } from "@/lib/supabase/service";
import { collectIonosDeliveryReports, getInvitationEmailReadiness } from "./ionos-email";
import { getPreviewEmailEnvironment } from "./invitation-email-server";
type Env = Record<string, string | undefined>;
const path = "/api/internal/preview-email/check-bounces";
export async function verifyPreviewEmailBounceSignature(request: Request, rawBody: string, env: Env = process.env): Promise<boolean> {
  const signature = request.headers.get("upstash-signature");
  const currentSigningKey = env.QSTASH_CURRENT_SIGNING_KEY, nextSigningKey = env.QSTASH_NEXT_SIGNING_KEY;
  if (!signature || signature.length > 4096 || !currentSigningKey || !nextSigningKey) return false;
  try {
    const url = new URL(env.BLTZ_PREVIEW_EMAIL_BOUNCE_WORKER_URL || "https://bltz.vercel.app" + path);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== path
      || (env.VERCEL_ENV === "production" && url.origin !== "https://bltz.vercel.app")) return false;
    return await new Receiver({ currentSigningKey, nextSigningKey, devMode: false }).verify({ signature, body: rawBody, url: url.href, clockTolerance: 5 });
  } catch { return false; }
}
const pendingSchema = z.array(z.object({ id: z.string().uuid(), message_id: z.string().min(1).max(100),
  recipient_email: z.string().email().max(254), created_at: z.string().datetime({offset:true}) }).strict()).max(20);
const receiptResult = z.object({ recorded: z.boolean(), duplicate: z.boolean(), state: z.string() }).strict();
export async function checkPreviewEmailBounces(env: Env = process.env) {
  if (!getInvitationEmailReadiness(env).bounceSyncEnabled) return { disabled: true, checked: 0, recorded: 0, duplicates: 0 };
  const service = createServiceClient(), environment = getPreviewEmailEnvironment(env);
  const pending = await service.rpc("pending_preview_invitation_email_checks", { p_environment: environment });
  const attempts = pendingSchema.safeParse(pending.data);
  if (pending.error || !attempts.success) throw new Error("invitation_email_checks_unavailable");
  const reports = await collectIonosDeliveryReports(attempts.data, env);
  let recorded = 0, duplicates = 0;
  // Metadata-only idempotent receipts; no original mail or recipient is returned by this worker.
  for (const report of reports.slice(0, 20)) {
    const result = await service.rpc("record_preview_invitation_dsn", { p_id: report.attemptId, p_environment: environment,
      p_receipt_id: report.receiptId, p_message_id: report.messageId, p_recipient: report.recipient,
      p_action: report.action, p_status: report.status, p_observed_at: report.observedAt });
    const receipt = receiptResult.safeParse(result.data);
    if (result.error || !receipt.success || !receipt.data.recorded) throw new Error("invitation_email_receipt_unavailable");
    if (receipt.data.duplicate) duplicates++; else recorded++;
  }
  return { disabled: false, checked: attempts.data.length, recorded, duplicates };
}
