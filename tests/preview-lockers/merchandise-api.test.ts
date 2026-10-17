// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(), discover: vi.fn(), provider: vi.fn(), identity: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: m.auth }, rpc: m.rpc, from: m.from }) }));
vi.mock("@/lib/preview-lockers/enrichment", () => ({ previewIdentityKey: () => "identity", previewNewsIdentity: (value: unknown) => value, withSchoolAliases: m.identity }));
vi.mock("@/lib/enrichment/search-provider", () => ({ configuredSearchProvider: m.provider }));
vi.mock("@/lib/enrichment/merchandise", async original => ({ ...await original<object>(), discoverMerchandise: m.discover }));
import { POST, PATCH } from "@/app/api/preview-lockers/[id]/merchandise/route";
import { previewContent } from "@/lib/preview-lockers/validation";
const id = "00000000-0000-4000-8000-000000000001";
const row = { ...previewContent.parse({ slug: "fixture-player", full_name: "Fixture Player", school: "Arizona" }), id, revision: 3, created_at: "", updated_at: "" };
const request = (body: unknown = { revision: 3 }, origin = "http://localhost") => new Request("http://localhost/api/preview-lockers/id/merchandise", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });
const params = { params: Promise.resolve({ id }) };
beforeEach(() => {
  vi.resetAllMocks(); m.auth.mockResolvedValue({ data: { user: { id: "admin" } } });
  m.rpc.mockImplementation(async (name: string, args?: { p_result: unknown }) => ({ data: name === "save_preview_merchandise_search" ? { result: args?.p_result, version: 1, searched_at: "2026-10-17T00:00:00Z", identity_key: "a".repeat(64), dismissed_urls: [] } : name === "admit_preview_discovery" ? "ticket" : true }));
  for (const name of ["from", "select", "eq"] as const) m[name].mockReturnValue(m);
  m.maybeSingle.mockResolvedValue({ data: row }); m.provider.mockReturnValue({ name: "fixture" });
  m.identity.mockResolvedValue({ fullName: "Fixture Player", sport: "football", schools: ["Arizona"], teams: ["San Diego Chargers"] });
  m.discover.mockResolvedValue({ items: [], status: "complete", candidates: 0, rejected: 0, errors: [] });
});
it("requires Admin and same-origin JSON before any lookup or search", async () => {
  m.auth.mockResolvedValue({ data: { user: null } }); expect((await POST(request(), params)).status).toBe(401);
  m.auth.mockResolvedValue({ data: { user: { id: "viewer" } } }); m.rpc.mockResolvedValue({ data: false }); expect((await POST(request(), params)).status).toBe(403);
  m.rpc.mockResolvedValue({ data: true }); expect((await POST(request(undefined, "https://other.example.com"), params)).status).toBe(403);
  expect(m.from).not.toHaveBeenCalled(); expect(m.discover).not.toHaveBeenCalled();
});
it("accepts only the saved revision and never caller identity/URL overrides", async () => {
  expect((await POST(request({ revision: 3, fullName: "Someone Else" }), params)).status).toBe(400);
  expect((await POST(request({ revision: 3, url: "https://internal.local" }), params)).status).toBe(400);
  expect((await POST(request({ revision: 2 }), params)).status).toBe(409);
  expect(m.discover).not.toHaveBeenCalled(); expect(m.rpc).not.toHaveBeenCalledWith("admit_preview_discovery", expect.anything());
});
it("returns review-only results and finalizes the existing discovery admission without a Locker write", async () => {
  const response = await POST(request(), params);
  expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(await response.json()).toMatchObject({ revision: 3, result: { items: [], status: "complete" } });
  expect(m.identity).toHaveBeenCalledWith(expect.anything(), row);
  expect(m.rpc).toHaveBeenCalledWith("finalize_preview_discovery", { p_request_id: "ticket", p_succeeded: true });
  expect(m.from.mock.calls.every(([table]) => table === "preview_lockers")).toBe(true);
});
it("does not search without configuration, identity or admission", async () => {
  m.provider.mockReturnValue(null); expect((await POST(request(), params)).status).toBe(503);
  m.provider.mockReturnValue({}); m.identity.mockResolvedValue({ fullName: "Fixture Player", sport: "football", schools: [], teams: [] }); expect((await POST(request(), params)).status).toBe(400);
  m.identity.mockResolvedValue({ fullName: "Fixture Player", sport: "football", schools: ["Arizona"], teams: [] });
  m.rpc.mockImplementation(async (name: string) => ({ data: name === "admit_preview_discovery" ? null : true }));
  expect((await POST(request(), params)).status).toBe(429); expect(m.discover).not.toHaveBeenCalled();
});
it("rejects revisions changed during the search and finalizes failed discovery", async () => {
  m.maybeSingle.mockResolvedValueOnce({ data: row }).mockResolvedValueOnce({ data: { revision: 4 } });
  expect((await POST(request(), params)).status).toBe(409);
  expect(m.rpc).toHaveBeenCalledWith("finalize_preview_discovery", { p_request_id: "ticket", p_succeeded: false });
  m.discover.mockRejectedValue(new Error("private provider response"));
  const response = await POST(request(), params); expect(response.status).toBe(503); expect(await response.text()).not.toContain("private provider");
});
it("persists a usable snapshot but never writes unavailable or empty partial searches", async () => {
  expect((await POST(request(), params)).status).toBe(200);
  expect(m.rpc).toHaveBeenCalledWith("save_preview_merchandise_search", expect.objectContaining({ p_preview_id: id, p_revision: 3 }));
  m.rpc.mockClear(); m.discover.mockResolvedValue({ items: [], status: "partial", candidates: 5, rejected: 5, errors: ["merchandise_metadata_unavailable"] });
  expect((await POST(request(), params)).status).toBe(503);
  expect(m.rpc).not.toHaveBeenCalledWith("save_preview_merchandise_search", expect.anything());
});
it("reports persistence failure and version conflicts without claiming results were saved", async () => {
  m.rpc.mockImplementation(async name => name === "save_preview_merchandise_search" ? { error: { code: "PT409" } } : { data: true });
  expect((await POST(request(), params)).status).toBe(409);
  m.rpc.mockImplementation(async name => name === "save_preview_merchandise_search" ? { error: { code: "42501", message: "private detail" } } : { data: true });
  const response = await POST(request(), params); expect(response.status).toBe(503); expect(await response.text()).not.toContain("private detail");
});
it("authorizes dismissals and accepts only revision, queue version and listing URL", async () => {
  m.auth.mockResolvedValue({ data: { user: null } }); expect((await PATCH(request({ revision: 3, version: 1, url: "https://shop.example.com/products/card" }), params)).status).toBe(401);
  m.auth.mockResolvedValue({ data: { user: { id: "admin" } } });
  expect((await PATCH(request({ revision: 3, version: 1, url: "javascript:alert(1)" }), params)).status).toBe(400);
  expect((await PATCH(request({ revision: 3, version: 1, url: "https://shop.example.com/products/card", merchandise: [] }), params)).status).toBe(400);
  m.rpc.mockImplementation(async name => name === "dismiss_preview_merchandise_result" ? { error: { code: "PT409" } } : { data: true });
  expect((await PATCH(request({ revision: 3, version: 1, url: "https://shop.example.com/products/card" }), params)).status).toBe(409);
  expect(m.discover).not.toHaveBeenCalled();
});
it("reports full queues without claiming a save or exposing database details", async () => {
  m.rpc.mockImplementation(async name => name === "save_preview_merchandise_search" || name === "dismiss_preview_merchandise_result" ? { error: { code: "PT422", message: "private detail" } } : { data: true });
  const response = await POST(request(), params);
  expect(response.status).toBe(422); expect(await response.json()).toEqual({ error: "merchandise_review_full" });
  expect(m.rpc).toHaveBeenCalledWith("finalize_preview_discovery", { p_request_id: true, p_succeeded: false });
  expect((await PATCH(request({ revision: 3, version: 1, url: "https://shop.example.com/card" }), params)).status).toBe(422);
});
it("validates the complete bulk dismissal and delegates one atomic RPC", async () => {
  const urls=["https://shop.example.com/card","https://shop.example.com/jersey"];
  for(const bad of [[],[urls[0],urls[0]],Array(201).fill(urls[0]),["javascript:alert(1)"]])expect((await PATCH(request({revision:3,version:1,urls:bad}),params)).status).toBe(400);
  expect((await PATCH(request({revision:3,version:1,url:urls[0],urls}),params)).status).toBe(400);
  m.rpc.mockImplementation(async name=>name==="dismiss_preview_merchandise_results"?{data:{result:{items:[],status:"complete",candidates:0,rejected:0,errors:[]},version:2,searched_at:"2026-10-17T00:00:00Z",identity_key:"a".repeat(64),dismissed_urls:urls}}:{data:true});
  expect((await PATCH(request({revision:3,version:1,urls}),params)).status).toBe(200);
  expect(m.rpc).toHaveBeenCalledWith("dismiss_preview_merchandise_results",{p_preview_id:id,p_revision:3,p_version:1,p_urls:urls});
  expect(m.discover).not.toHaveBeenCalled();
  m.rpc.mockImplementation(async name=>name==="dismiss_preview_merchandise_results"?{error:{code:"PT409"}}:{data:true});
  expect((await PATCH(request({revision:3,version:1,urls}),params)).status).toBe(409);
});

it("restores only a single saved listing using server-derived identity",async()=>{
 m.rpc.mockImplementation(async(name:string)=>({data:name==="restore_preview_merchandise_result"?{result:{items:[],status:"complete",candidates:0,rejected:0,errors:[]},version:2,searched_at:"2026-10-17T00:00:00Z",identity_key:"a".repeat(64),dismissed_urls:[]}:true}));
 expect((await PATCH(request({revision:3,version:1,action:"restore",url:"https://shop.example.com/card"}),params)).status).toBe(200);
 expect(m.rpc).toHaveBeenCalledWith("restore_preview_merchandise_result",{p_preview_id:id,p_revision:3,p_version:1,p_identity_key:"identity",p_url:"https://shop.example.com/card"});
 expect(m.discover).not.toHaveBeenCalled();
});
