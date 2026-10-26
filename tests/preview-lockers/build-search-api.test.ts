// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(), provider: vi.fn(), identity: vi.fn(), enrich: vi.fn(), candidates: vi.fn(), news: vi.fn(), review: vi.fn(), merchandise: vi.fn(), combine: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: m.auth }, rpc: m.rpc, from: m.from }) }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => ({}) }));
vi.mock("@/lib/enrichment/search-provider", () => ({ configuredSearchProvider: m.provider }));
vi.mock("@/lib/preview-lockers/enrichment", () => ({ previewNewsIdentity: (row: unknown) => row, withSchoolAliases: m.identity, readPreviewNewsCandidates: m.candidates, tryEnrichSavedPreview: m.enrich, readPreviewEnrichment: m.news }));
vi.mock("@/lib/preview-lockers/news-review-server", () => ({ readNewsReview: m.review }));
vi.mock("@/lib/preview-lockers/search-server", () => ({ searchSavedCombine: m.combine, searchSavedMerchandise: m.merchandise }));
import { POST } from "@/app/api/preview-lockers/[id]/build-search/route";
import { previewContent } from "@/lib/preview-lockers/validation";
const id = "00000000-0000-4000-8000-000000000001", params = { params: Promise.resolve({ id }) };
const row = { ...previewContent.parse({ slug: "fixture", full_name: "Fixture Player", school: "Cal" }), id, revision: 3, created_at: "", updated_at: "" };
const request = (body: unknown = { revision: 3 }, origin = "http://localhost", signal?: AbortSignal) => new Request("http://localhost/api/preview-lockers/id/build-search", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body), signal });
beforeEach(() => {
  vi.resetAllMocks(); m.auth.mockResolvedValue({ data: { user: { id: "admin" } } }); m.rpc.mockResolvedValue({ data: true });
  for (const key of ["from", "select", "eq"] as const) m[key].mockReturnValue(m);
  m.maybeSingle.mockResolvedValue({ data: row });
  m.provider.mockReturnValue({ name: "fixture", search: vi.fn() }); m.identity.mockResolvedValue({ fullName: row.full_name, sport: "football", schools: ["Cal"], teams: [] });
  m.candidates.mockResolvedValue([]); m.enrich.mockResolvedValue({ status: "complete", news_status: "complete", errors: [], last_awards_attempt: null });
  m.news.mockResolvedValue({ articles: [] }); m.review.mockResolvedValue({ articles: [], version: 1, searched_at: null, identity_key: "a".repeat(64) });
  m.merchandise.mockResolvedValue({ status: 200, body: { revision: 3, review: { result: { items: [] } } } });
  m.combine.mockResolvedValue({ status: 200, body: { revision: 3, result: { suggestions: [], sources: [], status: "complete" } } });
});
it("authorizes before all work, requires the saved revision and rejects caller identity or duplicate tasks", async () => {
  m.auth.mockResolvedValueOnce({ data: { user: null } }); expect((await POST(request(), params)).status).toBe(401);
  m.rpc.mockResolvedValueOnce({ data: false }); expect((await POST(request(), params)).status).toBe(403);
  expect((await POST(request(undefined, "https://other.example.com"), params)).status).toBe(403);
  expect((await POST(request({ revision: 2 }), params)).status).toBe(409);
  expect((await POST(request({ revision: 3, full_name: "Other Player" }), params)).status).toBe(400);
  expect((await POST(request({ revision: 3, tasks: ["news", "news"] }), params)).status).toBe(400);
  expect(m.provider).not.toHaveBeenCalled(); expect(m.enrich).not.toHaveBeenCalled();
});
it("runs all independent tasks concurrently with one shared provider and one combined news/awards operation", async () => {
  const finish: Array<() => void> = [];
  for (const worker of [m.enrich, m.merchandise, m.combine]) {
    const result = await worker.getMockImplementation()!();
    worker.mockImplementationOnce(() => new Promise(resolve => finish.push(() => resolve(result))));
  }
  const running = POST(request(), params);
  await vi.waitFor(() => expect(finish).toHaveLength(3)); finish.forEach(resolve => resolve());
  const response = await running; expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("private, no-store");
  const body = await response.json(); expect(Object.keys(body.tasks).sort()).toEqual(["combine", "merchandise", "news"]);
  expect(body.revision).toBe(3); expect(m.enrich).toHaveBeenCalledOnce();
  expect(m.enrich.mock.calls[0].slice(1, 7)).toEqual([id, row, 3, true, [], "all"]);
  expect(m.enrich.mock.calls[0][7].provider).toBe(m.merchandise.mock.calls[0][3]);
  expect(m.combine.mock.calls[0][3]).toBe(m.merchandise.mock.calls[0][3]);
  expect(m.from.mock.calls.every(([table]) => table === "preview_lockers")).toBe(true);
});
it("keeps a failed worker separate and retries only requested searches without running news or awards again", async () => {
  m.merchandise.mockRejectedValueOnce(new Error("secret provider body"));
  const body = await (await POST(request(), params)).json();
  expect(body.tasks.merchandise).toEqual({ status: 503, error: "search_unavailable" }); expect(body.tasks.news.status).toBe(200); expect(body.tasks.combine.status).toBe(200);
  expect(JSON.stringify(body)).not.toContain("secret provider"); m.enrich.mockClear(); m.combine.mockClear();
  await POST(request({ revision: 3, tasks: ["merchandise"] }), params);
  expect(m.enrich).not.toHaveBeenCalled(); expect(m.combine).not.toHaveBeenCalled();
});
it("rejects revisions changed during searches and does not admit pre-cancelled work", async () => {
  m.maybeSingle.mockResolvedValueOnce({ data: row }).mockResolvedValueOnce({ data: { revision: 4 } });
  expect((await POST(request(), params)).status).toBe(409);
  m.provider.mockClear(); const controller = new AbortController(); controller.abort();
  expect((await POST(request(undefined, "http://localhost", controller.signal), params)).status).toBe(503); expect(m.provider).not.toHaveBeenCalled();
});
