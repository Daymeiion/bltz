"use client";

import type { ProductEventInput } from "@/lib/analytics/events";

const SESSION_KEY = "bltz.analytics.session.v1";
const DEDUPE_PREFIX = "bltz.analytics.intent.v2:";
const inFlightDedupeKeys = new Set<string>();
const fallbackIntents = new Map<string, StoredIntent>();
let fallbackSessionId: string | null = null;

type StoredIntent = { eventId: string; occurredAt: string; status: "pending" | "sent" };

function sessionId(): string {
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) {
      fallbackSessionId = existing;
      return existing;
    }
    const created = fallbackSessionId ?? window.crypto.randomUUID();
    window.sessionStorage.setItem(SESSION_KEY, created);
    fallbackSessionId = created;
    return created;
  } catch {
    fallbackSessionId ??= window.crypto.randomUUID();
    return fallbackSessionId;
  }
}

function claimIntent(key: string): StoredIntent | null {
  if (inFlightDedupeKeys.has(key)) return null;
  const fallback = fallbackIntents.get(key);
  if (fallback) {
    if (fallback.status === "sent") return null;
    inFlightDedupeKeys.add(key);
    return fallback;
  }
  try {
    const storageKey = `${DEDUPE_PREFIX}${key}`;
    const stored = window.sessionStorage.getItem(storageKey);
    if (stored) {
      const intent = JSON.parse(stored) as StoredIntent;
      if (intent.eventId && intent.occurredAt && (intent.status === "pending" || intent.status === "sent")) {
        if (intent.status === "sent") return null;
        inFlightDedupeKeys.add(key);
        return intent;
      }
    }
    const intent: StoredIntent = {
      eventId: window.crypto.randomUUID(), occurredAt: new Date().toISOString(), status: "pending",
    };
    window.sessionStorage.setItem(storageKey, JSON.stringify(intent));
    inFlightDedupeKeys.add(key);
    return intent;
  } catch {
    const existing = fallbackIntents.get(key);
    if (existing?.status === "sent") return null;
    inFlightDedupeKeys.add(key);
    const intent = existing ?? {
      eventId: window.crypto.randomUUID(), occurredAt: new Date().toISOString(), status: "pending",
    } satisfies StoredIntent;
    fallbackIntents.set(key, intent);
    return intent;
  }
}

function finishIntent(key: string | undefined, intent: StoredIntent, sent: boolean): void {
  if (!key) return;
  inFlightDedupeKeys.delete(key);
  try {
    window.sessionStorage.setItem(
      `${DEDUPE_PREFIX}${key}`,
      JSON.stringify({ ...intent, status: sent ? "sent" : "pending" } satisfies StoredIntent),
    );
    fallbackIntents.delete(key);
  } catch {
    // Keep retry identity within this tab when browser storage is unavailable.
    fallbackIntents.set(key, { ...intent, status: sent ? "sent" : "pending" });
  }
}

export async function trackProductEvent(
  event: ProductEventInput,
  transport: typeof fetch = fetch,
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (event.source === "public_locker" && !event.athleteId && !event.athleteSlug) return false;

  const eventName = event.eventName;
  const page = (event.page ?? event.route ?? window.location.pathname).split(/[?#]/, 1)[0].slice(0, 512);
  const intent = event.dedupeKey ? claimIntent(event.dedupeKey) : {
    eventId: window.crypto.randomUUID(),
    occurredAt: new Date().toISOString(),
    status: "pending" as const,
  };
  if (!intent) return false;
  const body = JSON.stringify({
    eventId: intent.eventId,
    eventName,
    occurredAt: intent.occurredAt,
    // The strict collector accepts exactly one target. Keep the canonical
    // Career ID when known; the server still checks it against the route slug.
    athleteId: event.athleteId || undefined,
    athleteSlug: event.athleteId ? undefined : event.athleteSlug,
    sessionId: sessionId(),
    page,
    properties: event.properties ?? {},
  });

  try {
    let response: Response | null = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        response = await transport("/api/analytics/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        });
        if (response.status < 500) break;
      } catch {
        if (attempt === 1) throw new Error("analytics_transport_failed");
      }
    }
    if (!response) throw new Error("analytics_transport_failed");
    const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
    finishIntent(event.dedupeKey, intent, response.ok || !retryable);
    return response.ok;
  } catch {
    finishIntent(event.dedupeKey, intent, false);
    return false;
  }
}

export function analyticsSessionHeaders(): Record<string, string> {
  return typeof window === "undefined" ? {} : { "X-BLTZ-Analytics-Session": sessionId() };
}
