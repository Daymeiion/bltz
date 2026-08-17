import { describe, expect, it } from "vitest";
import {
  analyticsEventRequestSchema,
  deriveAnalyticsSource,
  type AnalyticsEventName,
  type AnalyticsSource,
} from "@/lib/analytics/events";

const IMPLEMENTED_EVENT_CONTEXTS = [
  ["locker_viewed", "/player/test-athlete", "public_locker"],
  ["film_room_opened", "/player/test-athlete/videos", "public_locker"],
  ["photo_gallery_opened", "/player/test-athlete/photos", "public_locker"],
  ["media_viewed", "/player/test-athlete/videos/test-video", "public_locker"],
  ["share_link_copied", "/player/test-athlete/videos/test-video", "public_locker"],
  ["locker_shared", "/player/test-athlete", "public_locker"],
  ["claim_link_validated", "/onboarding/claim/test-token", "onboarding"],
  ["claim_completed", "/onboarding/claim/test-token", "onboarding"],
  ["profile_edit_started", "/dashboard/settings", "athlete_dashboard"],
  ["profile_edit_completed", "/dashboard/settings", "athlete_dashboard"],
  ["media_uploaded", "/dashboard/videos", "athlete_dashboard"],
] as const satisfies ReadonlyArray<readonly [AnalyticsEventName, string, AnalyticsSource]>;

describe("implemented analytics event contracts", () => {
  it.each(IMPLEMENTED_EVENT_CONTEXTS)(
    "accepts %s and derives its trusted source",
    (eventName, page, source) => {
      const request = analyticsEventRequestSchema.safeParse({
        eventId: "8bb12ac1-5181-4df4-8c37-70643339f32b",
        eventName,
        occurredAt: "2026-08-17T12:00:00.000Z",
        page,
        athleteSlug: source === "public_locker" ? "test-athlete" : undefined,
        sessionId: "c682bce7-76ac-4c02-9132-8fc6705bf163",
        properties: {},
      });

      expect(request.success).toBe(true);
      expect(deriveAnalyticsSource(eventName, page)).toBe(source);
    },
  );

  it("rejects source attribution supplied by a browser", () => {
    const request = analyticsEventRequestSchema.safeParse({
      eventId: "8bb12ac1-5181-4df4-8c37-70643339f32b",
      eventName: "locker_viewed",
      occurredAt: "2026-08-17T12:00:00.000Z",
      page: "/player/test-athlete",
      athleteSlug: "test-athlete",
      sessionId: "c682bce7-76ac-4c02-9132-8fc6705bf163",
      source: "athlete_dashboard",
      properties: {},
    });

    expect(request.success).toBe(false);
  });
});
