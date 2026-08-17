import { NextResponse } from "next/server";
import {
  deriveAnalyticsSource,
  hasSensitiveAnalyticsProperty,
  analyticsEventRequestSchema,
  normalizeRoute,
  serializedPropertiesSize,
} from "@/lib/analytics/events";
import { consumeAnalyticsRateLimits, recordTrustedAnalyticsEvent } from "@/lib/analytics/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 16 * 1024;

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = analyticsEventRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_event" }, { status: 400 });
  }
  const event = parsed.data;
  const page = normalizeRoute(event.page);
  const source = deriveAnalyticsSource(event.eventName, page);
  if (!source) return NextResponse.json({ error: "invalid_event_context" }, { status: 400 });

  if (event.occurredAt) {
    const occurredAt = new Date(event.occurredAt).getTime();
    const now = Date.now();
    if (occurredAt < now - 7 * 86_400_000 || occurredAt > now + 5 * 60_000) {
      return NextResponse.json({ error: "invalid_occurred_at" }, { status: 400 });
    }
  }

  if (serializedPropertiesSize(event.properties) > 8192) {
    return NextResponse.json({ error: "properties_too_large" }, { status: 413 });
  }
  if (hasSensitiveAnalyticsProperty(event.properties)) {
    return NextResponse.json({ error: "sensitive_properties_rejected" }, { status: 400 });
  }

  const sessionClient = await createClient();
  const { data: { user } } = await sessionClient.auth.getUser();

  if (source !== "public_locker" && !user) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  if (!user && !event.sessionId) {
    return NextResponse.json({ error: "session_id_required" }, { status: 400 });
  }

  try {
    const allowed = await consumeAnalyticsRateLimits({
      request,
      sessionId: event.sessionId ?? null,
      userId: user?.id ?? null,
    });
    if (!allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  } catch {
    return NextResponse.json({ error: "analytics_unavailable" }, { status: 503 });
  }

  const service = createServiceClient();

  let athleteId: string | null = null;
  if (source === "public_locker") {
    if (!event.athleteId && !event.athleteSlug) {
      return NextResponse.json({ error: "athlete_target_required" }, { status: 400 });
    }
    const { data: visibleAthlete, error } = await service
      .from("players")
      .select("id")
      .eq(event.athleteId ? "id" : "slug", event.athleteId ?? event.athleteSlug!)
      .eq("visibility", true)
      .maybeSingle();
    if (error) return NextResponse.json({ error: "analytics_unavailable" }, { status: 503 });
    if (!visibleAthlete) return NextResponse.json({ error: "athlete_not_found" }, { status: 404 });
    athleteId = visibleAthlete.id;
  } else if (user) {
    const { data: ownedAthlete } = await service
      .from("players")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (ownedAthlete?.id) {
      athleteId = ownedAthlete.id;
    } else {
      const { data: profile } = await service
        .from("profiles")
        .select("player_id")
        .eq("id", user.id)
        .maybeSingle();
      athleteId = profile?.player_id ?? null;
    }
  }
  if (source !== "public_locker" && !athleteId) {
    return NextResponse.json({ error: "athlete_context_required" }, { status: 403 });
  }

  try {
    const result = await recordTrustedAnalyticsEvent({
      eventName: event.eventName,
      clientEventId: event.eventId,
      occurredAt: event.occurredAt,
      userId: user?.id ?? null,
      athleteId,
      sessionId: event.sessionId ?? null,
      source,
      page,
      properties: event.properties,
    });
    return NextResponse.json({ accepted: true, eventId: result.eventId, duplicate: result.duplicate }, { status: 202 });
  } catch {
    return NextResponse.json({ error: "analytics_unavailable" }, { status: 503 });
  }
}
