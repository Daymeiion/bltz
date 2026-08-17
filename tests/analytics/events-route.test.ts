import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const createClient = vi.fn();
const createServiceClient = vi.fn();
const recordTrustedAnalyticsEvent = vi.fn();

vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient }));
vi.mock("@/lib/analytics/server", () => ({ recordTrustedAnalyticsEvent }));

function request(body: unknown) {
  return new NextRequest("http://localhost/api/analytics/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("beta analytics ingestion", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    recordTrustedAnalyticsEvent.mockResolvedValue("8bb12ac1-5181-4df4-8c37-70643339f32b");
  });

  it("requires authentication for athlete-dashboard events", async () => {
    createClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: null } })) },
    });
    const { POST } = await import("@/app/api/analytics/events/route");

    const response = await POST(request({
      eventName: "field_edited",
      sessionId: "c682bce7-76ac-4c02-9132-8fc6705bf163",
      source: "athlete_dashboard",
      page: "/dashboard",
      properties: { field: "bio" },
    }));

    expect(response.status).toBe(401);
    expect(createServiceClient).not.toHaveBeenCalled();
    expect(recordTrustedAnalyticsEvent).not.toHaveBeenCalled();
  });

  it("rejects sensitive analytics property keys", async () => {
    const { POST } = await import("@/app/api/analytics/events/route");

    const response = await POST(request({
      eventName: "locker_viewed",
      athleteId: "c0ffb93f-7851-44d4-96e6-e3044b4b3d55",
      sessionId: "c682bce7-76ac-4c02-9132-8fc6705bf163",
      source: "public_locker",
      page: "/player/example",
      properties: { access_token: "must-not-be-stored" },
    }));

    expect(response.status).toBe(400);
    expect(createClient).not.toHaveBeenCalled();
    expect(recordTrustedAnalyticsEvent).not.toHaveBeenCalled();
  });

  it("verifies a public athlete before accepting a Locker event", async () => {
    createClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: null } })) },
    });

    const rateQuery = {
      select: vi.fn(() => rateQuery),
      eq: vi.fn(() => rateQuery),
      gte: vi.fn(async () => ({ count: 0, error: null })),
    };
    const playerQuery = {
      select: vi.fn(() => playerQuery),
      eq: vi.fn(() => playerQuery),
      maybeSingle: vi.fn(async () => ({
        data: { id: "c0ffb93f-7851-44d4-96e6-e3044b4b3d55" },
        error: null,
      })),
    };
    createServiceClient.mockReturnValue({
      from: vi.fn((table: string) => table === "analytics_events" ? rateQuery : playerQuery),
    });

    const { POST } = await import("@/app/api/analytics/events/route");
    const response = await POST(request({
      eventName: "locker_shared",
      athleteId: "c0ffb93f-7851-44d4-96e6-e3044b4b3d55",
      sessionId: "c682bce7-76ac-4c02-9132-8fc6705bf163",
      source: "public_locker",
      page: "/player/example",
      properties: { share_destination: "linkedin" },
    }));

    expect(response.status).toBe(202);
    expect(recordTrustedAnalyticsEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: "locker_shared",
      userId: null,
      athleteId: "c0ffb93f-7851-44d4-96e6-e3044b4b3d55",
    }));
  });

  it("associates authenticated dashboard events with the server-resolved athlete", async () => {
    createClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: "f9b54ff4-f61b-48f5-a682-cd76f8574800" } } })) },
    });

    const rateQuery = {
      select: vi.fn(() => rateQuery),
      eq: vi.fn(() => rateQuery),
      gte: vi.fn(async () => ({ count: 0, error: null })),
    };
    const playerQuery = {
      select: vi.fn(() => playerQuery),
      eq: vi.fn(() => playerQuery),
      maybeSingle: vi.fn(async () => ({ data: { id: "c0ffb93f-7851-44d4-96e6-e3044b4b3d55" } })),
    };
    createServiceClient.mockReturnValue({
      from: vi.fn((table: string) => table === "analytics_events" ? rateQuery : playerQuery),
    });

    const { POST } = await import("@/app/api/analytics/events/route");
    const response = await POST(request({
      eventName: "profile_edit_completed",
      sessionId: "c682bce7-76ac-4c02-9132-8fc6705bf163",
      source: "athlete_dashboard",
      page: "/dashboard/settings",
      properties: { section: "social_links", changed_fields: ["twitter"] },
    }));

    expect(response.status).toBe(202);
    expect(recordTrustedAnalyticsEvent).toHaveBeenCalledWith(expect.objectContaining({
      userId: "f9b54ff4-f61b-48f5-a682-cd76f8574800",
      athleteId: "c0ffb93f-7851-44d4-96e6-e3044b4b3d55",
    }));
  });
});
