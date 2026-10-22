import { z } from "zod";
import { authorizeIntelligenceLab, IntelligenceAccessError } from "@/lib/intelligence/lab-server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
const HEADERS = { "Cache-Control": "private, no-store" };
const Body = z.object({ momentId: z.string().uuid(), decision: z.enum(["verified", "rejected"]) }).strict();
type Status = "candidate" | "verified" | "rejected";

/** Allowed transitions. Approving a removed Moment again is deliberately not one of them. */
const FROM: Record<z.infer<typeof Body>["decision"], Status[]> = { verified: ["candidate"], rejected: ["candidate", "verified"] };
const REASON = {
  verified: "Approved in the Intelligence Lab after checking the recorded game evidence.",
  rejected: "Rejected in the Intelligence Lab.",
  removed: "Removed in the Intelligence Lab after earlier approval.",
};

/**
 * Admin decision on a Moment: approve or reject a candidate, or remove an
 * approved Moment. Graph rows are append-only, so a rejection or removal is a
 * status change, never a delete; earlier review stamps are kept in history.
 */
export async function POST(request: Request) {
  let actorId: string;
  try { actorId = await authorizeIntelligenceLab(); }
  catch (error) { return Response.json({ state: "forbidden" }, { status: error instanceof IntelligenceAccessError ? error.status : 403, headers: HEADERS }); }
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") return Response.json({ state: "forbidden" }, { status: 403, headers: HEADERS });
  let body: z.infer<typeof Body>;
  try { body = Body.parse(await request.json()); } catch { return Response.json({ state: "invalid" }, { status: 400, headers: HEADERS }); }

  const db = createServiceClient();
  const moment = await db.from("moments").select("id,status").eq("id", body.momentId).maybeSingle();
  if (moment.error) return Response.json({ state: "unavailable" }, { status: 503, headers: HEADERS });
  if (!moment.data) return Response.json({ state: "not_found" }, { status: 404, headers: HEADERS });
  const from = moment.data.status as Status;
  if (!FROM[body.decision].includes(from)) return Response.json({ state: "already_reviewed", status: from }, { status: 409, headers: HEADERS });

  const reviewedAt = new Date().toISOString();
  const review = { version: 1, reviewerId: actorId, reviewedAt, reason: from === "verified" ? REASON.removed : REASON[body.decision] };
  // Evidence and athlete links first, the Moment last: a partial failure leaves the
  // Moment in its previous status, so the same decision can simply be retried.
  const evidence = await db.from("intelligence_evidence").select("id,structured_data").eq("moment_id", body.momentId).eq("status", from);
  if (evidence.error) return Response.json({ state: "unavailable" }, { status: 503, headers: HEADERS });
  for (const row of evidence.data ?? []) {
    const data: Record<string, unknown> = row.structured_data && typeof row.structured_data === "object" && !Array.isArray(row.structured_data) ? row.structured_data : {};
    const history = [...(Array.isArray(data._reviewHistory) ? data._reviewHistory : []), ...(data._review ? [data._review] : [])];
    const update = await db.from("intelligence_evidence").update({ status: body.decision, structured_data: { ...data, _review: review, ...(history.length ? { _reviewHistory: history } : {}) } }).eq("id", row.id).eq("status", from);
    if (update.error) return Response.json({ state: "failed" }, { status: 503, headers: HEADERS });
  }
  const joins = await db.from("moment_athletes").update({ status: body.decision }).eq("moment_id", body.momentId).eq("status", from);
  if (joins.error) return Response.json({ state: "failed" }, { status: 503, headers: HEADERS });
  const done = await db.from("moments").update({ status: body.decision }).eq("id", body.momentId).eq("status", from).select("id");
  if (done.error || !done.data?.length) return Response.json({ state: "failed" }, { status: 503, headers: HEADERS });
  await db.from("audit_logs").insert({ action: from === "verified" ? "intelligence.moment_remove" : "intelligence.moment_review", entity_type: "moment", entity_id: body.momentId, actor_user_id: actorId,
    new_values: { from, decision: body.decision, evidence: (evidence.data ?? []).length, reviewedAt } });
  return Response.json({ state: from === "verified" ? "removed" : body.decision }, { headers: HEADERS });
}
