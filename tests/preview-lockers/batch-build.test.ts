import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { buildSavedPreview, parseBatchLines } from "@/lib/preview-lockers/batch";
import { readNeedsReview } from "@/lib/preview-lockers/review-status";
import { previewContent } from "@/lib/preview-lockers/validation";

const id = "00000000-0000-4000-8000-000000000001";
const content = previewContent.parse({ slug: "fixture-player", full_name: "Fixture Player", school: "Cal", bio: "Kept bio." });
const enrichment = { status: "complete", news_status: "complete", awards_discovered: 0, awards_normalized: 0, unmapped_awards: [], article_candidates: 3, articles_accepted: 3, articles_rejected: 0, article_duplicates: 0, errors: [], updated_at: "", last_awards_attempt: { status: "complete", awards_discovered: 0, awards_normalized: 0, unmapped_awards: [], errors: [], updated_at: "", source_revision: 2 } };
const stream = () => new Response(`event: done\ndata: ${JSON.stringify({ status: "complete", draft: { ...content, bio: "Scraped bio.", position: "CB" } })}\n\n`);
let fetcher: ReturnType<typeof vi.fn>;
beforeEach(() => { fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher); });
afterEach(() => vi.unstubAllGlobals());
const calls = () => fetcher.mock.calls.map(([url, init]) => `${init?.method ?? "GET"} ${url}`);

it("parses one player per line with an optional college, dropping blanks and repeats", () => {
  expect(parseBatchLines("Antoine Cason\n\n  DJ  Moore , Maryland \nantoine cason\nX\nDJ Moore")).toEqual([
    { name: "Antoine Cason", college: null }, { name: "DJ Moore", college: "Maryland" }, { name: "DJ Moore", college: null },
  ]);
});

it("runs career search, one save that searches news, then merchandise, all on the saved revision", async () => {
  fetcher.mockResolvedValueOnce(stream())
    .mockResolvedValueOnce(Response.json({ id, slug: "fixture-player", revision: 2, enrichment }))
    .mockResolvedValueOnce(Response.json({ revision: 2, review: { result: { items: [{}, {}] } } }));
  const result = await buildSavedPreview({ id, revision: 1, content }, new AbortController().signal, () => {});
  expect(calls()).toEqual(["POST /api/preview-lockers/discovery", `PATCH /api/preview-lockers/${id}`, `POST /api/preview-lockers/${id}/merchandise`]);
  const save = JSON.parse(fetcher.mock.calls[1][1].body);
  expect(save).toMatchObject({ revision: 1, refreshNews: true });
  expect(save.content.bio).toBe("Kept bio.");
  expect(save.content.position).toBe("CB");
  expect(JSON.parse(fetcher.mock.calls[2][1].body)).toEqual({ revision: 2 });
  expect(result).toMatchObject({ revision: 2, save: { ok: true }, news: { ok: true, detail: "3 articles found for review." }, merchandise: { ok: true, detail: "2 listings found for review." } });
});

it("does not save when the career search is refused", async () => {
  fetcher.mockResolvedValueOnce(new Response("", { status: 429 }));
  const result = await buildSavedPreview({ id, revision: 1, content }, new AbortController().signal, () => {});
  expect(calls()).toEqual(["POST /api/preview-lockers/discovery"]);
  expect(result.career.ok).toBe(false);
  expect(result.save.ok).toBe(false);
});

it("stops after a save conflict without searching merchandise", async () => {
  fetcher.mockResolvedValueOnce(stream()).mockResolvedValueOnce(Response.json({ error: "preview_conflict" }, { status: 409 }));
  const result = await buildSavedPreview({ id, revision: 1, content }, new AbortController().signal, () => {});
  expect(calls()).toHaveLength(2);
  expect(result.save.detail).toContain("saved this preview in the meantime");
});

it("flags cohort previews whose current revision is not marked complete", async () => {
  const links = [{ preview_locker_id: "a", completed_revision: null }, { preview_locker_id: "b", completed_revision: 4 }, { preview_locker_id: "c", completed_revision: 2 }];
  const client = { from: () => ({ select: () => ({ in: async () => ({ data: links, error: null }) }) }) };
  const rows = [{ id: "a", revision: 1 }, { id: "b", revision: 4 }, { id: "c", revision: 3 }, { id: "d", revision: 1 }];
  expect([...await readNeedsReview(client as never, rows)].sort()).toEqual(["a", "c"]);
  const broken = { from: () => ({ select: () => ({ in: async () => ({ data: null, error: { code: "42501" } }) }) }) };
  expect((await readNeedsReview(broken as never, rows)).size).toBe(0);
});
