// @vitest-environment-options {"settings":{"disableIframePageLoading":true,"disableCSSFileLoading":true}}
import React, { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LockerView from "@/app/player/[slug]/LockerView";
import PhotoRoomView, { type PhotoRoomData } from "@/app/player/[slug]/photos/PhotoRoomView";
import FilmRoomView, { type FilmRoomData } from "@/app/player/[slug]/videos/FilmRoomView";
import VideoDetailView, { type VideoDetailData } from "@/app/player/[slug]/videos/[videoId]/VideoDetailView";
import { trackProductEvent } from "@/lib/analytics/client";
import { POST } from "@/app/api/analytics/events/route";
import { toLockerData } from "@/lib/preview-lockers/mapper";
import type { PreviewLockerRow } from "@/lib/preview-lockers/types";
import type { PublicVideo } from "@/lib/player/public-video";

const dependencies = vi.hoisted(() => ({ createServiceClient: vi.fn(), createClient: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: dependencies.createServiceClient }));
vi.mock("@/lib/supabase/server", () => ({ createClient: dependencies.createClient }));
vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/image", () => ({
  // This test substitutes the Next image runtime while retaining its DOM output.
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ fill: _fill, priority: _priority, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean }) => <img {...props} alt={props.alt ?? ""} />,
}));
vi.mock("next/link", () => ({ default: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props} /> }));
// These visual children have no collector ownership. Keep the actual room/Locker
// effects and interaction handlers, serializer, validator and writer unmocked.
vi.mock("@/components/player/VideoPreview", () => ({ VideoPreview: () => null }));
vi.mock("@/components/player/YouTubePlayer", () => ({ YouTubePlayer: () => null }));
vi.mock("@/components/player/FittedHeroName", () => ({ FittedHeroName: () => null }));
vi.mock("@/components/player/SpotifyPreviewBadge", () => ({ SpotifyPreviewBadge: () => null }));

const ATHLETE_ID = "c0ffb93f-7851-44d4-96e6-e3044b4b3d55";
const SLUG = "delivery-athlete";
const video: PublicVideo = {
  id: "f1c55f2f-30e2-4ae1-8e74-a0fb400723a5", title: "Career film", description: null,
  thumbnailUrl: null, playbackUrl: null, durationSeconds: null, level: "pro", season: "2008",
  attribution: "Reviewed archive", sourceLabel: "Archive", tags: [], publishedAt: null,
};
const film: FilmRoomData = {
  athleteId: ATHLETE_ID, slug: SLUG, athleteName: "Delivery Athlete",
  athleteHeadshotUrl: "/headshot.svg", accentColor: "#ffbb00", videos: [video],
};
const photos: PhotoRoomData = {
  athleteId: ATHLETE_ID, slug: SLUG, athleteName: "Delivery Athlete",
  athleteHeadshotUrl: "/headshot.svg", accentColor: "#ffbb00", images: [{
    id: "1fc6a5c0-3411-49d1-9017-2669b1258935", url: "/photo.jpg", title: "Career photo",
    credits: "Archive", sourceUrl: null, level: "pro", season: "2008", licenseLabel: "Reviewed",
    width: 1200, height: 800,
  }],
};
const detail: VideoDetailData = {
  ...film, video, playerId: ATHLETE_ID, views: 0, likes: 0, taggedTeammates: [], isFollowing: false,
};
function lockerData() {
  const data = toLockerData({ slug: SLUG, full_name: "Delivery Athlete", school_info: null, awards: [], photos: [], videos: [] } as unknown as PreviewLockerRow);
  data.athleteId = ATHLETE_ID;
  delete data.lockerHref;
  return data;
}

type StoredEvent = {
  id: string; client_event_id: string; event_name: string; athlete_id: string | null;
  user_id: string | null; session_id: string | null; source: string; page: string | null;
  occurred_at: string; properties: Record<string, unknown>;
};

