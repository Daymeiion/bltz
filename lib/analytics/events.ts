import { z } from "zod";

export const ANALYTICS_EVENT_NAMES = [
  "claim_link_opened",
  "claim_link_validated",
  "claim_link_expired",
  "claim_link_rejected",
  "claim_completed",
  "locker_preview_viewed",
  "live_locker_opened",
  "locker_viewed",
  "locker_shared",
  "share_link_copied",
  "social_link_clicked",
  "media_viewed",
  "film_room_opened",
  "photo_gallery_opened",
  "profile_edit_started",
  "profile_edit_completed",
  "media_uploaded",
  "dashboard_section_selected",
  "deferred_destination_selected",
  "notify_request_submitted",
  "notify_request_dismissed",
  "field_edited",
  "correction_requested",
  "media_submitted",
  "review_completed",
  "feedback_completed",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];
export type ProductEventName = AnalyticsEventName;
export type AnalyticsSource = "public_locker" | "athlete_dashboard" | "onboarding" | "beta_feedback";

export const PUBLIC_ATHLETE_TARGET_EVENTS = new Set<AnalyticsEventName>([
  "live_locker_opened",
  "locker_viewed",
  "locker_shared",
  "share_link_copied",
  "social_link_clicked",
  "media_viewed",
  "film_room_opened",
  "photo_gallery_opened",
]);

export const AUTHENTICATED_EVENT_NAMES = new Set<AnalyticsEventName>([
  "locker_shared",
  "share_link_copied",
  "locker_preview_viewed",
  "dashboard_section_selected",
  "deferred_destination_selected",
  "notify_request_submitted",
  "notify_request_dismissed",
  "field_edited",
  "correction_requested",
  "media_submitted",
  "review_completed",
  "feedback_completed",
  "profile_edit_started",
  "profile_edit_completed",
  "media_uploaded",
]);

export const ONBOARDING_EVENT_NAMES = new Set<AnalyticsEventName>([
  "claim_link_opened",
  "claim_link_validated",
  "claim_link_expired",
  "claim_link_rejected",
  "claim_completed",
  "locker_preview_viewed",
  "live_locker_opened",
]);

const propertiesSchema = z.record(z.string().max(80), z.unknown()).default({});

export const analyticsEventRequestSchema = z.object({
  eventId: z.string().uuid(),
  eventName: z.enum(ANALYTICS_EVENT_NAMES),
  occurredAt: z.string().datetime({ offset: true }),
  page: z.string().max(512).startsWith("/"),
  athleteId: z.string().uuid().optional(),
  athleteSlug: z.string().trim().min(1).max(160).optional(),
  sessionId: z.string().uuid().optional(),
  properties: propertiesSchema,
}).strict().refine((event) => !(event.athleteId && event.athleteSlug), {
  message: "provide one athlete target",
});

export type ProductEventRequest = z.infer<typeof analyticsEventRequestSchema>;
export type ProductEventInput<Name extends ProductEventName = ProductEventName> = {
  eventName: Name;
  /**
   * Optional caller hint retained for existing instrumentation. Persistence
   * never trusts or transmits this value; the ingestion route derives source
   * from the event name and normalized page.
   */
  source?: AnalyticsSource;
  page?: string;
  route?: string;
  athleteId?: string | null;
  athleteSlug?: string;
  properties?: Record<string, unknown>;
  dedupeKey?: string;
};

export function deriveAnalyticsSource(
  eventName: AnalyticsEventName,
  route: string,
): AnalyticsSource | null {
  const page = normalizeRoute(route);
  if (page.startsWith("/player/") && PUBLIC_ATHLETE_TARGET_EVENTS.has(eventName)) {
    return "public_locker";
  }
  if (page === "/dashboard" || page.startsWith("/dashboard/")) {
    if (eventName === "feedback_completed") return "beta_feedback";
    return AUTHENTICATED_EVENT_NAMES.has(eventName) ? "athlete_dashboard" : null;
  }
  if (
    (page === "/onboarding" || page.startsWith("/onboarding/"))
    && ONBOARDING_EVENT_NAMES.has(eventName)
  ) return "onboarding";
  return null;
}

export function normalizeRoute(route: string): string {
  const pathname = route.split(/[?#]/, 1)[0] || "/";
  return pathname.startsWith("/") ? pathname.slice(0, 512) : "/";
}

const SENSITIVE_PROPERTY_KEY = /(^|_)(password|secret|token|authorization|cookie|email|phone|raw_notes?|testimonial_quote)($|_)/i;

export function hasSensitiveAnalyticsProperty(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasSensitiveAnalyticsProperty);
  if (!value || typeof value !== "object") return false;

  return Object.entries(value).some(
    ([key, child]) => SENSITIVE_PROPERTY_KEY.test(key) || hasSensitiveAnalyticsProperty(child),
  );
}

export function serializedPropertiesSize(properties: Record<string, unknown>): number {
  return new TextEncoder().encode(JSON.stringify(properties)).byteLength;
}
