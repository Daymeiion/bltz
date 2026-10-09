// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), actor: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => ({ rpc: mocks.rpc }) }));
vi.mock("@/lib/analytics/preview-event", () => ({ previewAnalyticsActor: mocks.actor }));
vi.mock("@/lib/analytics/bltz-event", () => ({ getAnalyticsRuntimeEnvironment: () => "development" }));

import { POST } from "@/app/api/preview-link-inquiries/route";

const previewId = "556ca192-d9b7-494f-93d6-a498af76ba5a";
function request(origin = "https://bltz.vercel.app", sessionId?: string) {
  return new Request("https://bltz.vercel.app/api/preview-link-inquiries", {
    method: "POST", headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ previewId, email: "Player@Example.com", featureRequests: "More career history", consent: true, ...(sessionId ? { sessionId } : {}) }),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.rpc.mockReturnValue({ abortSignal: async () => ({ data: { saved: true }, error: null }) });
  mocks.actor.mockResolvedValue({ userId: null, excluded: false });
});

it("rejects cross-origin and disabled-link submissions without writing", async () => {
  expect((await POST(request("https://other.example"))).status).toBe(403);
  mocks.rpc.mockReturnValue({ abortSignal: async () => ({ error: { code: "42501" } }) });
  expect((await POST(request())).status).toBe(404);
  expect(mocks.rpc).toHaveBeenCalledTimes(1);
});

it("saves only consented submissions for an enabled preview", async () => {
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(mocks.rpc).toHaveBeenCalledWith("save_preview_link_inquiry", {
    p_preview: previewId, p_email: "player@example.com", p_features: "More career history",
    p_session: null, p_actor: null, p_environment: "development",
  });
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
});

it("saves excluded operational/internal inquiries without exporting them", async () => {
  mocks.actor.mockResolvedValue({ userId: "80000000-0000-4000-8000-000000000001", excluded: true });
  expect((await POST(request())).status).toBe(200);
  expect(mocks.rpc.mock.calls[0][1]).toMatchObject({ p_environment: null });
});

it("does not report saved when the atomic inquiry and delivery transaction fails", async () => {
  mocks.rpc.mockReturnValue({ abortSignal: async () => ({ error: { code: "XX000" } }) });
  const response = await POST(request());
  expect(response.status).toBe(503); expect(await response.json()).toEqual({ error: "unavailable" });
});

it.each([null, {}, { saved: false }])("requires an explicit saved acknowledgment from the inquiry transaction: %j", async (data) => {
  mocks.rpc.mockReturnValue({ abortSignal: async () => ({ data, error: null }) });
  const response = await POST(request());
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ error: "unavailable" });
});

it("preserves the viewing session when persisting an accepted form", async () => {
  const sessionId = "70000000-0000-4000-8000-000000000001";
  const response = await POST(request("https://bltz.vercel.app", sessionId));
  expect(await response.json()).toEqual({ saved: true });
  expect(mocks.rpc.mock.calls[0][1]).toMatchObject({ p_session: sessionId, p_environment: "development" });
});
