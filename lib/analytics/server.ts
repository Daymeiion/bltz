import {
  hasSensitiveAnalyticsProperty,
  serializedPropertiesSize,
  type AnalyticsEventName,
} from "@/lib/analytics/events";
import { createServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/types/database";

export interface TrustedAnalyticsEvent {
  eventName: AnalyticsEventName;
  clientEventId?: string | null;
  occurredAt?: string | null;
  userId?: string | null;
  athleteId?: string | null;
  sessionId?: string | null;
  source: "public_locker" | "athlete_dashboard" | "onboarding" | "beta_feedback";
  page?: string | null;
  properties?: Record<string, unknown>;
}

/**
 * Server-only-by-module-boundary analytics writer. Callers must derive or
 * verify IDs before use; browsers consume POST /api/analytics/events.
 */
export async function recordTrustedAnalyticsEvent(event: TrustedAnalyticsEvent) {
  const properties = event.properties ?? {};
  if (serializedPropertiesSize(properties) > 8192) {
    throw new Error("analytics_properties_too_large");
  }
  if (hasSensitiveAnalyticsProperty(properties)) {
    throw new Error("analytics_properties_sensitive");
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("analytics_events")
    .insert({
      client_event_id: event.clientEventId ?? null,
      event_name: event.eventName,
      user_id: event.userId ?? null,
      athlete_id: event.athleteId ?? null,
      session_id: event.sessionId ?? null,
      source: event.source,
      page: event.page ?? null,
      properties: properties as Json,
      occurred_at: event.occurredAt ?? new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) throw new Error(`analytics_insert_failed:${error.message}`);
  return data.id as string;
}

