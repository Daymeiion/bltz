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

export const PUBLIC_ATHLETE_TARGET_EVENTS = new Set<AnalyticsEventName>([
  "live_locker_opened",
  "locker_viewed",
  "locker_shared",
  "share_link_copied",
  "media_viewed",
  "film_room_opened",
  "photo_gallery_opened",
]);

export const AUTHENTICATED_EVENT_NAMES = new Set<AnalyticsEventName>([
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

const propertiesSchema = z.record(z.string().max(80), z.unknown()).default({});

export const analyticsEventRequestSchema = z.object({
  eventId: z.string().uuid().optional(),
  eventName: z.enum(ANALYTICS_EVENT_NAMES),
  occurredAt: z.string().datetime({ offset: true }).optional(),
  source: z.enum(["public_locker", "athlete_dashboard", "onboarding", "beta_feedback"]),
  page: z.string().max(512).startsWith("/"),
  athleteId: z.string().uuid().optional(),
  athleteSlug: z.string().trim().min(1).max(160).optional(),
  sessionId: z.string().uuid().optional(),
  properties: propertiesSchema,
}).strict();

export type ProductEventRequest = z.infer<typeof analyticsEventRequestSchema>;
export type ProductEventInput<Name extends ProductEventName = ProductEventName> = {
  name: Name;
  route: string;
  athleteSlug?: string;
  properties?: Record<string, unknown>;
  dedupeKey?: string;
};

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
