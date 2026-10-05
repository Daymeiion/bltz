import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
      maybeSingle: vi.fn(async () => ({
        data: { id: "c0ffb93f-7851-44d4-96e6-e3044b4b3d55", slug: "example" }, error: null,
      })),
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

  it("rejects a visible athlete target that does not match the player route", async () => {
    createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: null } })) } });
    const playerQuery = {
      select: vi.fn(() => playerQuery), eq: vi.fn(() => playerQuery),
      maybeSingle: vi.fn(async () => ({
        data: { id: "c0ffb93f-7851-44d4-96e6-e3044b4b3d55", slug: "different-athlete" }, error: null,
      })),
    };
    createServiceClient.mockReturnValue({ from: vi.fn(() => playerQuery) });
    const { POST } = await import("@/app/api/analytics/events/route");
    const response = await POST(request({
      ...envelope(), eventName: "locker_viewed",
      athleteId: "c0ffb93f-7851-44d4-96e6-e3044b4b3d55",
      sessionId: "c682bce7-76ac-4c02-9132-8fc6705bf163",
      page: "/player/example", properties: {},
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "athlete_context_mismatch" });
    expect(recordTrustedAnalyticsEvent).not.toHaveBeenCalled();
  });

  it("associates dashboard events with the authenticated user's athlete", async () => {
    createClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: "f9b54ff4-f61b-48f5-a682-cd76f8574800" } } })) },
    });
    const playerQuery = {
      select: vi.fn(() => playerQuery), eq: vi.fn(() => playerQuery),
      maybeSingle: vi.fn(async () => ({ data: { id: "c0ffb93f-7851-44d4-96e6-e3044b4b3d55" }, error: null })),
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

describe("production audience and asset boundaries", () => {
  const playerId = "c0ffb93f-7851-44d4-96e6-e3044b4b3d55";
  const assetId = "8047df5b-87da-47bd-8468-7bb4181c2743";
  let actorCheck: ReturnType<typeof vi.fn>;
  let assetQuery: { select: ReturnType<typeof vi.fn>; eq: ReturnType<typeof vi.fn>; maybeSingle: ReturnType<typeof vi.fn> };
  beforeEach(() => {
    vi.resetModules(); vi.clearAllMocks();
    vi.stubEnv("BLTZ_ANALYTICS_PIPELINE_ENABLED", "true");
    vi.stubEnv("BLTZ_ANALYTICS_ENVIRONMENT", "production");
    vi.stubEnv("BLTZ_ANALYTICS_PRODUCTION_ENABLED", "true");
    vi.stubEnv("VERCEL_ENV", "production");
    consumeAnalyticsRateLimits.mockResolvedValue(true);
    recordTrustedAnalyticsEvent.mockResolvedValue({ eventId: envelope().eventId, duplicate: false });
    actorCheck = vi.fn().mockResolvedValue({ data: false, error: null });
    createClient.mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) }, rpc: actorCheck });
    const playerQuery = {
      select: vi.fn(() => playerQuery), eq: vi.fn(() => playerQuery),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: playerId, slug: "example" }, error: null }),
    };
    assetQuery = {
      select: vi.fn(() => assetQuery), eq: vi.fn(() => assetQuery),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: assetId, kind: "photo", license_status: "approved", public_locker_approved: true, license_kind: "owned" }, error: null }),
    };
    createServiceClient.mockReturnValue({ from: vi.fn(table => table === "players" ? playerQuery : assetQuery) });
  });
  afterEach(() => vi.unstubAllEnvs());
  const publicBody = () => ({ ...envelope(), eventName: "locker_viewed", athleteId: playerId,
    sessionId: "c682bce7-76ac-4c02-9132-8fc6705bf163", page: "/player/example", properties: {} });
  it("marks authenticated internal admins as internal in production", async () => {
    actorCheck.mockResolvedValue({ data: true, error: null });
    createClient.mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "internal-user" } } }) }, rpc: actorCheck });
    const { POST } = await import("@/app/api/analytics/events/route");
    expect((await POST(request(publicBody()))).status).toBe(202);
    expect(actorCheck).toHaveBeenCalledWith("is_internal_admin");
    expect(recordTrustedAnalyticsEvent).toHaveBeenCalledWith(expect.objectContaining({ activityClass: "internal" }));
  });
  it("marks bot traffic as operational in production", async () => {
    const req = request(publicBody()); req.headers.set("user-agent", "ExampleCrawler");
    const { POST } = await import("@/app/api/analytics/events/route");
    expect((await POST(req)).status).toBe(202);
    expect(recordTrustedAnalyticsEvent).toHaveBeenCalledWith(expect.objectContaining({ activityClass: "operational" }));
  });
  it("binds a currently approved asset only after athlete-scoped lookup", async () => {
    const { POST } = await import("@/app/api/analytics/events/route");
    expect((await POST(request({ ...publicBody(), eventName: "media_viewed", properties: { media_id: assetId, media_type: "photo" } }))).status).toBe(202);
    expect(assetQuery.eq).toHaveBeenCalledWith("id", assetId);
    expect(assetQuery.eq).toHaveBeenCalledWith("player_id", playerId);
    expect(recordTrustedAnalyticsEvent).toHaveBeenCalledWith(expect.objectContaining({ validatedContext: { assetId, assetModel: "legacy_media" } }));
  });
  it("preserves an open without exporting a revoked asset binding", async () => {
    assetQuery.maybeSingle.mockResolvedValue({ data: { id: assetId, kind: "photo", license_status: "revoked", public_locker_approved: true, license_kind: "owned" }, error: null });
    const { POST } = await import("@/app/api/analytics/events/route");
    expect((await POST(request({ ...publicBody(), eventName: "media_viewed", properties: { media_id: assetId, media_type: "photo" } }))).status).toBe(202);
    expect(recordTrustedAnalyticsEvent.mock.calls[0][0]).not.toHaveProperty("validatedContext");
  });
  it("does not store a public audience event if internal actor verification fails", async () => {
    actorCheck.mockResolvedValue({ data: null, error: { message: "unavailable" } });
    createClient.mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "internal-user" } } }) }, rpc: actorCheck });
    const { POST } = await import("@/app/api/analytics/events/route");
    expect((await POST(request(publicBody()))).status).toBe(503);
    expect(recordTrustedAnalyticsEvent).not.toHaveBeenCalled();
  });
});
