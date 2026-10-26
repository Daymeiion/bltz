import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import PreviewLockerForm from "@/app/admin/preview-lockers/PreviewLockerForm";
import { previewContent } from "@/lib/preview-lockers/validation";
const id = "00000000-0000-4000-8000-000000000001";
const path = `${id}/photos/00000000-0000-4000-8000-000000000002.png`;
const season = { year: 2008, team: "CIN", gamesPlayed: 7, gamesStarted: 7, statistics: { tackles: 37 } };
const record = { ...previewContent.parse({ slug: "fixture-player", full_name: "Fixture Player", school: "Cal", story: "My authored story", bio: "My reviewed bio", headshot_storage_path: path, bio_headshot_storage_path: path,
  pfr_stats: [{ category: "defense", sourceUrl: "https://www.pro-football-reference.com/players/R/RiveKe99.htm", importedAt: "2026-10-18T00:00:00Z", seasons: [season] }],
  cfb_stats: [{ category: "defense", sourceUrl: "https://www.sports-reference.com/cfb/players/fixture-player-1.html", importedAt: "2026-10-18T00:00:00Z", seasons: [{ ...season, year: 2007, team: "Cal" }] }],
  videos: [{ id: "uploaded-video", title: "My uploaded video", storagePath: `${id}/videos/00000000-0000-4000-8000-000000000003.mp4`, mimeType: "video/mp4" }],
  photos: [{ id: "photo", title: "My photo", storagePath: path, mimeType: "image/png", level: "cfb" }],
  schools: [{ label: "Cal", color: "#003262", mobileName: "CAL", desktopName: "California", logoStoragePath: path }],
  article_edits: [{ id: "article", headline: "My edited article", publisher: "Press", articleUrl: "https://press.example.com/existing", visible: false, imageStoragePath: path }],
  merchandise: [{ id: "product", title: "My product", category: "jersey", productUrl: "https://shop.example.com/existing", imageStoragePath: path }],
  combine_results: [{ id: "manual-combine", eventType: "combine", year: 2008, sourceUrl: "https://en.wikipedia.org/wiki/Fixture_Player", measurements: [{ metric: "bench", value: 0 }] }],
}), id, revision: 3, created_at: "", updated_at: "" };
const article = { headline: "Fixture Player Cal career", article_url: "https://press.example.com/new", canonical_url: "https://press.example.com/new", publisher: "Press", source_domain: "press.example.com", author: null, published_at: null, thumbnail_url: null, summary: "Cal football career", metadata: { extraction: "NewsArticle" }, discovery_source: "fixture", discovered_at: "2026-10-26", confidence: .95, relevance_score: .95, featured: false, status: "accepted" };
const product = { title: "Fixture Player Cal jersey", category: "jersey", productUrl: "https://shop.example.com/new", canonicalUrl: "https://shop.example.com/new", description: "Cal football", retailer: "Shop", imageUrl: null, priceLabel: null, availability: "unknown", evidence: "seller_metadata", matchedAffiliations: ["Cal"] };
let host: HTMLDivElement, root: Root, fetcher: ReturnType<typeof vi.fn>;
beforeEach(() => { vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); host = document.createElement("div"); document.body.append(host); root = createRoot(host); fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
const button = (name: string) => [...host.querySelectorAll<HTMLButtonElement>("button")].find(node => node.textContent === name)!;
async function click(name: string) { expect(button(name), name).toBeTruthy(); await act(async () => button(name).click()); }
it("uses one click to save an additive snapshot, populates reviews, and keeps imported stats and image overrides unchanged", async () => {
  await act(async () => root.render(<PreviewLockerForm record={record} />));
  const suggestion = previewContent.parse({ slug: record.slug, full_name: record.full_name, bio: "Replacement", videos: [{ id: "new", title: "New video", url: "https://youtu.be/abcDEF12345" }] });
  fetcher.mockResolvedValueOnce(new Response(`event: done\ndata: ${JSON.stringify({ status: "complete", draft: suggestion })}\n\n`))
    .mockResolvedValueOnce(Response.json({ id, slug: record.slug, revision: 4 }))
    .mockResolvedValueOnce(Response.json({ revision: 4, tasks: {
      news: { status: 200, awards: null, newsStatus: "complete", errors: [], articles: [], review: { articles: [article], version: 1, searched_at: null, identity_key: "a".repeat(64) } },
      merchandise: { status: 200, review: { result: { items: [product], status: "complete", candidates: 1, rejected: 0, errors: [] }, searched_at: "2026-10-26T12:00:00Z", version: 1, identity_key: "a".repeat(64), dismissed_urls: [] } },
      combine: { status: 200, result: { status: "complete", sources: [], suggestions: [{ id: "source", sourceLabel: "Wikipedia", event: { ...record.combine_results[0], id: "source-event", measurements: [{ metric: "bench", value: 22, sourceUrl: null }, { metric: "forty", value: 4.5, sourceUrl: null }] } }] } },
    } }));
  await click("Build & search all"); expect(fetcher).toHaveBeenCalledTimes(3);
  expect(fetcher.mock.calls.map(call => call[1].method)).toEqual(["POST", "PATCH", "POST"]);
  const saved = JSON.parse(fetcher.mock.calls[1][1].body);
  expect(saved).toMatchObject({ revision: 3, deferEnrichment: true });
  for (const key of ["pfr_stats", "cfb_stats", "combine_results", "article_edits", "merchandise", "photos", "schools", "headshot_storage_path", "bio_headshot_storage_path", "bio", "story"] as const) expect(saved.content[key]).toEqual(record[key]);
  expect(saved.content.videos[0]).toEqual(record.videos[0]); expect(saved.content.videos).toHaveLength(2);
  expect(host.textContent).toContain("1 saved news suggestions"); expect(host.textContent).toContain("1 saved merchandise suggestions");
  expect(host.querySelector<HTMLInputElement>('input[aria-label^="I reviewed this article"]')!.disabled).toBe(false);
  const measurements = [...host.querySelectorAll<HTMLInputElement>('input[aria-label^="Review "]')];
  expect(measurements).toHaveLength(2); expect(measurements.filter(input => input.disabled)).toHaveLength(1);
  await act(async () => measurements.find(input => !input.disabled)!.click()); await click("Add selected measurements to draft");
  fetcher.mockResolvedValueOnce(Response.json({ id, slug: record.slug, revision: 5 })); await click("Save draft");
  const approved = JSON.parse(fetcher.mock.calls[3][1].body);
  expect(approved.revision).toBe(4); expect(approved.content.combine_results[0].measurements).toEqual([{ metric: "bench", value: 0, sourceUrl: null }, { metric: "forty", value: 4.5, sourceUrl: "https://en.wikipedia.org/wiki/Fixture_Player" }]);
  expect(approved.content.pfr_stats).toEqual(record.pfr_stats); expect(approved.content.cfb_stats).toEqual(record.cfb_stats);
  expect(approved.content.article_edits).toEqual(record.article_edits); expect(approved.content.merchandise).toEqual(record.merchandise);
});
