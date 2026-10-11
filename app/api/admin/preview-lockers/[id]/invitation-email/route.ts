import { z } from "zod";
import { previewAdmin, readBody, json, failure, PreviewError } from "@/lib/preview-lockers/server";
import { invitationEmailInput, sendPreviewInvitationEmail } from "@/lib/preview-lockers/invitation-email-server";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await previewAdmin();
    const { id } = await context.params;
    if (!z.string().uuid().safeParse(id).success) throw new PreviewError("invalid_input", 400);
    const input = invitationEmailInput.safeParse(await readBody(request, 4096));
    if (!input.success) throw new PreviewError("invalid_input", 400);
    const result = await sendPreviewInvitationEmail(id, input.data);
    return json(result, result.ok ? 200 : 202);
  } catch (error) { return failure(error); }
}
