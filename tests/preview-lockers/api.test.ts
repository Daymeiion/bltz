// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn(), from: vi.fn(), insert: vi.fn(), update: vi.fn(), eq: vi.fn(), select: vi.fn(), single: vi.fn(), maybeSingle: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mock.auth }, rpc: mock.rpc, from: mock.from }) }));
import { POST } from "@/app/api/preview-lockers/route";
import { PATCH } from "@/app/api/preview-lockers/[id]/route";
import { previewContent } from "@/lib/preview-lockers/validation";
const id = "00000000-0000-4000-8000-000000000001"; const content = previewContent.parse({ slug: "synthetic-preview", full_name: "Synthetic Preview" });
const request = (body: unknown, method = "POST") => new Request("http://localhost/api/preview-lockers", { method, headers: { origin: "http://localhost", "content-type": "application/json" }, body: JSON.stringify(body) });
beforeEach(() => { vi.resetAllMocks(); mock.auth.mockResolvedValue({ data: { user: { id: "admin" } } }); mock.rpc.mockResolvedValue({ data: true }); for (const key of ["from","insert","update","eq","select"] as const) mock[key].mockReturnValue(mock); });
it("denies unauthenticated and non-admin mutations before table access", async () => {
  mock.auth.mockResolvedValue({ data: { user: null } }); expect((await POST(request({id,content}))).status).toBe(401);
  mock.auth.mockResolvedValue({ data: { user: { id: "ordinary" } } }); mock.rpc.mockResolvedValue({ data: false }); expect((await PATCH(request({revision:1,content},"PATCH"),{params:Promise.resolve({id})})).status).toBe(403); expect(mock.from).not.toHaveBeenCalled();
});
it("rejects unknown nested input and never reports false persistence", async () => {
  expect((await POST(request({id,content:{...content,raw_sources:{}}}))).status).toBe(400); expect(mock.from).not.toHaveBeenCalled(); mock.single.mockResolvedValue({error:{code:"23514",message:"private database error"}}); const response = await POST(request({id,content})); expect(response.status).toBe(503); expect(await response.text()).not.toContain("private database error");
});
it("returns unchanged idempotent create and rejects later-version retries", async () => {
  mock.single.mockResolvedValue({error:{code:"23505"}}); mock.maybeSingle.mockResolvedValue({data:{...content,id,revision:1,created_at:"",updated_at:""}}); expect((await POST(request({id,content}))).status).toBe(200);
  mock.maybeSingle.mockResolvedValue({data:{...content,id,revision:2,created_at:"",updated_at:""}}); expect((await POST(request({id,content}))).status).toBe(409);
});
it("uses revision compare-and-set and returns conflict rather than overwriting", async () => {
  mock.maybeSingle.mockResolvedValue({data:null,error:null}); expect((await PATCH(request({revision:7,content},"PATCH"),{params:Promise.resolve({id})})).status).toBe(409); expect(mock.eq).toHaveBeenCalledWith("revision",7);
});