/** An isolated Supabase protocol boundary; no live database or cloud call. */
function memoryService() {
  const events = new Map<string, StoredEvent>();
  let visible = true;
  let storedSlug = SLUG;
  const rpc = vi.fn(async () => ({ data: true, error: null }));
  const from = vi.fn((table: string) => {
    if (table === "players") {
      const filters = new Map<string, unknown>();
      const query = {
        select: vi.fn(() => query),
        eq: vi.fn((key: string, value: unknown) => { filters.set(key, value); return query; }),
        maybeSingle: vi.fn(async () => ({
          data: visible && filters.get("visibility") === true
            && (filters.get("id") === ATHLETE_ID || filters.get("slug") === storedSlug)
            ? { id: ATHLETE_ID, slug: storedSlug } : null,
          error: null,
        })),
      };
      return query;
    }
    if (table !== "analytics_events") throw new Error(`Unexpected table ${table}`);
    return {
      insert: (row: Omit<StoredEvent, "id">) => ({ select: () => ({ single: async () => {
        if (events.has(row.client_event_id)) return { data: null, error: { code: "23505", message: "duplicate" } };
        const stored = { ...row, id: window.crypto.randomUUID() };
        events.set(row.client_event_id, stored);
        return { data: { id: stored.id }, error: null };
      } }) }),
      select: () => ({ eq: (_key: string, eventId: string) => ({ maybeSingle: async () => ({
        data: events.has(eventId) ? { id: events.get(eventId)!.id } : null, error: null,
      }) }) }),
    };
  });
  return { events, rpc, from, hide: () => { visible = false; }, mismatch: () => { storedSlug = "other-athlete"; } };
}

