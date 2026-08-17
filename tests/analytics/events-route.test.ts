import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const createClient = vi.fn();
const createServiceClient = vi.fn();
const recordTrustedAnalyticsEvent = vi.fn();
const consumeAnalyticsRateLimits = vi.fn();

vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient }));
vi.mock("@/lib/analytics/server", () => ({ consumeAnalyticsRateLimits, recordTrustedAnalyticsEvent }));

function request(body: unknown) {
  return new NextRequest("http://localhost/api/analytics/events", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.10" },
    body: JSON.stringify(body),
  });
}

function envelope() {
  return {
    eventId: "8bb12ac1-5181-4df4-8c37-70643339f32b",
    occurredAt: new Date().toISOString(),
  };
}

describe("beta analytics ingestion", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    consumeAnalyticsRateLimits.mockResolvedValue(true);
    recordTrustedAnalyticsEvent.mockResolvedValue({
      eventId: "8bb12ac1-5181-4df4-8c37-70643339f32b",
      duplicate: false,
    });
  });

  it("requires authentication for athlete-dashboard events", async () => {
    createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: null } })) } });
    const { POST } = await import("@/app/api/analytics/events/route");
    const response = await POST(request({
      ...envelope(), eventName: "field_edited",
      sessionId: "c682bce7-76ac-4c02-9132-8fc6705bf163",
      page: "/dashboard", properties: { field: "bio" },
    }));
    expect(response.status).toBe(401);
    expect(consumeAnalyticsRateLimits).not.toHaveBeenCalled();
    expect(recordTrustedAnalyticsEvent).not.toHaveBeenCalled();
  });

  it("rejects sensitive analytics property keys", async () => {
    const { POST } = await import("@/app/api/analytics/events/route");
    const response = await POST(request({
      ...envelope(), eventName: "locker_viewed",
      athleteId: "c0ffb93f-7851-44d4-96e6-e3044b4b3d55",
      sessionId: "c682bce7-76ac-4c02-9132-8fc6705bf163",
      page: "/player/example", properties: { access_token: "must-not-be-stored" },
    }));
    expect(response.status).toBe(400);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("rejects a browser-supplied source field", async () => {
    const { POST } = await import("@/app/api/analytics/events/route");
    const response = await POST(request({
      ...envelope(), eventName: "locker_viewed",
      athleteId: "c0ffb93f-7851-44d4-96e6-e3044b4b3d55",
      sessionId: "c682bce7-76ac-4c02-9132-8fc6705bf163",
      source: "athlete_dashboard", page: "/player/example", properties: {},
    }));
    expect(response.status).toBe(400);
    expect(recordTrustedAnalyticsEvent).not.toHaveBeenCalled();
  });

  it("derives public source and verifies the athlete server-side", async () => {
    createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: null } })) } });
    const playerQuery = {
      select: vi.fn(() => playerQuery), eq: vi.fn(() => playerQuery),
      maybeSingle: vi.fn(async () => ({ data: { id: "c0ffb93f-7851-44d4-96e6-e3044b4b3d55" }, error: null })),
    };
    createServiceClient.mockReturnValue({ from: vi.fn(() => playerQuery) });
    const { POST } = await import("@/app/api/analytics/events/route");
    const response = await POST(request({
      ...envelope(), eventName: "locker_shared",
      athleteId: "c0ffb93f-7851-44d4-96e6-e3044b4b3d55",
      sessionId: "c682bce7-76ac-4c02-9132-8fc6705bf163",
      page: "/player/example?utm_source=untrusted", properties: { share_destination: "linkedin" },
    }));
    expect(response.status).toBe(202);
    expect(recordTrustedAnalyticsEvent).toHaveBeenCalledWith(expect.objectContaining({
      userId: null, athleteId: "c0ffb93f-7851-44d4-96e6-e3044b4b3d55",
      source: "public_locker", page: "/player/example",
    }));
  });

  it("associates dashboard events with the authenticated user's athlete", async () => {
    createClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: "f9b54ff4-f61b-48f5-a682-cd76f8574800" } } })) },
    });
    const playerQuery = {
      select: vi.fn(() => playerQuery), eq: vi.fn(() => playerQuery),
      maybeSingle: vi.fn(async () => ({ data: { id: "c0ffb93f-7851-44d4-96e6-e3044b4b3d55" } })),
    };
    createServiceClient.mockReturnValue({ from: vi.fn(() => playerQuery) });
    const { POST } = await import("@/app/api/analytics/events/route");
    const response = await POST(request({
      ...envelope(), eventName: "profile_edit_completed",
      athleteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      sessionId: "c682bce7-76ac-4c02-9132-8fc6705bf163",
      page: "/dashboard/settings", properties: { section: "social_links" },
    }));
    expect(response.status).toBe(202);
    expect(recordTrustedAnalyticsEvent).toHaveBeenCalledWith(expect.objectContaining({
      userId: "f9b54ff4-f61b-48f5-a682-cd76f8574800",
      athleteId: "c0ffb93f-7851-44d4-96e6-e3044b4b3d55", source: "athlete_dashboard",
    }));
  });

  it("returns 429 when a durable rate-limit bucket is exhausted", async () => {
    createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: null } })) } });
    consumeAnalyticsRateLimits.mockResolvedValue(false);
    const { POST } = await import("@/app/api/analytics/events/route");
    const response = await POST(request({
      ...envelope(), eventName: "locker_viewed",
      athleteId: "c0ffb93f-7851-44d4-96e6-e3044b4b3d55",
      sessionId: "c682bce7-76ac-4c02-9132-8fc6705bf163",
      page: "/player/example", properties: {},
    }));
    expect(response.status).toBe(429);
    expect(recordTrustedAnalyticsEvent).not.toHaveBeenCalled();
  });
});
