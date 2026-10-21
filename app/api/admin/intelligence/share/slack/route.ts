import { authorizeIntelligenceLab, IntelligenceAccessError } from "@/lib/intelligence/lab-server";

export const dynamic = "force-dynamic";
const HEADERS = { "Cache-Control": "private, no-store" };

/**
 * Mockup-only: posts an activation draft summary to one Slack channel through an incoming webhook.
 * Runs only for internal admins, only from this origin, and only when SLACK_ACTIVATIONS_WEBHOOK_URL
 * is configured server-side. The webhook URL never reaches the browser.
 */
export async function POST(request: Request) {
  try { await authorizeIntelligenceLab(); }
  catch (error) { return Response.json({ state: "forbidden" }, { status: error instanceof IntelligenceAccessError ? error.status : 403, headers: HEADERS }); }
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") return Response.json({ state: "forbidden" }, { status: 403, headers: HEADERS });
  const webhook = process.env.SLACK_ACTIVATIONS_WEBHOOK_URL?.trim();
  if (!webhook || !/^https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/_-]+$/.test(webhook)) return Response.json({ state: "not_configured" }, { headers: HEADERS });
  let text = "";
  try { const body = await request.json() as { text?: unknown }; text = typeof body.text === "string" ? body.text.trim().slice(0, 3000) : ""; }
  catch { return Response.json({ state: "invalid" }, { status: 400, headers: HEADERS }); }
  if (!text) return Response.json({ state: "invalid" }, { status: 400, headers: HEADERS });
  try {
    const response = await fetch(webhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, unfurl_links: false }), signal: AbortSignal.timeout(8000) });
    return Response.json({ state: response.ok ? "sent" : "failed" }, { status: response.ok ? 200 : 502, headers: HEADERS });
  } catch { return Response.json({ state: "failed" }, { status: 502, headers: HEADERS }); }
}

/** Lets the share sheet show whether direct Slack posting is available without exposing configuration. */
export async function GET() {
  try { await authorizeIntelligenceLab(); }
  catch (error) { return Response.json({ state: "forbidden" }, { status: error instanceof IntelligenceAccessError ? error.status : 403, headers: HEADERS }); }
  return Response.json({ state: process.env.SLACK_ACTIVATIONS_WEBHOOK_URL?.trim() ? "ready" : "not_configured" }, { headers: HEADERS });
}
