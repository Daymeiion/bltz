import "server-only";
import { z } from "zod";
import { previewAdmin } from "./server";
import { getInvitationEmailReadiness } from "./ionos-email";
import { invitationEmailRegistryReportSchema, type InvitationEmailReport } from "./invitation-email";

/** The registry report is Admin-only and exports no mailbox secrets or private link tokens. */
export async function loadInvitationEmailReport({ previewId }: { previewId?: string | null } = {}): Promise<InvitationEmailReport> {
  const { client } = await previewAdmin();
  const readiness = getInvitationEmailReadiness();
  const empty: InvitationEmailReport = { previewId: previewId ?? null, status: "unselected", reason: "no_preview_selected",
    readiness, totalAttempts: null, limited: false, counts: null, attempts: [] };
  if (!previewId) return empty;
  if (!z.uuid().safeParse(previewId).success) return { ...empty, status: "unavailable", reason: "invalid_preview" };
  try {
    const result = await client.rpc("preview_invitation_email_report", { p_preview: previewId,
      p_environment: process.env.VERCEL_ENV === "production" ? "production" : "development" }).abortSignal(AbortSignal.timeout(10_000));
    if (result.error) throw new Error("invitation_report_unavailable");
    const parsed = invitationEmailRegistryReportSchema.parse(result.data);
    if (parsed.preview_id !== previewId) throw new Error("invitation_report_scope_invalid");
    return { ...empty, status: "available", reason: null, totalAttempts: parsed.total_attempts, limited: parsed.limited,
      counts: parsed.counts, attempts: parsed.attempts };
  } catch {
    return { ...empty, status: "unavailable", reason: "invitation_report_unavailable" };
  }
}
