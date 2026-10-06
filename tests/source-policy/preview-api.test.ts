// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn(), from: vi.fn(), insert: vi.fn(), update: vi.fn(), eq: vi.fn(), select: vi.fn(), single: vi.fn(), maybeSingle: vi.fn(), enrich: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mock.auth }, rpc: mock.rpc, from: mock.from }) }));
vi.mock("@/lib/preview-lockers/enrichment", () => ({ tryEnrichSavedPreview: mock.enrich }));
import { POST } from "@/app/api/preview-lockers/route";
import { PATCH } from "@/app/api/preview-lockers/[id]/route";
import { previewContent } from "@/lib/preview-lockers/validation";
const id = "00000000-0000-4000-8000-000000000001";
const content = previewContent.parse({ slug: "synthetic-preview", full_name: "Synthetic Preview", cfb_stats: [{
  category: "defense", sourceUrl: "https://www.sports-reference.com/cfb/players/fixture-player-1.html",
  importedAt: "2026-09-29T00:00:00.000Z", seasons: [{ year: 2007, team: "Fixture", gamesPlayed: 12, gamesStarted: null, statistics: { sacks: 2.5 } }],
}] });
const row = { ...content, id, revision: 7, created_at: "", updated_at: "" };
const request = (body: unknown, method = "POST") => new Request("http://localhost/api/preview-lockers", { method, headers: { origin: "http://localhost", "content-type": "application/json" }, body: JSON.stringify(body) });
const patch = (next = content, revision = 7) => PATCH(request({ revision, content: next }, "PATCH"), { params: Promise.resolve({ id }) });
beforeEach(() => {
  vi.resetAllMocks(); mock.auth.mockResolvedValue({ data: { user: { id: "admin" } } }); mock.rpc.mockResolvedValue({ data: true });
  for (const key of ["from", "insert", "update", "eq", "select"] as const) mock[key].mockReturnValue(mock);
  mock.maybeSingle.mockResolvedValue({ data: null, error: null });
});
it("blocks a new restricted CSV before insert, enrollment or enrichment", async () => {
  const response = await POST(request({ id, content }));
  expect(response.status).toBe(400); expect(await response.json()).toEqual({ error: "source_policy_blocked" });
  expect(mock.insert).not.toHaveBeenCalled(); expect(mock.enrich).not.toHaveBeenCalled();
  expect(mock.rpc).not.toHaveBeenCalledWith("preview_conversion_create", expect.anything());
});
it("allows an identical legacy create retry without writing or expanding old statistics", async () => {
  mock.maybeSingle.mockResolvedValue({ data: { ...row, revision: 1 }, error: null });
  const response = await POST(request({ id, content }));
  expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ id, revision: 1 });
  expect(mock.insert).not.toHaveBeenCalled(); expect(mock.enrich).not.toHaveBeenCalled();
});
it("rejects changed/later legacy create retries as conflicts", async () => {
  mock.maybeSingle.mockResolvedValue({ data: row, error: null });
  expect((await POST(request({ id, content }))).status).toBe(409);
  mock.maybeSingle.mockResolvedValue({ data: { ...row, revision: 1 }, error: null });
  expect((await POST(request({ id, content: { ...content, bio: "Changed" } }))).status).toBe(409);
  expect(mock.insert).not.toHaveBeenCalled();
});
it("retains unchanged legacy tables when other preview fields are edited", async () => {
  mock.maybeSingle.mockResolvedValueOnce({ data: row, error: null }).mockResolvedValueOnce({ data: { id, slug: row.slug, revision: 8 }, error: null });
  expect((await patch({ ...content, bio: "A permitted edit" })).status).toBe(200);
  expect(mock.update).toHaveBeenCalledWith({ ...content, bio: "A permitted edit" });
  expect(mock.eq).toHaveBeenCalledWith("revision", 7);
});
it("blocks changed restricted seasons before the update", async () => {
  mock.maybeSingle.mockResolvedValue({ data: row, error: null });
  const changed = structuredClone(content); changed.cfb_stats[0].seasons[0].statistics.sacks = 3;
  const response = await patch(changed);
  expect(response.status).toBe(400); expect(await response.json()).toEqual({ error: "source_policy_blocked" });
  expect(mock.update).not.toHaveBeenCalled(); expect(mock.enrich).not.toHaveBeenCalled();
});
it("allows removal and keeps revision compare-and-set", async () => {
  mock.maybeSingle.mockResolvedValueOnce({ data: { id, slug: row.slug, revision: 8 }, error: null });
  expect((await patch({ ...content, cfb_stats: [] })).status).toBe(200);
  expect(mock.update).toHaveBeenCalledWith({ ...content, cfb_stats: [] });
  expect(mock.eq).toHaveBeenCalledWith("revision", 7);
});
it("fails safely on stale revisions and unreadable stored records", async () => {
  mock.maybeSingle.mockResolvedValue({ data: row, error: null }); expect((await patch(content, 6)).status).toBe(409);
  mock.maybeSingle.mockResolvedValue({ data: null, error: { message: "private database details" } });
  const response = await patch(); expect(response.status).toBe(503); expect(await response.text()).not.toContain("private database details");
  expect(mock.update).not.toHaveBeenCalled();
});
it("does not grant manual CSV permission from an existing adapter's facts permission", async () => {
  const allowed = structuredClone(content); allowed.cfb_stats[0].sourceUrl = "https://en.wikipedia.org/wiki/Synthetic_Preview";
  expect((await POST(request({ id, content: allowed }))).status).toBe(400);
  expect(mock.insert).not.toHaveBeenCalled(); expect(mock.from).not.toHaveBeenCalled();
});