describe("actual component → serializer → collector → persistence", () => {
  let root: Root;
  let host: HTMLDivElement;
  let service: ReturnType<typeof memoryService>;
  let requests: Array<Record<string, unknown>>;
  let responses: Response[];
  let pending: Promise<Response>[];
  let loseFirstResponse: boolean;

  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "isolated-test-secret");
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    class Observer { observe() {} unobserve() {} disconnect() {} }
    vi.stubGlobal("ResizeObserver", Observer);
    vi.stubGlobal("IntersectionObserver", Observer);
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    dependencies.createClient.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: null } }) } });
    service = memoryService();
    dependencies.createServiceClient.mockReturnValue(service);
    requests = []; responses = []; pending = []; loseFirstResponse = false;
    vi.stubGlobal("fetch", vi.fn<typeof fetch>((input, init) => {
      if (input !== "/api/analytics/events") throw new Error(`Unexpected request ${String(input)}`);
      requests.push(JSON.parse(String(init?.body)));
      const response = POST(new NextRequest("http://localhost/api/analytics/events", {
        method: init?.method, body: init?.body ?? undefined, keepalive: init?.keepalive,
        headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.10" },
      })).then((result) => {
        responses.push(result);
        if (loseFirstResponse) { loseFirstResponse = false; throw new Error("response lost after durable insert"); }
        return result;
      });
      pending.push(response);
      return response;
    }));
    host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs();
  });

  async function settle() {
    for (let index = 0; index < pending.length; index += 1) await pending[index].catch(() => undefined);
  }
  async function mount(element: ReactElement, pathname: string) {
    window.history.replaceState(null, "", pathname);
    await act(async () => { root.render(element); await Promise.resolve(); });
    await settle();
  }

  it.each([
    { label: "Locker", element: () => <LockerView data={lockerData()} />, path: `/player/${SLUG}`, eventName: "locker_viewed" },
    { label: "Photo Room", element: () => <PhotoRoomView data={photos} />, path: `/player/${SLUG}/photos`, eventName: "photo_gallery_opened" },
    { label: "Film Room", element: () => <FilmRoomView data={film} />, path: `/player/${SLUG}/videos`, eventName: "film_room_opened" },
    { label: "Video Detail", element: () => <VideoDetailView data={detail} />, path: `/player/${SLUG}/videos/${video.id}`, eventName: "media_viewed" },
  ])("accepts and persists the real $label component payload", async ({ element, path, eventName }) => {
    await mount(element(), `${path}?token=private#secret`);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ athleteId: ATHLETE_ID, eventName, page: path });
    expect(requests[0]).not.toHaveProperty("athleteSlug");
    expect(requests[0]).not.toHaveProperty("source");
    expect(responses[0].status).toBe(202);
    expect([...service.events.values()]).toEqual([expect.objectContaining({
      athlete_id: ATHLETE_ID, event_name: eventName, source: "public_locker", user_id: null, page: path,
    })]);
    expect(service.rpc).toHaveBeenCalled();
  });

  it("falls back to the route slug when the real component has no canonical ID", async () => {
    await mount(<PhotoRoomView data={{ ...photos, athleteId: null }} />, `/player/${SLUG}/photos`);
    expect(requests[0]).toMatchObject({ athleteSlug: SLUG });
    expect(requests[0]).not.toHaveProperty("athleteId");
    expect(responses[0].status).toBe(202);
    expect([...service.events.values()][0].athlete_id).toBe(ATHLETE_ID);
  });

  it("persists once when the response is lost after insert and the client retries", async () => {
    loseFirstResponse = true;
    await mount(<PhotoRoomView data={photos} />, `/player/${SLUG}/photos`);
    expect(requests).toHaveLength(2);
    expect(requests[0].eventId).toBe(requests[1].eventId);
    expect(requests[0].occurredAt).toBe(requests[1].occurredAt);
    expect(service.events.size).toBe(1);
    expect(await responses[1].json()).toMatchObject({ accepted: true, duplicate: true });
  });

  it("records a photo selection as a legacy open, not measured exposure or playback", async () => {
    await mount(<PhotoRoomView data={photos} />, `/player/${SLUG}/photos`);
    const tile = host.querySelector<HTMLButtonElement>(`button[aria-label="View ${photos.images[0].title}"]`);
    expect(tile).not.toBeNull();
    await act(async () => tile!.click()); await settle();
    const media = [...service.events.values()].find((event) => event.event_name === "media_viewed");
    expect(media?.properties).toMatchObject({ media_id: photos.images[0].id, media_type: "photo" });
    expect(media?.properties).not.toHaveProperty("playback_seconds");
    expect(media?.properties).not.toHaveProperty("visible_duration_ms");
  });

  it("identifies clipboard share events as intent and a legacy alias, not confirmed distribution", async () => {
    const copy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    await mount(<VideoDetailView data={detail} />, `/player/${SLUG}/videos/${video.id}`);
    const button = host.querySelector<HTMLButtonElement>('button[aria-label="Copy video share link"]');
    expect(button).not.toBeNull();
    await act(async () => button!.click()); await settle();
    expect(copy).toHaveBeenCalledOnce();
    const shareEvents = [...service.events.values()].filter((event) => event.event_name !== "media_viewed");
    expect(shareEvents.map((event) => event.event_name)).toEqual(["share_link_copied", "locker_shared"]);
    expect(shareEvents[1].properties).toMatchObject({ mechanism: "clipboard" });
    for (const event of shareEvents) {
      expect(event.properties).not.toHaveProperty("distribution_id");
      expect(event.properties).not.toHaveProperty("confirmed_post");
    }
  });

  it("keeps the validator strict for callers bypassing the repaired serializer", async () => {
    const response = await POST(new NextRequest("http://localhost/api/analytics/events", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        eventId: window.crypto.randomUUID(), eventName: "locker_viewed", occurredAt: new Date().toISOString(),
        athleteId: ATHLETE_ID, athleteSlug: SLUG, page: `/player/${SLUG}`, sessionId: window.crypto.randomUUID(), properties: {},
      }),
    }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_event" });
    expect(dependencies.createClient).not.toHaveBeenCalled();
    expect(service.events.size).toBe(0);
  });

  it("retains server rejection when a canonical athlete does not match the route slug", async () => {
    service.mismatch();
    await mount(<PhotoRoomView data={photos} />, `/player/${SLUG}/photos`);
    expect(responses[0].status).toBe(400);
    expect(await responses[0].json()).toEqual({ error: "athlete_context_mismatch" });
    expect(service.events.size).toBe(0);
  });

  it("retains public visibility checks for actual component events", async () => {
    service.hide();
    await mount(<PhotoRoomView data={photos} />, `/player/${SLUG}/photos`);
    expect(responses[0].status).toBe(404);
    expect(service.events.size).toBe(0);
  });

  it("does not persist the private-preview Video Detail effect", async () => {
    await mount(<VideoDetailView data={{ ...detail, lockerHref: `/preview-lockers/${SLUG}` }} />, `/preview-lockers/${SLUG}/videos/${video.id}`);
    expect(service.events.size).toBe(0);
    expect(responses.every((response) => response.status === 400)).toBe(true);
  });

  it.each([`/admin/intelligence`, `/synthetic-examples/player/${SLUG}`])("rejects audience events on excluded route %s", async (page) => {
    expect(await trackProductEvent({ eventName: "locker_viewed", source: "public_locker", athleteId: ATHLETE_ID, athleteSlug: SLUG, page })).toBe(false);
    expect(responses[0].status).toBe(400);
    expect(service.events.size).toBe(0);
  });

  it("rejects nested private properties before authentication or persistence", async () => {
    expect(await trackProductEvent({
      eventName: "locker_viewed", source: "public_locker", athleteId: ATHLETE_ID, athleteSlug: SLUG,
      page: `/player/${SLUG}`, properties: { context: { access_token: "never-persist" } },
    })).toBe(false);
    expect(await responses[0].json()).toEqual({ error: "sensitive_properties_rejected" });
    expect(dependencies.createClient).not.toHaveBeenCalled();
    expect(service.events.size).toBe(0);
  });
});
