// @vitest-environment node
import { expect, it, vi } from "vitest";
import { articleRelevance, discoverNews, type ArticleMetadata } from "@/lib/enrichment/news";
import { catalogImage, type CatalogAward } from "@/lib/enrichment/awards";
import { SUPER_BOWL_REFERENCE } from "@/lib/enrichment/award-reference-images";
import { isNewsArticleUrl } from "@/lib/enrichment/news-classification";

const identity = { fullName: "Roland Williams", sport: "football", teams: ["Los Angeles Rams"], schools: ["Syracuse"] };
const article: ArticleMetadata = { headline: "Roland Williams: former Rams Super Bowl champion", summary: "The tight end reflects on his career.", article_url: "https://www.therams.com/news/roland", canonical_url: "https://www.therams.com/news/roland", publisher: "Rams", source_domain: "therams.com", author: null, published_at: null, thumbnail_url: null, metadata: { extraction: "OpenGraph" } };
it("matches Rams football coverage across historical city names without accepting non-sports namesakes", () => {
  expect(articleRelevance(article, identity)).toBeGreaterThanOrEqual(0.8);
  expect(articleRelevance({ ...article, headline: "Roland Williams watches the Rams", summary: "An actor's evening." }, identity)).toBeLessThan(0.8);
});
it("excludes statistics and encyclopedia results before fetching publisher metadata", async () => {
  const extract = vi.fn(async () => article);
  const result = await discoverNews(identity, { name: "fixture", search: async () => [{ url: "https://www.espn.com/nfl/player/stats/_/id/123/roland" }, { url: "https://alchetron.com/Roland-Williams" }, { url: article.article_url }] }, extract, AbortSignal.timeout(1000));
  expect(extract).toHaveBeenCalledOnce(); expect(result.articles).toHaveLength(1);
});
it("uses a licensed Super Bowl illustration only for an active, empty placeholder", () => {
  const award = { id: "fixture", slug: "super-bowl-champion", active: true, asset_status: "placeholder", canonical_image_url: null } as CatalogAward;
  expect(catalogImage(award)).toBe(SUPER_BOWL_REFERENCE.canonical_image_url);
  expect(catalogImage({ ...award, active: false })).toBeNull();
  expect(catalogImage({ ...award, slug: "lombardi-award" })).toBeNull();
});
it.each(["https://www.gettyimages.com/photos/keith-rivers", "https://247sports.com/player/keith-rivers-25826/college-41865", "https://www.facebook.com/PFRPA/posts/123"])("keeps non-editorial reference %s out of news cards", url => {
  expect(isNewsArticleUrl(url)).toBe(false);
  expect(isNewsArticleUrl("https://www.therams.com/news/roland-williams")).toBe(true);
});
