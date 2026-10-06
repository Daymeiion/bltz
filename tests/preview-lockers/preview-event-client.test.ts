import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PreviewEventInput } from "@/lib/analytics/preview-client";

const previewId = "c0ffb93f-7851-44d4-96e6-e3044b4b3d55";
let track: typeof import("@/lib/analytics/preview-client").trackPreviewEvent;

beforeEach(async () => {
  vi.restoreAllMocks();
  vi.resetModules();
  window.sessionStorage.clear();
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  track = (await import("@/lib/analytics/preview-client")).trackPreviewEvent;
});

describe("preview event client", () => {
  it("shares the protected conversion tab session, sends an allowlisted payload, and dedupes views", async () => {
    const sessionId = window.crypto.randomUUID();
    sessionStorage.setItem("bltz-preview-session", sessionId);
    const transport = vi.fn<typeof fetch>(async () => new Response(null, { status: 202 }));
    const event = { previewId, eventName: "locker_view" as const, email: "private@example.test", url: "https://example.test?token=secret", token: "secret" };
    expect(await track(event, transport)).toBe(true);
    expect(await track(event, transport)).toBe(false);
    expect(transport).toHaveBeenCalledOnce();
    const [url, init] = transport.mock.calls[0];
    const body = JSON.parse(String(init?.body));
    expect(url).toBe("/api/preview-analytics/events");
    expect(body).toEqual({ previewId, sessionId, eventName: "locker_view", eventId: expect.stringMatching(/^[0-9a-f-]{36}$/i) });
    expect(init).toMatchObject({ keepalive: true, credentials: "same-origin", referrerPolicy: "no-referrer" });
  });

  it("keeps one event id across automatic retries and a later retry after remount", async () => {
    const transport = vi.fn<typeof fetch>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 202 }));
    const event = { previewId, eventName: "photos_view" as const };
    expect(await track(event, transport)).toBe(false);
    vi.resetModules();
    track = (await import("@/lib/analytics/preview-client")).trackPreviewEvent;
    expect(await track(event, transport)).toBe(true);
    expect(await track(event, transport)).toBe(false);
    const bodies = transport.mock.calls.map(([, init]) => JSON.parse(String(init?.body)));
    expect(bodies).toHaveLength(3);
    expect(new Set(bodies.map(body => body.eventId)).size).toBe(1);
    expect(new Set(bodies.map(body => body.sessionId)).size).toBe(1);
  });

  it("keeps retry identity and view dedupe when browser storage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("disabled"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("disabled"); });
    const transport = vi.fn<typeof fetch>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(new Response(null, { status: 202 }));
    const event = { previewId, eventName: "film_view" as const };
    expect(await track(event, transport)).toBe(false);
    expect(await track(event, transport)).toBe(true);
    expect(await track(event, transport)).toBe(false);
    const bodies = transport.mock.calls.map(([, init]) => JSON.parse(String(init?.body)));
    expect(new Set(bodies.map(body => body.eventId)).size).toBe(1);
    expect(new Set(bodies.map(body => body.sessionId)).size).toBe(1);
  });

  it("does not send invisible views or malformed events, asset URLs, or arbitrary progress", async () => {
    const transport = vi.fn<typeof fetch>();
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    expect(await track({ previewId, eventName: "locker_view" }, transport)).toBe(false);
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    for (const event of [
      { previewId: "bad-id", eventName: "locker_view" },
      { previewId, eventName: "unsupported" },
      { previewId, eventName: "photo_open", assetId: "https://example.test/private.jpg?token=secret" },
      { previewId, eventName: "photo_open", assetId: "a".repeat(129) },
      { previewId, eventName: "video_open" },
      { previewId, eventName: "video_progress", assetId: "film", progress: 30 },
      { previewId, eventName: "claim_click", assetId: "film" },
    ]) expect(await track(event as PreviewEventInput, transport)).toBe(false);
    expect(transport).not.toHaveBeenCalled();
  });

  it("dedupes each native video milestone independently and retains repeated image and claim interactions", async () => {
    const transport = vi.fn<typeof fetch>(async () => new Response(null, { status: 202 }));
    for (const progress of [25, 50, 75] as const) {
      expect(await track({ previewId, eventName: "video_progress", assetId: "film", progress }, transport)).toBe(true);
      expect(await track({ previewId, eventName: "video_progress", assetId: "film", progress }, transport)).toBe(false);
    }
    for (const eventName of ["photo_open", "claim_click"] as const) {
      const event = { previewId, eventName, ...(eventName === "photo_open" ? { assetId: "photo" } : {}) };
      expect(await track(event, transport)).toBe(true);
      expect(await track(event, transport)).toBe(true);
    }
    const bodies = transport.mock.calls.map(([, init]) => JSON.parse(String(init?.body)));
    expect(bodies.filter(body => body.eventName === "video_progress").map(body => body.progress)).toEqual([25, 50, 75]);
    expect(new Set(bodies.map(body => body.eventId)).size).toBe(7);
  });

  it("does not retry permanent exclusions and suppresses concurrent duplicate view requests", async () => {
    let resolve!: (response: Response) => void;
    const transport = vi.fn<typeof fetch>(() => new Promise<Response>(done => { resolve = done; }));
    const event = { previewId, eventName: "locker_view" as const };
    const first = track(event, transport);
    expect(await track(event, transport)).toBe(false);
    resolve(new Response(null, { status: 403 }));
    expect(await first).toBe(false);
    expect(await track(event, transport)).toBe(false);
    expect(transport).toHaveBeenCalledOnce();
  });
});
