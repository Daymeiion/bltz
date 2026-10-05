import "server-only";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { recordTrustedAnalyticsEvent, type TrustedAnalyticsEvent, type AnalyticsWriteResult } from "./server";

type ClaimAnalyticsEvent = TrustedAnalyticsEvent & {
  eventName: "claim_link_validated" | "claim_completed";
  source: "onboarding";
};
const storedClaimEventSchema = z.object({
  id: z.string().uuid(), event_name: z.string(), user_id: z.string().uuid().nullable(),
  athlete_id: z.string().uuid().nullable(), session_id: z.string().uuid().nullable(), source: z.string(),
  page: z.string().nullable(), properties: z.record(z.string(), z.unknown()),
  occurred_at: z.string().datetime({ offset: true }),
});

/** First observed claim lifecycle event owns its occurrence/session/properties.
 * A retried draft request is not another claim, and cannot change its receipt.
 */
export async function recordImmutableClaimAnalyticsEvent(event: ClaimAnalyticsEvent): Promise<AnalyticsWriteResult> {
  if (event.source !== "onboarding" || !["claim_link_validated", "claim_completed"].includes(event.eventName)) throw new Error("invalid_claim_analytics_event");
  const service = createServiceClient();
  const readExisting = async () => {
    const { data, error } = await service.from("analytics_events")
      .select("id,event_name,user_id,athlete_id,session_id,source,page,properties,occurred_at")
      .eq("client_event_id", event.clientEventId).abortSignal(AbortSignal.timeout(10_000)).maybeSingle();
    if (error) throw new Error("claim_analytics_identity_unavailable");
    if (!data) return null;
    const stored = storedClaimEventSchema.parse(data);
    if (stored.event_name !== event.eventName || stored.user_id !== (event.userId ?? null)
      || stored.athlete_id !== (event.athleteId ?? null) || stored.source !== event.source || stored.page !== (event.page ?? null)) {
      throw new Error("claim_analytics_identity_collision");
    }
    return { ...event, occurredAt: stored.occurred_at, sessionId: stored.session_id, properties: stored.properties };
  };
  const existing = await readExisting();
  if (existing) return recordTrustedAnalyticsEvent(existing);
  try { return await recordTrustedAnalyticsEvent(event); }
  catch (error) {
    // The concurrent first writer may have committed while this producer waited.
    // One canonical re-read is bounded and retains the original occurrence.
    const raced = await readExisting();
    if (!raced) throw error;
    return recordTrustedAnalyticsEvent(raced);
  }
}
