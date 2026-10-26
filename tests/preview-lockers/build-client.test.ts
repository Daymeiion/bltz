import { afterEach, expect, it, vi } from "vitest";
import { runPreviewBuild, type BuildProgress, type BuildStep } from "@/lib/preview-lockers/build-client";
import { previewContent } from "@/lib/preview-lockers/validation";
import { newsReviewArticleSchema } from "@/lib/preview-lockers/news-review";
const id = "00000000-0000-4000-8000-000000000001";
const season = { year: 2008, team: "CIN", gamesPlayed: 7, gamesStarted: 7, statistics: { tackles: 37 } };
const draft = previewContent.parse({ slug: "fixture-player", full_name: "Fixture Player", school: "Cal", story: "Authored story", videos: [{ id: "video", title: "My video", url: "https://youtu.be/abcDEF12345" }], combine_results: [{ id: "manual", eventType: "combine", year: 2008, sourceUrl: "https://en.wikipedia.org/wiki/Fixture_Player", measurements: [{ metric: "bench", value: 0 }] }],
  pfr_stats: [{ category: "defense", sourceUrl: "https://www.pro-football-reference.com/players/R/RiveKe99.htm", importedAt: "2026-10-18T00:00:00Z", seasons: [season] }],
  cfb_stats: [{ category: "defense", sourceUrl: "https://www.sports-reference.com/cfb/players/fixture-player-1.html", importedAt: "2026-10-18T00:00:00Z", seasons: [{ ...season, year: 2007, team: "Cal" }] }],
});
const source = previewContent.parse({ slug: "different-slug", full_name: "Fixture Player", school: "Another College", story: "Do not overwrite", videos: [{ id: "video", title: "New video", url: "https://youtu.be/xyzDEF12345" }] });
const saved = { id, slug: draft.slug, revision: 4 };
const review = { articles: [], version: 1, searched_at: null, identity_key: "a".repeat(64) };
const news = { status: 200, awards: null, newsStatus: "complete", errors: [], articles: [], review };
const merchandise = { status: 200, review: { version: 1, searched_at: "2026-10-26T12:00:00Z", identity_key: "a".repeat(64), result: { items: [], status: "complete", candidates: 0, rejected: 0, errors: [] }, dismissed_urls: [] } };
const combine = { status: 200, result: { suggestions: [], sources: [], status: "complete" } };
const discovery = () => new Response(`event: done\ndata: ${JSON.stringify({ status: "complete", draft: source })}\n\n`);
const legacyArticle = newsReviewArticleSchema.parse({ headline: "Fixture Player Cal career", article_url: "https://press.example.com/legacy", canonical_url: "https://press.example.com/legacy", publisher: "Press", source_domain: "press.example.com", author: null, published_at: null, thumbnail_url: null, summary: "Football career", metadata: { extraction: "NewsArticle" }, discovery_source: "fixture", discovered_at: "2026-10-26", confidence: .95, relevance_score: .95, featured: false });
function options() {
  return { draft, saved: null as typeof saved | null, createId: id, signal: new AbortController().signal, onStep: vi.fn<(key: BuildStep, progress: BuildProgress) => void>(), onDraft: vi.fn(), onSaved: vi.fn(), onNews: vi.fn(), onMerchandise: vi.fn(), onCombine: vi.fn(), onConflict: vi.fn() };
}
afterEach(() => vi.unstubAllGlobals());
it("discovers once, preserves existing content, saves once with deferred enrichment, then applies review-only outcomes", async () => {
  const input = options();
  const fetcher = vi.fn().mockResolvedValueOnce(discovery()).mockResolvedValueOnce(Response.json(saved)).mockResolvedValueOnce(Response.json({ revision: 4, tasks: { news, merchandise, combine } }));
  vi.stubGlobal("fetch", fetcher);
  await runPreviewBuild(input);
  expect(fetcher).toHaveBeenCalledTimes(3);
  const body = JSON.parse(fetcher.mock.calls[1][1].body);
  expect(body).toMatchObject({ id, deferEnrichment: true, content: { school: "Cal", story: "Authored story", combine_results: draft.combine_results } });
  expect(body.content.videos).toHaveLength(2); expect(body.content.videos[0]).toEqual(draft.videos[0]);
  expect(body.content.article_edits).toEqual(draft.article_edits); expect(body.content.merchandise).toEqual(draft.merchandise);
  expect(body.content.pfr_stats).toEqual(draft.pfr_stats); expect(body.content.cfb_stats).toEqual(draft.cfb_stats);
  expect(body.enrollment).toBeUndefined(); expect(body.content.slug).toBe(draft.slug);
  expect(input.onSaved).toHaveBeenCalledWith(body.content, saved);
  expect(JSON.parse(fetcher.mock.calls[2][1].body)).toEqual({ revision: 4, tasks: ["news", "merchandise", "combine"] });
  expect(input.onCombine).toHaveBeenCalledOnce(); expect(input.onNews).toHaveBeenCalledOnce(); expect(input.onMerchandise).toHaveBeenCalledOnce();
});
it("retries only selected failed work with no discovery or save and keeps successful callbacks separate", async () => {
  const input = { ...options(), saved, retry: ["merchandise"] as ["merchandise"] };
  const fetcher = vi.fn().mockResolvedValue(Response.json({ revision: 4, tasks: { merchandise } })); vi.stubGlobal("fetch", fetcher);
  await runPreviewBuild(input);
  expect(fetcher).toHaveBeenCalledTimes(1); expect(input.onSaved).not.toHaveBeenCalled(); expect(input.onNews).not.toHaveBeenCalled(); expect(input.onCombine).not.toHaveBeenCalled();
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ revision: 4, tasks: ["merchandise"] });
});
it("keeps one task failure independent, rejects malformed suggestions and never applies a stale revision", async () => {
  const input = { ...options(), saved, retry: ["news", "merchandise", "combine"] as ("news" | "merchandise" | "combine")[] };
  const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ revision: 4, tasks: { news, merchandise: { status: 429, error: "merchandise_rate_limited" }, combine: { status: 200, result: { ...combine.result, suggestions: [{ url: "javascript:alert(1)" }] } } } })).mockResolvedValueOnce(Response.json({ revision: 5, tasks: { news, merchandise, combine } }));
  vi.stubGlobal("fetch", fetcher); await runPreviewBuild(input);
  expect(input.onNews).toHaveBeenCalledOnce(); expect(input.onMerchandise).not.toHaveBeenCalled(); expect(input.onCombine).not.toHaveBeenCalled();
  expect(input.onStep).toHaveBeenCalledWith("merchandise", expect.objectContaining({ state: "failed", message: expect.stringContaining("three-minute") }));
  input.onNews.mockClear(); await runPreviewBuild(input); expect(input.onNews).not.toHaveBeenCalled(); expect(input.onConflict).toHaveBeenCalledOnce();
});
it("does not start searches after a save conflict and retains the merged draft for correction", async () => {
  const input = { ...options(), saved: { ...saved, revision: 3 } };
  const fetcher = vi.fn().mockResolvedValueOnce(discovery()).mockResolvedValueOnce(Response.json({ error: "preview_conflict" }, { status: 409 })); vi.stubGlobal("fetch", fetcher);
  await expect(runPreviewBuild(input)).rejects.toThrow("saved Locker changed");
  expect(fetcher).toHaveBeenCalledTimes(2); expect(input.onDraft).toHaveBeenCalledOnce(); expect(input.onSaved).not.toHaveBeenCalled(); expect(input.onConflict).toHaveBeenCalledOnce();
});
it("retains the save acknowledgement when cancelled during saving and admits no secondary work", async () => {
  const controller = new AbortController(), input = { ...options(), signal: controller.signal };
  let finish!: (value: Response) => void;
  const fetcher = vi.fn().mockResolvedValueOnce(discovery()).mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; })); vi.stubGlobal("fetch", fetcher);
  const running = runPreviewBuild(input); const assertion = expect(running).rejects.toThrow();
  await vi.waitFor(() => expect(finish).toBeDefined()); controller.abort(); finish(Response.json(saved)); await assertion;
  expect(input.onSaved).toHaveBeenCalledOnce(); expect(fetcher).toHaveBeenCalledTimes(2); expect(fetcher.mock.calls[1][1].signal).toBeUndefined();
});
it("retains legacy published articles through a deferred save without replacing hidden or edited article choices", async () => {
  const edited = previewContent.shape.article_edits.parse([{ id: "edited", sourceUrl: legacyArticle.article_url, articleUrl: legacyArticle.article_url, headline: "My edited headline", publisher: "Press", visible: false }]);
  const input = { ...options(), draft: { ...draft, article_edits: edited }, existingArticles: [legacyArticle, { ...legacyArticle, article_url: "https://press.example.com/another", canonical_url: "https://press.example.com/another", headline: "Another published story" }] };
  const fetcher = vi.fn().mockResolvedValueOnce(discovery()).mockResolvedValueOnce(Response.json(saved)).mockResolvedValueOnce(Response.json({ revision: 4, tasks: { news: { status: 503 }, merchandise: { status: 503 }, combine: { status: 503 } } }));
  vi.stubGlobal("fetch", fetcher); await runPreviewBuild(input);
  const content = JSON.parse(fetcher.mock.calls[1][1].body).content;
  expect(content.article_edits).toHaveLength(2); expect(content.article_edits[0]).toEqual(edited[0]); expect(content.article_edits[1]).toMatchObject({ headline: "Another published story", sourceUrl: "https://press.example.com/another", visible: true });
});
it("stops before discovery if retaining published articles would exceed draft capacity", async () => {
  const edits = previewContent.shape.article_edits.parse(Array.from({ length: 40 }, (_, i) => ({ id: `edit-${i}`, articleUrl: `https://press.example.com/${i}`, headline: `Reviewed ${i}`, publisher: "Press" })));
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  await expect(runPreviewBuild({ ...options(), draft: { ...draft, article_edits: edits }, existingArticles: [legacyArticle] })).rejects.toThrow("nothing has been changed"); expect(fetcher).not.toHaveBeenCalled();
});
