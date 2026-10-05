import { afterEach, describe, expect, it, vi } from "vitest";
import { bltzEventSchema, developmentAnalyticsEnabled, toBLTZEvent } from "@/lib/analytics/bltz-event";

const base = { eventName: "locker_viewed" as const, source: "public_locker" as const,
  clientEventId: "60000000-0000-4000-8000-000000000001", athleteId: "10000000-0000-4000-8000-000000000001",
  sessionId: "70000000-0000-4000-8000-000000000001", occurredAt: "2026-10-05T00:00:00Z", page: "/player/example" };
afterEach(() => vi.unstubAllEnvs());
describe("BLTZEvent compatibility and privacy", () => {
  it("keeps ID, occurrence time and tab session without account IDs or raw properties", () => {
    const event = toBLTZEvent({ ...base, userId: "80000000-0000-4000-8000-000000000001", properties: { nested: { private_notes: "do not export" }, source_url: "https://site.test/?token=secret" } }, "2026-10-05T00:01:00Z");
    expect(event.event_id).toBe(base.clientEventId); expect(event.session_id).toBe(base.sessionId);
    expect(event.actor_kind).toBe("authenticated"); expect(event.source_channel).toBe("unknown");
    expect(JSON.stringify(event)).not.toContain("private_notes"); expect(JSON.stringify(event)).not.toContain("80000000");
    expect(JSON.stringify(event)).not.toContain("secret");
  });
  it("maps old media selection to open without inventing exposure or playback", () => {
    const event = toBLTZEvent({ ...base, eventName: "media_viewed", properties: { media_id: "not-verified", media_type: "video" } });
    expect(event.event_name).toBe("media_opened"); expect(event.asset_id).toBeNull();
    expect(event.properties.definition).toContain("playback unknown");
  });
  it("excludes the duplicate clipboard alias while keeping copy intent", () => {
    expect(toBLTZEvent({ ...base, eventName: "share_link_copied" }).audience_eligible).toBe(true);
    const alias = toBLTZEvent({ ...base, eventName: "locker_shared", properties: { mechanism: "clipboard" } });
    expect(alias.measurement_basis).toBe("legacy_alias"); expect(alias.audience_eligible).toBe(false);
    expect(alias.event_name).toBe("share_intent_alias");
  });
  it("separates internal and operational events from eligible audience", () => {
    expect(toBLTZEvent({ ...base, activityClass: "internal" }).audience_eligible).toBe(false);
    expect(toBLTZEvent({ ...base, source: "onboarding", activityClass: "operational" }).scope_key).toBe("internal_admin");
    expect(bltzEventSchema.safeParse({ ...toBLTZEvent(base), actor_kind: "internal" }).success).toBe(false);
  });
  it("does not allow production activation through the development switch", () => {
    vi.stubEnv("BLTZ_ANALYTICS_PIPELINE_ENABLED", "true"); vi.stubEnv("BLTZ_ANALYTICS_ENVIRONMENT", "development");
    vi.stubEnv("VERCEL_ENV", "preview"); expect(developmentAnalyticsEnabled()).toBe(true);
    vi.stubEnv("VERCEL_ENV", "production"); expect(developmentAnalyticsEnabled()).toBe(false);
    vi.stubEnv("BLTZ_ANALYTICS_ENVIRONMENT", "production"); expect(developmentAnalyticsEnabled()).toBe(false);
  });
});
