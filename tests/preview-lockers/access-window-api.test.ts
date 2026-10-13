// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ actor: vi.fn(), admin: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => ({ rpc: mocks.rpc }) }));
vi.mock("@/lib/preview-lockers/server", async importOriginal => ({
  ...await importOriginal<typeof import("@/lib/preview-lockers/server")>(),
  previewLinkActor: mocks.actor, previewAdmin: mocks.admin,
}));
import { POST as start } from "@/app/api/preview-link-access/start/route";
import { POST as extend } from "@/app/api/admin/preview-lockers/[id]/access-extension/route";
import { PreviewError } from "@/lib/preview-lockers/server";
const id = "00000000-0000-4000-8000-000000000010";
const requestId = "00000000-0000-4000-8000-000000000099";
const active = { state: "active", remaining_seconds: 172799, access_started_at: "2026-10-13T10:00:00Z", access_expires_at: "2026-10-15T10:00:00Z", access_extended_at: null };
const request = (body: unknown = { previewId: id, visibility: "visible" }, headers: Record<string,string> = {}) => new Request("https://bltz.me/api/preview-link-access/start", {
  method: "POST", headers: { "content-type": "application/json", origin: "https://bltz.me", "sec-fetch-site": "same-origin", "sec-fetch-dest": "empty", "user-agent": "Mozilla/5.0 Chrome/130.0", ...headers }, body: JSON.stringify(body),
});
beforeEach(() => {
  vi.resetAllMocks(); vi.unstubAllEnvs();
  mocks.actor.mockResolvedValue({ userId: null, isAdmin: false });
  mocks.admin.mockResolvedValue({ client: { rpc: mocks.rpc } });
  mocks.rpc.mockReturnValue({ abortSignal: async () => ({ data: active, error: null }) });
});
it("admits a visible anonymous browser with all analytics configuration absent", async () => {
  vi.stubEnv("VERCEL_ENV", ""); vi.stubEnv("ANALYTICS_DELIVERY_ENABLED", "false");
  const response = await start(request());
  expect(response.status).toBe(200); expect(await response.json()).toEqual(active);
  expect(mocks.rpc).toHaveBeenCalledWith("start_preview_link_access", { p_preview: id, p_actor: null });
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
});
const excludedCases: Record<string, string>[] = [{ "next-router-prefetch": "1" }, { purpose: "prefetch" }, { "sec-purpose": "prerender" }, { "user-agent": "facebookexternalhit/1.1" }, { "user-agent": "LinkedInBot" }, { "user-agent": "HeadlessChrome" }, { "sec-fetch-dest": "document" }, { "sec-fetch-site": "none" }];
it.each(excludedCases)("excludes operational or nonbrowser admission %j", async headers => {
  expect(await (await start(request(undefined, headers))).json()).toEqual({ excluded: true });
  expect(mocks.rpc).not.toHaveBeenCalled(); expect(mocks.actor).not.toHaveBeenCalled();
});
it("excludes a verified Admin without starting time", async () => {
  mocks.actor.mockResolvedValue({ userId: id, isAdmin: true });
  expect(await (await start(request())).json()).toEqual({ excluded: true }); expect(mocks.rpc).not.toHaveBeenCalled();
});
it("rejects hidden, cross-origin and caller-supplied identities before writes", async () => {
  expect((await start(request({ previewId: id, visibility: "hidden" }))).status).toBe(400);
  expect((await start(request(undefined, { origin: "https://other.example" }))).status).toBe(403);
  expect((await start(request({ previewId: id, visibility: "visible", actor: id }))).status).toBe(400);
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("fails closed for expired/disabled links and ambiguous database responses", async () => {
  mocks.rpc.mockReturnValue({ abortSignal: async () => ({ data: null, error: { code: "42501" } }) });
  expect((await start(request())).status).toBe(404);
  mocks.rpc.mockReturnValue({ abortSignal: async () => ({ data: { state: "pending", remaining_seconds: 0 }, error: null }) });
  expect((await start(request())).status).toBe(503);
});
it("requires server Admin authorization for extension", async () => {
  mocks.admin.mockRejectedValue(new PreviewError("forbidden",403));
  expect((await extend(request({ reason: "Personal review request", requestId }), { params: Promise.resolve({ id }) })).status).toBe(403);
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("extends with an audited reason and stable request identity, using no client deadline", async () => {
  mocks.rpc.mockReturnValue({ abortSignal: async () => ({ data: { ...active, saved: true, duplicate: true }, error: null }) });
  const response = await extend(request({ reason: " Personal review request ", requestId }), { params: Promise.resolve({ id }) });
  expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ saved: true, duplicate: true });
  expect(mocks.rpc).toHaveBeenCalledWith("extend_preview_link_access", { p_preview: id, p_reason: "Personal review request", p_request: requestId });
  expect((await extend(request({ reason: "short" }), { params: Promise.resolve({ id }) })).status).toBe(400);
  expect((await extend(request({ reason: "Personal review request", deadline: active.access_expires_at }), { params: Promise.resolve({ id }) })).status).toBe(400);
});
