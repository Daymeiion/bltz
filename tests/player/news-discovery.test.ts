// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { articleRelevance, discoverNews, identityQueries, type ArticleMetadata } from "@/lib/enrichment/news";
import { isNewsArticleUrl } from "@/lib/enrichment/news-classification";
import { SearchProviderError } from "@/lib/search/errors";

const identity = { fullName: "Alex Smith", sport: "football", schools: ["Utah", "Cal", "CAL"], teams: ["SF", "KC", "Washington Commanders"] };
const article = (overrides: Partial<ArticleMetadata> = {}): ArticleMetadata => ({
  headline: "Alex Smith reflects on his football career at Utah", summary: "An interview with the former quarterback.",
  article_url: "https://publisher.example.com/story", canonical_url: "https://publisher.example.com/story",
  source_domain: "publisher.example.com", publisher: "Publisher", author: null, published_at: null,
  thumbnail_url: null, metadata: { extraction: "NewsArticle" }, ...overrides,
});

describe("football article identity", () => {
  it("searches the quoted name with each college and each full team name", () => {
    expect(identityQueries(identity)).toEqual([
      '"Alex Smith" football Utah news interviews',
      '"Alex Smith" football San Francisco 49ers news interviews',
      '"Alex Smith" football California news interviews',
      '"Alex Smith" football Kansas City Chiefs news interviews',
      '"Alex Smith" football Washington Commanders news interviews',
    ]);
    expect(identityQueries({ ...identity, schools: ["Utah", "UTAH", "Utes"], searchSchools: ["Utah"] })).toHaveLength(4);
    expect(identityQueries({ ...identity, teams: Array.from({ length: 32 }, (_, i) => `Team ${i}`) })).toHaveLength(8);
  });
  it.each([
    { headline: "Alex Smith stars at Utah", summary: "The basketball player scores 30 points." },
    { headline: "Alex Smith at Cal", summary: "The baseball pitcher speaks about his season." },
    { headline: "Alex Smith at Utah", summary: "The actor discusses a new movie." },
    { headline: "Alex Smith at Stanford", summary: "The football quarterback wins again." },
    { headline: "Alex Smithson at Utah", summary: "The football quarterback wins again." },
  ])("rejects a namesake or wrong affiliation: $headline / $summary", metadata => {
    expect(articleRelevance(article(metadata), identity)).toBeLessThan(0.8);
  });
  it.each([
    { headline: "Alex Smith's Chiefs career", summary: "The NFL quarterback reflects." },
    { headline: "Alex Smith at Cal", summary: "A football career remembered." },
    { headline: "Alex Smith and the San Francisco 49ers", summary: "An NFL interview." },
  ])("accepts saved college/team context from publisher metadata: $headline", metadata => {
    expect(articleRelevance(article(metadata), identity)).toBeGreaterThanOrEqual(0.8);
  });
  it("does not infer an affiliation from a search snippet", async () => {
    const result = await discoverNews(identity, { name: "fixture", search: async () => [{ url: article().article_url }] },
      async () => article({ headline: "Alex Smith", summary: "An interview about basketball." }), AbortSignal.timeout(1000));
    expect(result.articles).toEqual([]);
  });
  it.each(["https://www.espn.com/", "https://www.nytimes.com/athletic/", "https://calbears.com/", "https://publisher.example.com/news", "https://www.nfl.com/players/alex-smith/", "https://en.wikipedia.org/wiki/Alex_Smith", "https://www.on3.com/rivals/antoine-cason-6776", "https://alumni.arizona.edu/notable-alumni/antoine-cason"])("excludes publisher homepages, indexes and profiles: %s", url => {
    expect(isNewsArticleUrl(url)).toBe(false);
  });
  it("keeps a valid later-team result within the extraction budget", async () => {
    const search = vi.fn(async (query: string) => Array.from({ length: 8 }, (_, i) => ({
      url: `https://publisher.example.com/${query.includes("Chiefs") ? "chiefs" : "other"}-${i}`,
    })));
    const extract = vi.fn(async (url: string) => article({ article_url: url, canonical_url: url,
      headline: url.includes("chiefs") ? "Alex Smith reflects on his Chiefs NFL career" : "Someone Else", summary: "Football interview." }));
    const result = await discoverNews(identity, { name: "fixture", search }, extract, AbortSignal.timeout(1000),
      Array.from({ length: 6 }, (_, i) => `https://publisher.example.com/old-${i}`));
    expect(search).toHaveBeenCalledTimes(5);
    expect(extract).toHaveBeenCalledTimes(12);
    expect(result.articles.some(a => a.article_url.includes("chiefs"))).toBe(true);
  });
  it("stops on provider errors without presenting an empty successful refresh", async () => {
    const search = vi.fn(async () => { throw new SearchProviderError("search_quota_exceeded"); });
    const extract = vi.fn();
    const result = await discoverNews(identity, { name: "fixture", search }, extract, AbortSignal.timeout(1000));
    expect(result).toMatchObject({ status: "unavailable", articles: [], errors: ["search_quota_exceeded"] });
    expect(search).toHaveBeenCalledTimes(3);
    expect(extract).not.toHaveBeenCalled();
  });
  it("does not spend search credits without a usable name and affiliation", async () => {
    const search = vi.fn();
    const result = await discoverNews({ ...identity, teams: [], schools: [] }, { name: "fixture", search }, vi.fn(), AbortSignal.timeout(1000));
    expect(result).toMatchObject({ status: "unavailable", errors: ["news_identity_incomplete"] });
    expect(search).not.toHaveBeenCalled();
    expect(identityQueries({ ...identity, fullName: "Alex" })).toEqual([]);
  });
  it("recognizes the saved Cal Berkeley label without confusing another California campus", () => {
    const cal = { ...identity, schools: ["Cal Berkeley"], teams: [] };
    expect(identityQueries(cal)).toEqual(['"Alex Smith" football California news interviews']);
    expect(articleRelevance(article({ headline: "Alex Smith's Cal football career", summary: "A career interview." }), cal)).toBeGreaterThanOrEqual(0.8);
    expect(articleRelevance(article({ headline: "Alex Smith's Southern California football career", summary: "A career interview." }), cal)).toBeLessThan(0.8);
  });
});
