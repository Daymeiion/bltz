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
