"use client";

type BrowserEventName =
  | "claim_link_validated"
  | "claim_completed"
  | "locker_viewed"
  | "locker_shared"
  | "share_link_copied"
  | "media_viewed"
  | "film_room_opened"
  | "photo_gallery_opened"
  | "profile_edit_started"
  | "profile_edit_completed"
  | "media_uploaded"
  | "field_edited"
  | "media_submitted";

type AnalyticsSource = "public_locker" | "athlete_dashboard" | "onboarding" | "beta_feedback";

type ClientEvent = {
  eventName?: BrowserEventName;
  name?: BrowserEventName;
  source?: AnalyticsSource;
  page?: string;
  route?: string;
  athleteId?: string | null;
  athleteSlug?: string;
  properties?: Record<string, unknown>;
  dedupeKey?: string;
};

const SESSION_KEY = "bltz.analytics.session.v1";
const DEDUPE_PREFIX = "bltz.analytics.sent.v1:";

function sessionId(): string {
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const created = window.crypto.randomUUID();
    window.sessionStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return window.crypto.randomUUID();
  }
}

function claimDedupeKey(key: string): boolean {
  try {
    const storageKey = `${DEDUPE_PREFIX}${key}`;
    if (window.sessionStorage.getItem(storageKey)) return false;
    window.sessionStorage.setItem(storageKey, "1");
    return true;
  } catch {
    return true;
  }
}

function releaseDedupeKey(key?: string): void {
  if (!key) return;
  try {
    window.sessionStorage.removeItem(`${DEDUPE_PREFIX}${key}`);
  } catch {
    // Storage is optional; failed analytics must remain invisible to the user.
  }
}

export async function trackProductEvent(
  event: ClientEvent,
  transport: typeof fetch = fetch,
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (event.source === "public_locker" && !event.athleteId) return false;
  if (event.dedupeKey && !claimDedupeKey(event.dedupeKey)) return false;

  const eventName = event.eventName ?? event.name;
  if (!eventName) return false;
  const page = (event.page ?? event.route ?? window.location.pathname).split("?")[0].slice(0, 512);
  const source = event.source ?? (
    page.startsWith("/player/") ? "public_locker"
      : page.startsWith("/onboarding") ? "onboarding"
        : page.startsWith("/dashboard") ? "athlete_dashboard"
          : "beta_feedback"
  );

  try {
    const response = await transport("/api/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: window.crypto.randomUUID(),
        eventName,
        occurredAt: new Date().toISOString(),
        athleteId: event.athleteId || undefined,
        athleteSlug: event.athleteSlug,
        sessionId: sessionId(),
        source,
        page,
        properties: event.properties ?? {},
      }),
      keepalive: true,
    });
    if (!response.ok) releaseDedupeKey(event.dedupeKey);
    return response.ok;
  } catch {
    releaseDedupeKey(event.dedupeKey);
    return false;
  }
}

export function analyticsSessionHeaders(): Record<string, string> {
  return typeof window === "undefined" ? {} : { "X-BLTZ-Analytics-Session": sessionId() };
}
