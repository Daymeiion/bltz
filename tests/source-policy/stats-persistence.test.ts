// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { previewContent } from "@/lib/preview-lockers/validation";
import { inspectCsv, reviewCsv } from "@/lib/preview-lockers/cfb-csv";
import { canSaveStatsImports } from "@/lib/source-policy/preview-stats";
const mocks = vi.hoisted(() => ({ admin: vi.fn(), update: vi.fn(), insert: vi.fn() }));
vi.mock("@/lib/preview-lockers/server", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/preview-lockers/server")>(), previewAdmin: mocks.admin }));
vi.mock("@/lib/preview-lockers/enrichment", () => ({ tryEnrichSavedPreview: async () => ({ status: "complete" }) }));
import { POST } from "@/app/api/preview-lockers/route";
import { PATCH } from "@/app/api/preview-lockers/[id]/route";
const id = "00000000-0000-4000-8000-000000000001";
const url = "https://www.sports-reference.com/cfb/players/fixture-1.html";
const legacy = { category: "defense" as const, sourceUrl: url, importedAt: "2026-09-01T00:00:00.000Z", seasons: [{ year: 2007, team: "Cal", gamesPlayed: 12, gamesStarted: null, statistics: { sacks: 2.5 } }] };
const content = previewContent.parse({ slug: "fixture-athlete", full_name: "Fixture Athlete", cfb_stats: [legacy] });
function chain(data: unknown) { const q = { eq: vi.fn(), select: vi.fn(), maybeSingle: async () => ({ data }), single: async () => ({ data }) }; q.eq.mockReturnValue(q); q.select.mockReturnValue(q); return q; }
beforeEach(() => {
  vi.clearAllMocks();
  mocks.update.mockReturnValue(chain({ id, slug: content.slug, revision: 2 }));
  mocks.insert.mockReturnValue(chain({ id, slug: content.slug, revision: 1 }));
  mocks.admin.mockResolvedValue({ client: { from: (table: string) => table === "preview_lockers"
    ? { select: () => chain({ cfb_stats: [legacy], revision: 1 }), update: mocks.update, insert: mocks.insert }
    : { select: () => chain(null) } } });
});
const request = (method: string, body: unknown) => new Request("https://bltz.example.com/api/preview-lockers", { method, headers: { origin: "https://bltz.example.com", "content-type": "application/json" }, body: JSON.stringify(body) });
it("does not import a reference-only CSV during review", () => {
  const table = inspectCsv("Year,School,G,Sk\n2007,Cal,12,2.5", "defense");
  expect(() => reviewCsv(table, table.mapping, "defense", url)).toThrow("source_policy_blocked");
  expect(() => reviewCsv(table, table.mapping, "defense", "https://unknown.example.com/player")).toThrow("source_policy_blocked");
});
it("rejects new reference-only tables before preview insertion, even through a handcrafted request", async () => {
  const response = await POST(request("POST", { id, content }));
  expect(response.status).toBe(400); expect(await response.json()).toEqual({ error: "source_policy_restricted" });
  expect(mocks.insert).not.toHaveBeenCalled();
});
it("preserves historical reference-only stats when editing the preview biography", async () => {
  const response = await PATCH(request("PATCH", { revision: 1, content: { ...content, bio: "Corrected biography" } }), { params: Promise.resolve({ id }) });
  expect(response.status).toBe(200); expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ cfb_stats: [legacy], bio: "Corrected biography" }));
});
it("rejects extending or changing a historical restricted table before update", async () => {
  const modified = { ...legacy, seasons: [{ ...legacy.seasons[0], statistics: { sacks: 99 } }] };
  const response = await PATCH(request("PATCH", { revision: 1, content: { ...content, cfb_stats: [modified] } }), { params: Promise.resolve({ id }) });
  expect(response.status).toBe(400); expect(mocks.update).not.toHaveBeenCalled();
});
it("permits an explicitly requested removal and sanctioned provider metadata without licensing by rate limit", () => {
  expect(canSaveStatsImports([], [legacy])).toBe(true);
  expect(canSaveStatsImports([legacy])).toBe(false);
  expect(canSaveStatsImports([{ ...legacy, sourceUrl: "https://api.collegefootballdata.com/stats/player/season" }])).toBe(true);
});
