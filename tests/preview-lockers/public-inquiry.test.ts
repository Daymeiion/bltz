// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ allowed: vi.fn(), from: vi.fn(), insert: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => ({ from: mocks.from }) }));
vi.mock("@/lib/preview-lockers/server", () => ({ isPublicPreview: mocks.allowed }));

import { POST } from "@/app/api/preview-link-inquiries/route";

const previewId = "556ca192-d9b7-494f-93d6-a498af76ba5a";
function request(origin = "https://bltz.vercel.app") {
  return new Request("https://bltz.vercel.app/api/preview-link-inquiries", {
    method: "POST", headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ previewId, email: "Player@Example.com", featureRequests: "More career history", consent: true }),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.from.mockReturnValue({ insert: mocks.insert });
  mocks.insert.mockResolvedValue({ error: null });
});

it("rejects cross-origin and disabled-link submissions without writing", async () => {
  expect((await POST(request("https://other.example"))).status).toBe(403);
  mocks.allowed.mockResolvedValue(false);
  expect((await POST(request())).status).toBe(404);
  expect(mocks.insert).not.toHaveBeenCalled();
});

it("saves only consented submissions for an enabled preview", async () => {
  mocks.allowed.mockResolvedValue(true);
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
    preview_id: previewId, email: "player@example.com", feature_requests: "More career history",
  }));
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
});
