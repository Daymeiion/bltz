import { z } from "zod";
import { API_HEADERS, apiError, authorizeWrite } from "@/lib/enterprise-crm/pilot/api";
import { createWordPressDraft, sendToSlack, sendToTeams } from "@/lib/enterprise-crm/pilot/integrations";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const text = z.string().trim().min(1).max(4000);
const input = z.discriminatedUnion("destination", [
  z.object({ destination: z.literal("slack"), activationId: z.string().uuid(), message: text }).strict(),
  z.object({ destination: z.literal("teams"), activationId: z.string().uuid(), message: text, workspaceLink: z.string().url().max(2048) }).strict(),
  z.object({
    destination: z.literal("wordpress"), activationId: z.string().uuid(),
    post: z.object({ headline: z.string().trim().min(1).max(200), paragraphs: z.array(z.string().trim().min(1).max(2000)).min(1).max(20), cta: z.string().trim().min(1).max(200), link: z.string().url().max(2048) }).strict(),
  }).strict(),
]);

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Sends one of the school's activations to its connected Slack or Teams channel, or
 * creates a draft on its WordPress site. Links must point back to this BLTZ site,
 * and the post HTML is built here from plain text.
 */
export async function POST(request: Request, { params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  const auth = await authorizeWrite(request, organizationId, "activation.manage");
  if (!auth.ok) return auth.response;
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("invalid", 400);
  const origin = new URL(request.url).origin;
  const ownLink = (value: string) => { try { return new URL(value).origin === origin; } catch { return false; } };
  const body = parsed.data;
  if (body.destination === "teams" && !ownLink(body.workspaceLink)) return apiError("invalid", 400);
  if (body.destination === "wordpress" && !ownLink(body.post.link)) return apiError("invalid", 400);

  const { data } = await createServiceClient().from("organization_activations").select("id,title").eq("id", body.activationId).eq("organization_id", auth.context.organization.id).maybeSingle();
  const activation = data as { id: string; title: string } | null;
  if (!activation) return apiError("not_found", 404);

  const result = body.destination === "slack" ? await sendToSlack(auth.context.organization.id, body.message)
    : body.destination === "teams" ? await sendToTeams(auth.context.organization.id, activation.title, body.message, body.workspaceLink)
    : await createWordPressDraft(auth.context.organization.id, body.post.headline, [
      ...body.post.paragraphs.map((line) => `<p>${escapeHtml(line)}</p>`),
      `<p><a href="${escapeHtml(body.post.link)}">${escapeHtml(body.post.cta)}</a></p>`,
    ].join("\n"));
  const status = result.state === "sent" ? 200 : result.state === "not_connected" ? 409 : 502;
  return Response.json(result, { status, headers: API_HEADERS });
}
