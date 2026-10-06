// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn(), from: vi.fn(), insert: vi.fn(), eq: vi.fn(), select: vi.fn(), single: vi.fn(), maybeSingle: vi.fn(), enrich: vi.fn(), candidates: vi.fn(), service: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mock.auth }, rpc: mock.rpc, from: mock.from }) }));
vi.mock("@/lib/preview-lockers/enrichment", () => ({ tryEnrichSavedPreview: mock.enrich, readPreviewNewsCandidates: mock.candidates }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: mock.service }));
import { POST as create } from "@/app/api/preview-lockers/route";
import { POST as refresh } from "@/app/api/preview-lockers/[id]/news/route";
import { previewContent } from "@/lib/preview-lockers/validation";
const id = "00000000-0000-4000-8000-000000000001";
const content = previewContent.parse({ slug: "fixture-athlete", full_name: "Fixture Athlete" });
const row = { id, ...content, revision: 1, created_at: "", updated_at: "" };
const request = (body: unknown, origin = "http://localhost") => new Request("http://localhost/api/preview-lockers", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });
const params = { params: Promise.resolve({ id }) };
beforeEach(() => {
  vi.resetAllMocks();
  mock.service.mockReturnValue({}); mock.candidates.mockResolvedValue(["https://sports.example.com/old"]);
  mock.auth.mockResolvedValue({ data: { user: { id: "admin" } } }); mock.rpc.mockResolvedValue({ data: true });
  for (const key of ["from", "insert", "eq", "select"] as const) mock[key].mockReturnValue(mock);
  mock.single.mockResolvedValue({ data: row }); mock.maybeSingle.mockResolvedValue({ data: row });
  mock.enrich.mockResolvedValue({ status: "complete", errors: [] });
});
it.each(["news_unavailable", "awards_unavailable"])("keeps the committed preview when %s", async error => {
  mock.enrich.mockResolvedValue({ status: "partial", errors: [error] });
  const response = await create(request({ id, content }));
  expect(response.status).toBe(201); expect(await response.json()).toMatchObject({ id, revision: 1, enrichment: { errors: [error] } });
  expect(mock.enrich).toHaveBeenCalledWith(expect.anything(), id, content, 1);
});
it("does not rerun enrichment on idempotent creation retry", async () => {
  mock.single.mockResolvedValue({ error: { code: "23505" } });
  expect((await create(request({ id, content }))).status).toBe(200);
  expect(mock.enrich).not.toHaveBeenCalled();
});
it("denies anonymous, non-admin and cross-origin refresh before discovery", async () => {
  mock.auth.mockResolvedValue({ data: { user: null } }); expect((await refresh(request({}), params)).status).toBe(401);
  mock.auth.mockResolvedValue({ data: { user: { id: "viewer" } } }); mock.rpc.mockResolvedValue({ data: false }); expect((await refresh(request({}), params)).status).toBe(403);
  mock.rpc.mockResolvedValue({ data: true }); expect((await refresh(request({}, "https://other.example.com"), params)).status).toBe(403);
  expect(mock.enrich).not.toHaveBeenCalled(); expect(mock.from).not.toHaveBeenCalled(); expect(mock.service).not.toHaveBeenCalled();
});
it("refreshes persisted identity only, rejects overrides and reports save failure", async () => {
  expect((await refresh(request({ full_name: "Wrong Athlete" }), params)).status).toBe(400);
  expect((await refresh(request({}), params)).status).toBe(200);
  expect(mock.candidates).toHaveBeenCalledWith(expect.anything(), id, row, 1);
  expect(mock.enrich).toHaveBeenCalledWith(expect.anything(), id, row, 1, true, ["https://sports.example.com/old"]);
  mock.enrich.mockResolvedValue({ status: "unavailable", errors: ["enrichment_not_saved"] });
  const response = await refresh(request({}), params); expect(response.status).toBe(503);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
});

it("preserves saved news when historical candidate retrieval fails", async () => {
  mock.candidates.mockRejectedValue(new Error("saved_news_unavailable"));
  expect((await refresh(request({}), params)).status).toBe(503);
  expect(mock.enrich).not.toHaveBeenCalled();
});
