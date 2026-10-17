// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn(), from: vi.fn(), insert: vi.fn(), eq: vi.fn(), select: vi.fn(), single: vi.fn(), maybeSingle: vi.fn(), enrich: vi.fn(), candidates: vi.fn(), service: vi.fn(), read: vi.fn() }));
const queue = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("@/lib/preview-lockers/news-review-server", () => ({ readNewsReview: queue.read }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mock.auth }, rpc: mock.rpc, from: mock.from }) }));
vi.mock("@/lib/preview-lockers/enrichment", () => ({ previewIdentityKey: () => "a".repeat(64), tryEnrichSavedPreview: mock.enrich, readPreviewNewsCandidates: mock.candidates, readPreviewEnrichment: mock.read }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: mock.service }));
import { POST as create } from "@/app/api/preview-lockers/route";
import { GET as readNews, POST as refresh, PATCH as dismiss } from "@/app/api/preview-lockers/[id]/news/route";
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
  mock.read.mockResolvedValue({ articles: [{ headline: "Saved matching article" }] });
  queue.read.mockResolvedValue({ articles: [], version: 1, searched_at: null, identity_key: "a".repeat(64) });
});

it("returns this saved preview's source articles to an authorized admin without discovery", async () => {
  const response = await readNews(new Request("http://localhost/api/preview-lockers/news"), params);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ articles: [{ headline: "Saved matching article" }], revision: 1, review: { articles: [], version: 1, searched_at: null, identity_key: "a".repeat(64) } });
  expect(mock.read).toHaveBeenCalledWith(expect.anything(), id, row, 1);
  expect(mock.enrich).not.toHaveBeenCalled(); expect(mock.service).not.toHaveBeenCalled();
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
});

it("denies anonymous/non-admin article-list reads before loading any preview", async () => {
  mock.auth.mockResolvedValue({ data: { user: null } });
  expect((await readNews(new Request("http://localhost/news"), params)).status).toBe(401);
  mock.auth.mockResolvedValue({ data: { user: { id: "viewer" } } }); mock.rpc.mockResolvedValue({ data: false });
  expect((await readNews(new Request("http://localhost/news"), params)).status).toBe(403);
  expect(mock.from).not.toHaveBeenCalled(); expect(mock.read).not.toHaveBeenCalled();
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
it("requires the supplied saved revision before spending discovery budget", async () => {
  expect((await refresh(request({ revision: 2 }), params)).status).toBe(409);
  expect(mock.enrich).not.toHaveBeenCalled(); expect(mock.candidates).not.toHaveBeenCalled();
});
it("returns safe full-queue and stale-search statuses without claiming a save", async () => {
  mock.enrich.mockResolvedValue({ status: "unavailable", errors: ["news_review_full"] });
  expect((await refresh(request({ revision: 1 }), params)).status).toBe(422);
  mock.enrich.mockResolvedValue({ status: "unavailable", errors: ["preview_changed"] });
  expect((await refresh(request({ revision: 1 }), params)).status).toBe(409);
});
it("protects dismissals, validates input and never writes curated articles", async () => {
  const body = { revision: 1, version: 1, url: "https://press.example.com/story" };
  mock.auth.mockResolvedValue({ data: { user: null } }); expect((await dismiss(request(body), params)).status).toBe(401);
  mock.auth.mockResolvedValue({ data: { user: { id: "admin" } } });
  expect((await dismiss(request({ ...body, url: "javascript:alert(1)" }), params)).status).toBe(400);
  expect((await dismiss(request({ ...body, articles: [] }), params)).status).toBe(400);
  expect((await dismiss(request(body, "https://other.example.com"), params)).status).toBe(403);
  const response = await dismiss(request(body), params); expect(response.status).toBe(200);
  expect(mock.rpc).toHaveBeenCalledWith("dismiss_preview_news_article", { p_preview_id: id, p_revision: 1, p_version: 1, p_url: body.url });
  expect(mock.enrich).not.toHaveBeenCalled(); expect(response.headers.get("cache-control")).toBe("private, no-store");
  mock.rpc.mockImplementation(async name => name === "dismiss_preview_news_article" ? { error: { code: "PT409" } } : { data: true });
  expect((await dismiss(request(body), params)).status).toBe(409);
});
it("validates bulk news selection and dismisses through one RPC", async () => {
  const urls=["https://press.example.com/1","https://press.example.com/2"];
  for(const bad of [[],[urls[0],urls[0]],Array(201).fill(urls[0]),["javascript:alert(1)"]])expect((await dismiss(request({revision:1,version:1,urls:bad}),params)).status).toBe(400);
  expect((await dismiss(request({revision:1,version:1,url:urls[0],urls}),params)).status).toBe(400);
  const response=await dismiss(request({revision:1,version:1,urls}),params);expect(response.status).toBe(200);
  expect(mock.rpc).toHaveBeenCalledWith("dismiss_preview_news_articles",{p_preview_id:id,p_revision:1,p_version:1,p_urls:urls});
  expect(mock.enrich).not.toHaveBeenCalled();
  mock.rpc.mockImplementation(async name=>name==="dismiss_preview_news_articles"?{error:{code:"PT409"}}:{data:true});
  expect((await dismiss(request({revision:1,version:1,urls}),params)).status).toBe(409);
});

it("restores articles using server-derived identity and bounded pagination",async()=>{
 expect((await dismiss(request({revision:1,version:1,action:"restore",url:"https://press.example.com/one"}),params)).status).toBe(200);
 expect(mock.rpc).toHaveBeenCalledWith("restore_preview_news_article",{p_preview_id:id,p_revision:1,p_version:1,p_identity_key:"a".repeat(64),p_url:"https://press.example.com/one"});
 expect((await readNews(new Request("http://localhost/news?dismissedOffset=200"),params)).status).toBe(200);expect(queue.read).toHaveBeenLastCalledWith(expect.anything(),id,row,200);
 expect((await readNews(new Request("http://localhost/news?dismissedOffset=-1"),params)).status).toBe(400);
 expect((await dismiss(request({revision:1,version:1,action:"restore",urls:[]}),params)).status).toBe(400);
});

it("routes a unique restore batch to one RPC with the saved identity and reports atomic capacity/conflict failures",async()=>{
 const urls=["https://press.example.com/one","https://press.example.com/two"];
 expect((await dismiss(request({revision:1,version:1,action:"restore",urls}),params)).status).toBe(200);
 expect(mock.rpc).toHaveBeenCalledWith("restore_preview_news_articles",{p_preview_id:id,p_revision:1,p_version:1,p_identity_key:"a".repeat(64),p_urls:urls});
 for(const values of [[],[urls[0],urls[0]],[null],Array.from({length:201},(_,n)=>`https://press.example.com/${n}`)])expect((await dismiss(request({revision:1,version:1,action:"restore",urls:values}),params)).status).toBe(400);
 mock.rpc.mockImplementation(async(name:string)=>name==="is_internal_admin"?{data:true}:{error:{code:"PT422"}});
 expect((await dismiss(request({revision:1,version:1,action:"restore",urls}),params)).status).toBe(422);
 mock.rpc.mockImplementation(async(name:string)=>name==="is_internal_admin"?{data:true}:{error:{code:"PT409"}});
 expect((await dismiss(request({revision:1,version:1,action:"restore",urls}),params)).status).toBe(409);
});
