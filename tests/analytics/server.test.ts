import { beforeEach, describe, expect, it, vi } from "vitest";

const createServiceClient = vi.fn();
vi.mock("@/lib/supabase/service", () => ({ createServiceClient }));

describe("trusted analytics persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-secret";
  });

  it("treats a duplicate client event UUID as a successful no-op", async () => {
    const insertSingle = vi.fn(async () => ({
      data: null,
      error: { code: "23505", message: "duplicate key" },
    }));
    const insertSelect = vi.fn(() => ({ single: insertSingle }));
    const insert = vi.fn(() => ({ select: insertSelect }));
    const lookupSingle = vi.fn(async () => ({ data: { id: "stored-event-id" }, error: null }));
    const lookupEq = vi.fn(() => ({ maybeSingle: lookupSingle }));
    const lookupSelect = vi.fn(() => ({ eq: lookupEq }));
    createServiceClient.mockReturnValue({
      from: vi.fn()
        .mockReturnValueOnce({ insert })
        .mockReturnValueOnce({ select: lookupSelect }),
    });
    const { recordTrustedAnalyticsEvent } = await import("@/lib/analytics/server");
    const result = await recordTrustedAnalyticsEvent({
      eventName: "locker_viewed",
      clientEventId: "8bb12ac1-5181-4df4-8c37-70643339f32b",
      athleteId: "c0ffb93f-7851-44d4-96e6-e3044b4b3d55",
      source: "public_locker",
      page: "/player/example",
    });

    expect(result).toEqual({ eventId: "stored-event-id", duplicate: true });
    expect(lookupEq).toHaveBeenCalledWith("client_event_id", "8bb12ac1-5181-4df4-8c37-70643339f32b");
  });

  it("uses both session and rotating network buckets for anonymous traffic", async () => {
    const rpc = vi.fn(async (_name: string, _args: { p_key_hash: string }) => ({ data: true, error: null }));
    createServiceClient.mockReturnValue({ rpc });
    const { consumeAnalyticsRateLimits } = await import("@/lib/analytics/server");
    const allowed = await consumeAnalyticsRateLimits({
      request: new Request("https://bltz.app/api/analytics/events", {
        headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1" },
      }),
      sessionId: "c682bce7-76ac-4c02-9132-8fc6705bf163",
      userId: null,
    });

    expect(allowed).toBe(true);
    expect(rpc).toHaveBeenCalledTimes(2);
    const firstArgs = rpc.mock.calls[0]?.[1];
    const secondArgs = rpc.mock.calls[1]?.[1];
    if (!firstArgs || !secondArgs) throw new Error("expected both anonymous rate-limit buckets");
    for (const args of [firstArgs, secondArgs]) expect(args.p_key_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(firstArgs.p_key_hash).not.toBe(secondArgs.p_key_hash);
  });
});
