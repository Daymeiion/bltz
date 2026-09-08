import { z } from "zod";
import { previewViewerAssignment } from "@/lib/preview-lockers/validation";
import { failure, json, previewAdmin, PreviewError, readBody } from "@/lib/preview-lockers/server";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { client } = await previewAdmin();
    const { id } = await params;
    if (!z.uuid().safeParse(id).success) throw new PreviewError("invalid_input", 400);
    const parsed = previewViewerAssignment.safeParse(await readBody(req, 2048));
    if (!parsed.success) throw new PreviewError("invalid_input", 400);
    const result = await client.rpc("assign_preview_locker_viewer", {
      p_preview_locker_id: id,
      p_email: parsed.data.email,
    });
    if (result.error?.code === "P0002") throw new PreviewError("preview_not_found", 404);
    if (result.error) throw new PreviewError("viewer_assignment_failed", 503);
    if (result.data === "account_not_found") throw new PreviewError("account_not_found", 404);
    if (!["assigned", "reassigned", "unchanged"].includes(result.data)) throw new PreviewError("viewer_assignment_failed", 503);
    return json({ assigned: true, status: result.data });
  } catch (error) { return failure(error); }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { client } = await previewAdmin();
    const { id } = await params;
    if (!z.uuid().safeParse(id).success) throw new PreviewError("invalid_input", 400);
    if (!z.object({}).strict().safeParse(await readBody(req, 256)).success) throw new PreviewError("invalid_input", 400);
    const result = await client.rpc("revoke_preview_locker_viewer", { p_preview_locker_id: id });
    if (result.error) throw new PreviewError("viewer_revocation_failed", 503);
    return json({ assigned: false, status: result.data ? "revoked" : "no_viewer" });
  } catch (error) { return failure(error); }
}
