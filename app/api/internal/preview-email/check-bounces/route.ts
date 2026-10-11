import { z } from "zod";
import { AnalyticsBodyLimitError, readBoundedBody } from "@/lib/analytics/delivery/http";
import { checkPreviewEmailBounces, verifyPreviewEmailBounceSignature } from "@/lib/preview-lockers/invitation-email-bounces";
import { json } from "@/lib/preview-lockers/server";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    let raw: string;
    try { raw = await readBoundedBody(request, 1024); }
    catch (error) { return json({ error: "invalid_job_body" }, error instanceof AnalyticsBodyLimitError ? 413 : 400); }
    if (!await verifyPreviewEmailBounceSignature(request, raw)) return json({ error: "invalid_signature" }, 401);
    let value: unknown;
    try { value = JSON.parse(raw); } catch { return json({ error: "invalid_job" }, 400); }
    if (!z.object({}).strict().safeParse(value).success) return json({ error: "invalid_job" }, 400);
    return json(await checkPreviewEmailBounces());
  } catch { return json({ error: "invitation_email_checks_unavailable" }, 503); }
}
