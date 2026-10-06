// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
const mocks = vi.hoisted(() => ({ discover: vi.fn(), provider: vi.fn() }));
vi.mock("@/lib/enrichment/news", async original => ({ ...await original<typeof import("@/lib/enrichment/news")>(), discoverNews: mocks.discover }));
vi.mock("@/lib/enrichment/search-provider", () => ({ configuredSearchProvider: mocks.provider }));
import { enrichSavedPreview, previewIdentityKey, readPreviewEnrichment } from "@/lib/preview-lockers/enrichment";
import { previewContent } from "@/lib/preview-lockers/validation";
const content = previewContent.parse({ slug: "fixture-athlete", full_name: "Fixture Athlete", school: "Cal", awards: [{ label: "Unmapped honor", year: "2001" }] });
const news = { articles: [], candidates: 2, rejected: 2, duplicates: 0, errors: [], status: "complete" };
function client() {
  const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(), order: vi.fn(), limit: vi.fn() };
  query.select.mockReturnValue(query); query.eq.mockReturnValue(query); query.order.mockReturnValue(query);
  query.maybeSingle.mockResolvedValue({ data: { identity_key: previewIdentityKey(content) } });
  query.limit.mockResolvedValue({ data: [] });
  const rpc = vi.fn(async (name: string, args?: Record<string, unknown>) => name === "save_preview_enrichment"
    ? { data: { ...(args?.p_report as object), last_news_success: { articles_accepted: 3 } }, error: null }
    : { data: "admission", error: null });
  const db = { from: vi.fn(() => query), rpc };
  return { db: db as unknown as SupabaseClient, rpc, query };
}
beforeEach(() => { vi.clearAllMocks(); mocks.provider.mockReturnValue({ name: "fixture" }); mocks.discover.mockResolvedValue(news); });
it("does not spend the discovery budget when enrichment storage is unavailable", async () => {
  const { db, rpc, query } = client();
  query.maybeSingle.mockResolvedValue({ data: null, error: { code: "PGRST205" } });
  const report = await enrichSavedPreview(db, "preview", content, 2);
  expect(report).toMatchObject({ status: "unavailable", errors: ["enrichment_unavailable", "enrichment_not_saved"] });
  expect(mocks.provider).not.toHaveBeenCalled();
  expect(mocks.discover).not.toHaveBeenCalled();
  expect(rpc).not.toHaveBeenCalled();
  expect(db.from).toHaveBeenCalledTimes(1);
});
it.each(["unavailable", "skipped", "throw"])("preserves articles for %s discovery", async status => {
  const { db, rpc } = client();
  if (status === "throw") mocks.discover.mockRejectedValue(new Error("upstream"));
  else mocks.discover.mockResolvedValue({ ...news, status: "unavailable", errors: ["search_failed"] });
  const report = await enrichSavedPreview(db, "preview", content, 2, status !== "skipped");
  expect(rpc).toHaveBeenCalledWith("save_preview_enrichment", expect.objectContaining({ p_articles: null }));
  expect(report.last_news_success?.articles_accepted).toBe(3);
  if (status === "skipped") expect(mocks.discover).not.toHaveBeenCalled();
});
it("passes successful empty discovery as an explicit replacement", async () => {
  const { db, rpc } = client();
  await enrichSavedPreview(db, "preview", content, 2);
  expect(rpc).toHaveBeenCalledWith("save_preview_enrichment", expect.objectContaining({ p_articles: [] }));
});
it("checks alternate discovery output before the persistence RPC", async () => {
  const { db, rpc } = client();
  mocks.discover.mockResolvedValue({ ...news, articles: [{
    article_url: "https://www.pro-football-reference.com/players/H/HughDa20.htm",
    canonical_url: "https://www.pro-football-reference.com/players/H/HughDa20.htm",
    thumbnail_url: null,
  }] });
  await expect(enrichSavedPreview(db, "preview", content, 2)).rejects.toThrow("source_policy_blocked");
  expect(rpc.mock.calls.some(([name]) => name === "save_preview_enrichment")).toBe(false);
});
it("reports HTTP conflicts as preview changes without pretending the attempt saved", async () => {
  const { db, rpc } = client();
  rpc.mockImplementation(async name => name === "save_preview_enrichment"
    ? { data: null, error: { code: "PT409" } } as never : { data: "admission", error: null });
  const report = await enrichSavedPreview(db, "preview", content, 2);
  expect(report.status).toBe("unavailable");
  expect(report.errors).toContain("preview_changed");
});
it("reads only current persisted evidence without discovery or writes", async () => {
  const { db, rpc, query } = client();
  const result = await readPreviewEnrichment(db, "preview", content, 2);
  expect(result.awards[0].evidenceStatus).toBe("unverified");
  expect(query.eq).toHaveBeenCalledWith("source_revision", 2);
  expect(query.eq).toHaveBeenCalledWith("status", "accepted");
  expect(mocks.provider).not.toHaveBeenCalled(); expect(mocks.discover).not.toHaveBeenCalled(); expect(rpc).not.toHaveBeenCalled();
});
it("keeps a selected preview image when a matched catalog award has no approved asset", async () => {
  const input = previewContent.parse({ slug: "fixture-athlete", full_name: "Fixture Athlete", awards: [{ label: "Fixture honor", year: "2001", imageUrl: "https://bltz.me/images/fixture.png" }] });
  const { db, query } = client();
  vi.spyOn(db, "from").mockImplementation((table: string) => table === "preview_award_links" ? { select: () => ({ eq: () => ({ eq: async () => ({ data: [{ raw_label: "Fixture honor", year: "2001", edition: "", source_url: null, award_catalog: { id: "fixture", slug: "fixture", name: "Fixture honor", aliases: [], active: true, asset_status: "placeholder", canonical_image_url: null } }] }) }) }) } as never : query as never);
  const result = await readPreviewEnrichment(db, "preview", input, 2);
  expect(result.awards[0]).toMatchObject({ imageUrl: "https://bltz.me/images/fixture.png", evidenceStatus: "unverified" });
});
it("uses persisted identity before display school aliases are applied", async () => {
  const { enrichPreviewSchoolBranding } = await import("@/lib/preview-lockers/school-branding");
  const raw = previewContent.parse({ slug: "roland-williams", full_name: "Roland Williams", position: "TE", school: "Syracuse", schools: [{ label: "Syracuse", color: "#152238", logo: null }], pro_teams: [{ label: "Los Angeles Rams", color: "#152238", logo: null }] });
  const directory = { from: () => ({ select: () => ({ limit: async () => ({ data: [{ location: "Syracuse", display_name: "Syracuse", abbreviation: "SYR", primary_color: "#ff8200", logo_url: null, logo_dark_url: null }], error: null }) }) }) } as unknown as SupabaseClient;
  const branded = await enrichPreviewSchoolBranding(directory, raw);
  expect(previewIdentityKey(branded)).not.toBe(previewIdentityKey(raw));
  const { db, query } = client();
  await readPreviewEnrichment(db, "preview", branded, 3, previewIdentityKey(raw));
  expect(query.eq).toHaveBeenCalledWith("identity_key", previewIdentityKey(raw));
  expect(query.eq).not.toHaveBeenCalledWith("identity_key", previewIdentityKey(branded));
});

it("bounds historical candidates to the saved preview identity and revision", async () => {
  const { readPreviewNewsCandidates } = await import("@/lib/preview-lockers/enrichment");
  const { db, query } = client();
  const inStatus = vi.fn().mockReturnValue(query);
  Object.assign(query, { in: inStatus });
  query.limit.mockResolvedValue({ data: [{ article_url: "https://sports.example.com/old" }, { article_url: "https://sports.example.com/old" }, { article_url: "https://en.wikipedia.org/wiki/Fixture" }] });
  expect(await readPreviewNewsCandidates(db, "preview", content, 2)).toEqual(["https://sports.example.com/old"]);
  expect(query.eq).toHaveBeenCalledWith("preview_id", "preview");
  expect(query.eq).toHaveBeenCalledWith("source_revision", 2);
  expect(query.eq).toHaveBeenCalledWith("identity_key", previewIdentityKey(content));
  expect(inStatus).toHaveBeenCalledWith("status", ["accepted", "inactive"]);
  expect(query.limit).toHaveBeenCalledWith(24);
});
