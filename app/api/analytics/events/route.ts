import { NextResponse } from "next/server";
import {
  AUTHENTICATED_EVENT_NAMES,
  PUBLIC_ATHLETE_TARGET_EVENTS,
  hasSensitiveAnalyticsProperty,
  analyticsEventRequestSchema,
  serializedPropertiesSize,
} from "@/lib/analytics/events";
import { recordTrustedAnalyticsEvent } from "@/lib/analytics/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 16 * 1024;
const MAX_EVENTS_PER_SESSION_PER_MINUTE = 60;

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

  if (AUTHENTICATED_EVENT_NAMES.has(event.eventName) && !user) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  if (!user && !event.sessionId) {
    return NextResponse.json({ error: "session_id_required" }, { status: 400 });
  }

  const service = createServiceClient();
  if (event.sessionId) {
    const since = new Date(Date.now() - 60_000).toISOString();
    const { count, error } = await service
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("session_id", event.sessionId)
      .gte("created_at", since);

    if (error) return NextResponse.json({ error: "analytics_unavailable" }, { status: 503 });
    if ((count ?? 0) >= MAX_EVENTS_PER_SESSION_PER_MINUTE) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
  }

  let athleteId: string | null = null;
  if (PUBLIC_ATHLETE_TARGET_EVENTS.has(event.eventName)) {
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

  try {
    const eventId = await recordTrustedAnalyticsEvent({
      eventName: event.eventName,
      clientEventId: event.eventId ?? null,
      occurredAt: event.occurredAt ?? null,
      userId: user?.id ?? null,
      athleteId,
      sessionId: event.sessionId ?? null,
      source: event.page.startsWith("/player/") ? "public_locker"
        : event.page.startsWith("/onboarding") ? "onboarding"
          : event.page.startsWith("/dashboard") ? "athlete_dashboard"
            : event.source,
      page: event.page,
      properties: event.properties,
    });
    return NextResponse.json({ accepted: true, eventId }, { status: 202 });
  } catch {
    return NextResponse.json({ error: "analytics_unavailable" }, { status: 503 });
  }
}
