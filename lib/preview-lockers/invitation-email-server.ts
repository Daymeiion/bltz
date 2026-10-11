import "server-only";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { previewAdmin, PreviewError } from "./server";
import { getInvitationEmailReadiness, sendIonosInvitation } from "./ionos-email";

import { invitationEmailRequestSchema, invitationEmailStates } from "./invitation-email";
export const invitationEmailInput = invitationEmailRequestSchema;
const states = z.enum(invitationEmailStates);
const contextSchema = z.object({ id: z.string().uuid(), preview_id: z.string().uuid(), recipient_email: z.string().email().max(254),
  recipient_name: z.string().min(1).max(200), preview_name: z.string().min(1).max(200), short_alias: z.string().min(3).max(70).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  state: states, message_id: z.string().max(100), created_at: z.string().datetime({offset:true}), should_send: z.boolean() }).strict();
const settlementSchema = z.object({ settled: z.boolean(), duplicate: z.boolean().optional(), state: states }).strict();
type Env = Record<string, string | undefined>;
export function getPreviewEmailEnvironment(env: Env = process.env): "development" | "production" {
  return env.VERCEL_ENV === "production" ? "production" : "development";
}
const messages: Record<z.infer<typeof states>, string> = {
  prepared: "Invitation prepared; nothing has been sent.", sending: "This invitation is already being sent. Check its status before starting another attempt.",
  smtp_accepted: "IONOS accepted this invitation for sending. Recipient delivery is not yet confirmed.",
  delivery_delayed: "A delivery delay was reported.", delivery_reported: "Delivery was reported by email; this does not confirm that the recipient read it.",
  bounced: "A bounce was reported. Review the recipient before sending again.", send_failed: "Sending failed. Review the failure before preparing another attempt.",
  send_uncertain: "The send outcome is uncertain. Check the invitation and mailbox before sending again.",
};
export async function sendPreviewInvitationEmail(previewId: string, input: z.infer<typeof invitationEmailInput>, env: Env = process.env) {
  // Authentication/authorization stays inside the callable server boundary as well as its route.
  const { client } = await previewAdmin();
  if (!z.string().uuid().safeParse(previewId).success || !invitationEmailInput.safeParse(input).success) throw new PreviewError("invalid_input", 400);
  if (!getInvitationEmailReadiness(env).enabled) throw new PreviewError("invitation_email_disabled", 503);
  const environment = getPreviewEmailEnvironment(env);
  const prepared = await client.rpc("prepare_preview_invitation_email", { p_preview: previewId, p_contact: input.contactId,
    p_request: input.requestId, p_environment: environment });
  if (prepared.error) throw new PreviewError(prepared.error.code === "22023" ? "invitation_recipient_or_access_unavailable" : "invitation_email_unavailable", prepared.error.code === "22023" ? 409 : 503);
  const context = contextSchema.safeParse(prepared.data);
  if (!context.success || context.data.preview_id !== previewId || context.data.message_id !== "<bltz-preview-" + context.data.id + "@bltz.me>") throw new PreviewError("invitation_email_unavailable", 503);
  const attempt = context.data;
  if (attempt.state !== "prepared") return { ok: true, attemptId: attempt.id, state: attempt.state, message: messages[attempt.state] };
  const service = createServiceClient();
  // A prepared retry is safe: begin atomically permits exactly one send and rechecks current access.
  const begun = await service.rpc("begin_preview_invitation_email", { p_id: attempt.id, p_environment: environment });
  if (begun.error) throw new PreviewError(begun.error.code === "22023" ? "invitation_recipient_or_access_unavailable" : "invitation_email_unavailable", begun.error.code === "22023" ? 409 : 503);
  const active = contextSchema.safeParse(begun.data);
  if (!active.success || active.data.id !== attempt.id || active.data.preview_id !== previewId || active.data.message_id !== attempt.message_id) throw new PreviewError("invitation_email_unavailable", 503);
  if (!active.data.should_send) return { ok: true, attemptId: attempt.id, state: active.data.state, message: messages[active.data.state] };
  // Only a frozen, server-validated alias is sent. No Origin/host/body field can choose the destination.
  const sent = await sendIonosInvitation({ id: attempt.id, messageId: active.data.message_id, recipientEmail: active.data.recipient_email,
    recipientName: active.data.recipient_name, previewName: active.data.preview_name, previewUrl: "https://bltz.vercel.app/" + active.data.short_alias }, env);
  const settled = await service.rpc("settle_preview_invitation_email", { p_id: attempt.id, p_environment: environment, p_state: sent.state, p_failure_code: sent.failureCode });
  const outcome = settlementSchema.safeParse(settled.data);
  if (settled.error || !outcome.success) return { ok: false, attemptId: attempt.id, state: "send_uncertain" as const,
    message: "The provider outcome could not be recorded. Check this invitation before sending again." };
  return { ok: true, attemptId: attempt.id, state: outcome.data.state, message: messages[outcome.data.state] };
}
