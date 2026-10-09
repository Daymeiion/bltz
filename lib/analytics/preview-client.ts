"use client";

export type PreviewEventName =
  | "locker_view" | "photos_view" | "film_view" | "stats_view"
  | "photo_open" | "video_open" | "video_play" | "video_progress" | "video_complete"
  | "claim_click" | "referral_link_copied";

export type PreviewEventInput = {
  previewId: string;
  eventName: PreviewEventName;
  assetId?: string;
  progress?: 25 | 50 | 75;
};

// Shared with the protected conversion form so a tab has one preview session.
const SESSION_KEY = "bltz-preview-session";
const INTENT_PREFIX = "bltz.preview.analytics.intent.v1:";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ASSET_ID = /^[a-z0-9_-]{1,128}$/i;
const EVENT_NAMES = new Set<PreviewEventName>([
  "locker_view", "photos_view", "film_view", "stats_view", "photo_open", "video_open",
  "video_play", "video_progress", "video_complete", "claim_click", "referral_link_copied",
]);
const ASSET_EVENTS = new Set<PreviewEventName>(["photo_open", "video_open", "video_play", "video_progress", "video_complete"]);
const DEDUPED_EVENTS = new Set<PreviewEventName>(["locker_view", "photos_view", "film_view", "stats_view", "video_open", "video_play", "video_progress", "video_complete"]);
type Intent = { eventId: string; status: "pending" | "sent" };
const inFlight = new Set<string>();
const fallbackIntents = new Map<string, Intent>();
let fallbackSession: string | null = null;

function sessionId(): string {
  try {
    const stored = window.sessionStorage.getItem(SESSION_KEY);
    if (stored && UUID.test(stored)) {
      fallbackSession = stored;
      return stored;
    }
    fallbackSession ??= window.crypto.randomUUID();
    window.sessionStorage.setItem(SESSION_KEY, fallbackSession);
    return fallbackSession;
  } catch {
    fallbackSession ??= window.crypto.randomUUID();
    return fallbackSession;
  }
}

export function previewAnalyticsSessionId(): string | undefined {
  return typeof window === "undefined" ? undefined : sessionId();
}

function intentFor(key: string | undefined): Intent | null {
  if (!key) return { eventId: window.crypto.randomUUID(), status: "pending" };
  if (inFlight.has(key)) return null;
  let intent = fallbackIntents.get(key);
  if (!intent) {
    try {
      const stored = window.sessionStorage.getItem(INTENT_PREFIX + key);
      if (stored) {
        const parsed = JSON.parse(stored) as Intent;
        if (UUID.test(parsed.eventId) && (parsed.status === "pending" || parsed.status === "sent")) intent = parsed;
      }
    } catch { /* Browser storage is optional; retain retry identity in memory. */ }
  }
  if (intent?.status === "sent") return null;
  intent ??= { eventId: window.crypto.randomUUID(), status: "pending" };
  inFlight.add(key);
  fallbackIntents.set(key, intent);
  try { window.sessionStorage.setItem(INTENT_PREFIX + key, JSON.stringify(intent)); } catch { /* optional */ }
  return intent;
}

function finishIntent(key: string | undefined, intent: Intent, settled: boolean) {
  if (!key) return;
  inFlight.delete(key);
  const updated: Intent = { ...intent, status: settled ? "sent" : "pending" };
  try {
    window.sessionStorage.setItem(INTENT_PREFIX + key, JSON.stringify(updated));
    fallbackIntents.delete(key);
  } catch { fallbackIntents.set(key, updated); }
}

/** Bounded preview-only payload. Browser URLs, form contents and identity never enter it. */
export async function trackPreviewEvent(event: PreviewEventInput, transport: typeof fetch = fetch): Promise<boolean> {
  if (typeof window === "undefined" || document.visibilityState !== "visible") return false;
  if (!UUID.test(event.previewId) || !EVENT_NAMES.has(event.eventName)) return false;
  if (ASSET_EVENTS.has(event.eventName) !== (typeof event.assetId === "string")) return false;
  if (event.assetId !== undefined && !ASSET_ID.test(event.assetId)) return false;
  if (event.eventName === "video_progress" ? ![25, 50, 75].includes(event.progress ?? 0) : event.progress !== undefined) return false;

  const session = sessionId();
  const key = DEDUPED_EVENTS.has(event.eventName)
    ? `${session}:${event.previewId}:${event.eventName}:${event.assetId ?? ""}:${event.progress ?? ""}` : undefined;
  const intent = intentFor(key);
  if (!intent) return false;
  // Serialize the allowlist explicitly even if a caller supplies extra fields.
  const body = JSON.stringify({
    previewId: event.previewId, eventId: intent.eventId, sessionId: session,
    eventName: event.eventName, assetId: event.assetId, progress: event.progress,
  });
  try {
    let response: Response | undefined;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        response = await transport("/api/preview-analytics/events", {
          method: "POST", headers: { "Content-Type": "application/json" }, body,
          keepalive: true, credentials: "same-origin", referrerPolicy: "no-referrer",
        });
        if (response.status < 500) break;
      } catch { if (attempt === 1) throw new Error("preview_event_delivery_failed"); }
    }
    if (!response) throw new Error("preview_event_delivery_failed");
    const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
    finishIntent(key, intent, response.ok || !retryable);
    return response.ok;
  } catch {
    finishIntent(key, intent, false);
    return false;
  }
}
