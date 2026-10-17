// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(), discover: vi.fn(), provider: vi.fn(), identity: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: m.auth }, rpc: m.rpc, from: m.from }) }));
vi.mock("@/lib/preview-lockers/enrichment", () => ({ previewIdentityKey: () => "identity", previewNewsIdentity: (value: unknown) => value, withSchoolAliases: m.identity }));
vi.mock("@/lib/enrichment/search-provider", () => ({ configuredSearchProvider: m.provider }));
vi.mock("@/lib/enrichment/merchandise", async original => ({ ...await original<object>(), discoverMerchandise: m.discover }));
import { POST } from "@/app/api/preview-lockers/[id]/merchandise/route";
import { previewContent } from "@/lib/preview-lockers/validation";
const id = "00000000-0000-4000-8000-000000000001";
const row = { ...previewContent.parse({ slug: "fixture-player", full_name: "Fixture Player", school: "Arizona" }), id, revision: 3, created_at: "", updated_at: "" };
const request = (body: unknown = { revision: 3 }, origin = "http://localhost") => new Request("http://localhost/api/preview-lockers/id/merchandise", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });
const params = { params: Promise.resolve({ id }) };
beforeEach(() => {
  vi.resetAllMocks(); m.auth.mockResolvedValue({ data: { user: { id: "admin" } } });
  m.rpc.mockImplementation(async (name: string) => ({ data: name === "admit_preview_discovery" ? "ticket" : true }));
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
