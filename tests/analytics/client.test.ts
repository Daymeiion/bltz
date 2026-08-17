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
      source: "public_locker",
    });
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

  it("releases a dedupe key after transport failure so a later retry can succeed", async () => {
    const transport = vi.fn<typeof fetch>()
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
    expect(transport).toHaveBeenCalledTimes(2);
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
});
