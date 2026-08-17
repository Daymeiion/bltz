import { beforeEach, describe, expect, it, vi } from "vitest";
import { trackProductEvent } from "@/lib/analytics/client";

describe("analytics client", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("sends one anonymous public event for a dedupe key", async () => {
    const transport = vi.fn<typeof fetch>(async () => new Response(null, { status: 202 }));
    const event = {
      eventName: "locker_viewed" as const,
      source: "public_locker" as const,
      athleteId: "c0ffb93f-7851-44d4-96e6-e3044b4b3d55",
      properties: { viewer_mode: "public" },
      dedupeKey: "locker_viewed:example",
    };

    expect(await trackProductEvent(event, transport as typeof fetch)).toBe(true);
    expect(await trackProductEvent(event, transport as typeof fetch)).toBe(false);
    expect(transport).toHaveBeenCalledTimes(1);

    const [, init] = transport.mock.calls[0];
    const request = JSON.parse(String(init?.body));
    expect(request).toMatchObject({
      eventName: "locker_viewed",
      athleteId: event.athleteId,
    });
    expect(request).not.toHaveProperty("source");
    expect(request).not.toHaveProperty("userId");
    expect(request.sessionId).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("fails closed when analytics transport fails", async () => {
    const transport = vi.fn<typeof fetch>(async () => { throw new Error("offline"); });
    const accepted = await trackProductEvent({
      eventName: "profile_edit_completed",
      source: "athlete_dashboard",
      properties: { section: "social_links", changed_fields: ["twitter"] },
    }, transport as typeof fetch);

    expect(accepted).toBe(false);
  });

  it("reuses one durable event id across automatic and later delivery retries", async () => {
    const transport = vi.fn<typeof fetch>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(new Response(null, { status: 202 }));
    const event = {
      eventName: "locker_viewed" as const,
      source: "public_locker" as const,
      athleteId: "c0ffb93f-7851-44d4-96e6-e3044b4b3d55",
      properties: {},
      dedupeKey: "retryable-locker-view",
    };

    expect(await trackProductEvent(event, transport)).toBe(false);
    expect(await trackProductEvent(event, transport)).toBe(true);
    expect(transport).toHaveBeenCalledTimes(3);
    const eventIds = transport.mock.calls.map(([, init]) => JSON.parse(String(init?.body)).eventId);
    const occurredAtValues = transport.mock.calls.map(([, init]) => JSON.parse(String(init?.body)).occurredAt);
    expect(new Set(eventIds).size).toBe(1);
    expect(new Set(occurredAtValues).size).toBe(1);
  });

  it("does not send a public event without an athlete target", async () => {
    const transport = vi.fn();
    const accepted = await trackProductEvent({
      eventName: "locker_shared",
      source: "public_locker",
      athleteId: null,
      properties: { mechanism: "clipboard" },
    }, transport as typeof fetch);

    expect(accepted).toBe(false);
    expect(transport).not.toHaveBeenCalled();
  });

  it("accepts an athlete slug as the public event target", async () => {
    const transport = vi.fn<typeof fetch>(async () => new Response(null, { status: 202 }));
    const accepted = await trackProductEvent({
      eventName: "locker_viewed",
      source: "public_locker",
      athleteSlug: "test-athlete",
      properties: {},
    }, transport);

    expect(accepted).toBe(true);
    expect(JSON.parse(String(transport.mock.calls[0]?.[1]?.body))).toMatchObject({
      eventName: "locker_viewed",
      athleteSlug: "test-athlete",
    });
  });
});
