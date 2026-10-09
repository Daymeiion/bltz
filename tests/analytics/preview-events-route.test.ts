// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { previewSprintEventSchema } from "@/lib/analytics/bltz-event";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), role: vi.fn(), rpc: vi.fn(), rate: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.role }) }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => ({ rpc: mocks.rpc }) }));
vi.mock("@/lib/analytics/server", () => ({ consumeAnalyticsRateLimits: mocks.rate }));
import { POST } from "@/app/api/preview-analytics/events/route";
const previewId = "10000000-0000-4000-8000-000000000001";
const eventId = "60000000-0000-4000-8000-000000000001";
const sessionId = "70000000-0000-4000-8000-000000000001";
const input = { previewId, eventId, sessionId, eventName: "locker_view" };
function request(data: unknown = input, headers: Record<string, string> = {}) {
  return new Request("https://bltz.vercel.app/api/preview-analytics/events", { method: "POST", headers: { origin: "https://bltz.vercel.app", "content-type": "application/json", ...headers }, body: JSON.stringify(data) });
}
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("BLTZ_ANALYTICS_PIPELINE_ENABLED", "true"); vi.stubEnv("BLTZ_ANALYTICS_ENVIRONMENT", "development"); vi.stubEnv("VERCEL_ENV", "preview");
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: null }); mocks.role.mockResolvedValue({ data: false, error: null }); mocks.rate.mockResolvedValue(true);
  mocks.rpc.mockReturnValue({ abortSignal: async () => ({ data: { accepted: true, eventId, duplicate: false }, error: null }) });
});
afterEach(() => vi.unstubAllEnvs());
describe("bounded preview event endpoint", () => {
  it("passes only verified identity and server environment to the scoped RPC", async () => {
    expect((await POST(request())).status).toBe(202);
    expect(mocks.rpc).toHaveBeenCalledWith("record_preview_analytics_event", { p_input: input, p_actor: null, p_environment: "development" });
  });
  it("rejects origin, sensitive/unknown fields, URLs and oversized streamed bodies before touching the database", async () => {
    expect((await POST(request(input, { origin: "https://other.example" }))).status).toBe(403);
    for (const bad of [{ ...input, userId: previewId }, { ...input, email: "private@example.com" }, { ...input, environment: "production" }, { ...input, eventName: "photo_open", assetId: "https://photos.example/1" }, { ...input, eventName: "video_progress", assetId: "film", progress: 10 }]) expect((await POST(request(bad))).status).toBe(400);
    expect((await POST(request({ padding: "a".repeat(2049) }))).status).toBe(413);
    expect(mocks.rpc).not.toHaveBeenCalled(); expect(mocks.getUser).not.toHaveBeenCalled();
  });
  it("excludes bot, prefetch, internal and disabled-runtime traffic", async () => {
    const operationalHeaders: Record<string, string>[] = [{ "user-agent": "UptimeBot" }, { purpose: "prefetch" }, { "sec-purpose": "prefetch;prerender" }, { "next-router-prefetch": "1" }];
    for (const headers of operationalHeaders) expect(await (await POST(request(input, headers))).json()).toMatchObject({ accepted: false, excluded: true });
    mocks.getUser.mockResolvedValue({ data: { user: { id: previewId } }, error: null }); mocks.role.mockResolvedValue({ data: true, error: null });
    expect(await (await POST(request())).json()).toMatchObject({ accepted: false, excluded: true });
    vi.stubEnv("BLTZ_ANALYTICS_PIPELINE_ENABLED", "false"); expect(await (await POST(request())).json()).toMatchObject({ accepted: false, excluded: true });
    expect(mocks.rpc).not.toHaveBeenCalled(); expect(mocks.rate).not.toHaveBeenCalled();
  });
  it("handles revoked/unauthorized access, rate exhaustion and unavailable persistence without false acceptance", async () => {
    mocks.rpc.mockReturnValue({ abortSignal: async () => ({ error: { code: "42501" } }) }); expect((await POST(request())).status).toBe(404);
    mocks.rate.mockResolvedValue(false); expect((await POST(request())).status).toBe(429);
    mocks.rate.mockResolvedValue(true); mocks.rpc.mockReturnValue({ abortSignal: async () => ({ error: { code: "XX000" } }) }); expect((await POST(request())).status).toBe(503);
  });
});
it("preview envelope cannot claim canonical audience/identity or export private context", () => {
  const event = { event_id: eventId, schema_version: 1, event_name: "preview_locker_view", event_version: "preview-sprint-v1", occurred_at: "2026-10-05T00:00:00Z", received_at: "2026-10-05T00:00:00Z", environment: "production", surface: "preview", producer: "bltz_collector", actor_kind: "anonymous", measurement_basis: "unverified_client", audience_eligible: false, subject_player_id: null, moment_id: null, asset_id: null, asset_model: null, session_id: sessionId, scope_key: "preview_sprint", source_channel: "unknown", properties: { preview_id: previewId, event_kind: "locker_view" } };
  expect(previewSprintEventSchema.safeParse(event).success).toBe(true);
  for (const patch of [{ audience_eligible: true }, { subject_player_id: previewId }, { actor_kind: "internal" }, { scope_key: "public_audience" }, { properties: { ...event.properties, email: "private@example.com" } }]) expect(previewSprintEventSchema.safeParse({ ...event, ...patch }).success).toBe(false);
});
