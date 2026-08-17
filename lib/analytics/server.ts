import "server-only";

import {
  hasSensitiveAnalyticsProperty,
  serializedPropertiesSize,
  type AnalyticsEventName,
} from "@/lib/analytics/events";
import { createHmac } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/types/database";

export interface TrustedAnalyticsEvent {
  eventName: AnalyticsEventName;
  clientEventId: string;
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
export interface AnalyticsWriteResult { eventId: string; duplicate: boolean }

export async function recordTrustedAnalyticsEvent(event: TrustedAnalyticsEvent): Promise<AnalyticsWriteResult> {
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
      client_event_id: event.clientEventId,
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

  if (!error) return { eventId: data.id as string, duplicate: false };
  if (error.code === "23505") {
    const { data: existing, error: lookupError } = await supabase
      .from("analytics_events")
      .select("id")
      .eq("client_event_id", event.clientEventId)
      .maybeSingle();
    if (!lookupError && existing?.id) {
      return { eventId: existing.id as string, duplicate: true };
    }
  }
  throw new Error(`analytics_insert_failed:${error.message}`);
}

function analyticsRateLimitHash(kind: string, value: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("analytics_rate_limit_secret_missing");
  return createHmac("sha256", secret).update(`analytics-rate-limit:v1:${kind}:${value}`).digest("hex");
}

function clientNetworkAddress(request: Request): string | null {
  const forwarded = request.headers.get("x-vercel-forwarded-for")
    ?? request.headers.get("x-forwarded-for")
    ?? request.headers.get("x-real-ip");
  return forwarded?.split(",", 1)[0]?.trim() || null;
}

export async function consumeAnalyticsRateLimits(input: {
  request: Request;
  sessionId: string | null;
  userId: string | null;
}): Promise<boolean> {
  const service = createServiceClient();
  const day = new Date().toISOString().slice(0, 10);
  const limits: Array<{ key: string; limit: number }> = [];
  if (input.userId) {
    limits.push({ key: analyticsRateLimitHash("user", input.userId), limit: 120 });
  } else {
    if (input.sessionId) limits.push({ key: analyticsRateLimitHash("session", input.sessionId), limit: 60 });
    const address = clientNetworkAddress(input.request);
    if (address) limits.push({ key: analyticsRateLimitHash("network-day", `${day}:${address}`), limit: 300 });
  }
  if (limits.length === 0) return false;
  for (const item of limits) {
    const { data, error } = await service.rpc("consume_analytics_rate_limit", {
      p_key_hash: item.key,
      p_limit: item.limit,
      p_window_seconds: 60,
    });
    if (error) throw new Error(`analytics_rate_limit_failed:${error.message}`);
    if (data !== true) return false;
  }
  return true;
}

export function analyticsEventIdFromParts(...parts: string[]): string {
  const bytes = Buffer.from(
    createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "bltz-local-event-id")
      .update(parts.join("\u001f"))
      .digest()
      .subarray(0, 16),
  );
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
