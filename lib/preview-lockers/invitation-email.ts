import { z } from "zod";

export const invitationEmailStates = ["prepared", "sending", "smtp_accepted", "delivery_delayed", "delivery_reported", "bounced", "send_failed", "send_uncertain"] as const;
export type InvitationEmailState = typeof invitationEmailStates[number];
export const invitationEmailLabels: Record<InvitationEmailState, string> = {
  prepared: "Prepared", sending: "Sending", smtp_accepted: "Accepted by SMTP", delivery_delayed: "Delivery delayed",
  delivery_reported: "Delivery reported", bounced: "Bounced", send_failed: "Send failed", send_uncertain: "Outcome uncertain",
};
export const invitationEmailRequestSchema = z.object({ contactId: z.uuid(), requestId: z.uuid(), confirmed: z.literal(true) }).strict();
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const timestamp = z.string().datetime({ offset: true });
export const invitationEmailAttemptSchema = z.object({
  id: z.uuid(), state: z.enum(invitationEmailStates), recipient_masked: z.string().min(1).max(254).refine(value => value.includes("*")),
  created_at: timestamp, updated_at: timestamp, smtp_accepted_at: timestamp.nullable(), report_at: timestamp.nullable(),
  failure_code: z.enum(["smtp_rejected", "smtp_auth_failed", "smtp_unavailable", "smtp_uncertain"]).nullable(),
}).strict();
export const invitationEmailRegistryReportSchema = z.object({
  preview_id: z.uuid(), total_attempts: count, limited: z.boolean(),
  counts: z.object({ prepared: count, sending: count, smtp_accepted: count, delivery_delayed: count,
    delivery_reported: count, bounced: count, send_failed: count, send_uncertain: count }).strict(),
  attempts: z.array(invitationEmailAttemptSchema).max(20),
}).strict().superRefine((value, context) => {
  if (Object.values(value.counts).reduce((sum, amount) => sum + amount, 0) !== value.total_attempts
    || value.attempts.length > value.total_attempts || new Set(value.attempts.map(row => row.id)).size !== value.attempts.length) {
    context.addIssue({ code: "custom", message: "Invitation email report totals are inconsistent" });
  }
});
export type InvitationEmailReadinessView = { enabled: boolean; bounceSyncEnabled: boolean; sender: string | null; reason: string | null };
export type InvitationEmailReport = {
  previewId: string | null; status: "available" | "unavailable" | "unselected"; reason: string | null;
  readiness: InvitationEmailReadinessView; totalAttempts: number | null; limited: boolean;
  counts: Record<InvitationEmailState, number> | null; attempts: z.infer<typeof invitationEmailAttemptSchema>[];
};
export type InvitationEmailContact = { id: string; label: string; email: string };
