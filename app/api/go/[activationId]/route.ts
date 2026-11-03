import { recordActivationVisit } from "@/lib/enterprise-crm/pilot/activations";

export const dynamic = "force-dynamic";

function referrerHost(request: Request): string | null {
  try { return new URL(request.headers.get("referer") ?? "").hostname || null; } catch { return null; }
}

/** Public tracked link a school shares: counts the visit, then opens the Locker. */
export async function GET(request: Request, { params }: { params: Promise<{ activationId: string }> }) {
  const { activationId } = await params;
  const target = await recordActivationVisit(activationId, referrerHost(request)).catch(() => null);
  return Response.redirect(new URL(target ?? "/", request.url), 302);
}
