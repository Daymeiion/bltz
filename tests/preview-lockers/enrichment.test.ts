// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { normalizeAward, normalizeAwards, catalogImage, type CatalogAward } from "@/lib/enrichment/awards";
import { extractArticleMetadata } from "@/lib/enrichment/article-metadata";
import { articleRelevance, dedupeArticles, discoverNews, identityQueries, type ArticleMetadata } from "@/lib/enrichment/news";
import { isPublicAddress } from "@/lib/enrichment/safe-fetch";
import { buildEnrichment } from "@/lib/preview-lockers/enrichment";
import { previewContent } from "@/lib/preview-lockers/validation";
import { extractWikipediaAwardEvidence } from "@/lib/pipeline/scrapers/wikipedia";

const catalog = [
  { id: "super-bowl", name: "Super Bowl Champion", slug: "super-bowl-champion", aliases: ["SB champion"], active: true },
  { id: "heisman", name: "Heisman Trophy", slug: "heisman-trophy", aliases: ["Heisman Trophy winner", "Heisman winner", "Heisman Memorial Trophy"], active: true },
] as CatalogAward[];
const identity = { fullName: "Daymeion Hughes", sport: "football", teams: ["Chargers"], schools: ["Cal"], position: "cornerback" };
const article: ArticleMetadata = { headline: "Daymeion Hughes returns to Cal", summary: "The football cornerback shares his story.", article_url: "https://sports.example.com/story", canonical_url: "https://sports.example.com/story", publisher: "Sports", source_domain: "sports.example.com", author: null, published_at: null, thumbnail_url: null, metadata: { extraction: "HTML" } };
describe("award catalog normalization", () => {
  it("extracts infobox award evidence including unknowns, years and editions", () => {
    const awards = extractWikipediaAwardEvidence('<table><tr><th>Career highlights and awards</th></tr><tr><td><ul><li>Super Bowl champion (XLVI)</li><li>Heisman Trophy (2001)</li><li>Team Service Award (2002)</li></ul></td></tr></table><p>Someone else won the Maxwell Award.</p>', 'https://en.wikipedia.org/wiki/Fixture');
    expect(awards).toHaveLength(3); expect(awards[1].year).toBe('2001');
    expect(normalizeAward({ label: awards[0].name, year: '' }, catalog)).toMatchObject({ award_id: 'super-bowl', edition: 'XLVI' });
    expect(normalizeAward({ label: awards[2].name, year: awards[2].year ?? '' }, catalog).award_id).toBeNull();
  });
  it.each(["Super Bowl champion", "Super Bowl XLVI Champion", "SB XLVI champion"])("normalizes %s", label => {
    const normalized = normalizeAward({ label, year: "2011" }, catalog);
    expect(normalized.award_id).toBe("super-bowl"); expect(normalized.year).toBe("2011"); expect(normalized.verified).toBe(false);
    if (label.includes("XLVI")) expect(normalized.edition).toBe("XLVI");
  });
  it.each(["Heisman Trophy winner", "Heisman winner", "Heisman Memorial Trophy"])("normalizes %s", label => {
    expect(normalizeAward({ label, year: "" }, catalog).award_id).toBe("heisman");
  });
  it("retains unmapped evidence, ignores inactive entries and avoids ambiguous aliases", () => {
    expect(normalizeAward({ label: "Team Spirit Award", year: "2005", sourceUrl: "https://cal.example.com/awards" }, catalog)).toMatchObject({ award_id: null, raw_label: "Team Spirit Award", year: "2005", metadata: { mapping: "unmapped" } });
    expect(normalizeAward({ label: "Heisman winner", year: "" }, catalog.map(c => ({ ...c, active: false }))).award_id).toBeNull();
    expect(normalizeAward({ label: "Heisman winner", year: "" }, [...catalog, { ...catalog[1], id: "ambiguous" }]).award_id).toBeNull();
  });
  it("deduplicates aliases but preserves separate wins and doesn't infer edition years", () => {
    expect(normalizeAwards([{ label: "Heisman winner", year: "2001" }, { label: "Heisman Trophy", year: "2001" }, { label: "Heisman Trophy", year: "2002" }], catalog)).toHaveLength(2);
    expect(normalizeAward({ label: "SB XLVI champion", year: "" }, catalog).year).toBe("");
  });
  it("requires explicit image approval, provenance, license and attribution", () => {
    const award = { ...catalog[0], canonical_image_url: "https://bltz.com/trophy.png", asset_status: "approved" as const };
    expect(catalogImage(award)).toBeNull();
    expect(catalogImage({ ...award, image_source_url: "https://bltz.com/license", image_license: "BLTZ-owned", attribution: "BLTZ" })).toBe(award.canonical_image_url);
  });
});
describe("publisher metadata", () => {
  it("prefers NewsArticle over Article and OpenGraph, including @graph and image objects", () => {
    const html = `<meta property="og:title" content="Wrong title"><script type="application/ld+json">${JSON.stringify({ "@graph": [
      { "@type": "Article", headline: "Generic", image: "/generic.jpg" },
      { "@type": ["NewsArticle"], headline: "Daymeion Hughes &amp; Cal", description: "Football news", publisher: { name: "Cal News" }, author: [{ name: "A Writer" }], datePublished: "2025-09-01", image: [{ url: "/cover.jpg" }], articleBody: "NEVER STORE THIS" },
    ] })}</script>`;
    const parsed = extractArticleMetadata(html, article.article_url)!;
    expect(parsed).toMatchObject({ headline: "Daymeion Hughes & Cal", publisher: "Cal News", author: "A Writer", published_at: "2025-09-01T00:00:00.000Z", thumbnail_url: "https://sports.example.com/cover.jpg", metadata: { extraction: "NewsArticle" } });
    expect(JSON.stringify(parsed)).not.toContain("NEVER STORE THIS");
  });
  it("uses OpenGraph then Twitter then standard HTML and tolerates malformed structured data", () => {
    expect(extractArticleMetadata(`<script type='application/ld+json'>broken</script><meta content='OG title' property='og:title'><meta name='twitter:title' content='Twitter'><meta property='og:image' content='/og.jpg'>`, article.article_url)).toMatchObject({ headline: "OG title", thumbnail_url: "https://sports.example.com/og.jpg" });
    expect(extractArticleMetadata(`<meta name=twitter:title content='Twitter title'><title>HTML</title>`, article.article_url)?.headline).toBe("Twitter title");
    expect(extractArticleMetadata(`<title>Headline &mdash; Football</title><meta name='description' content='Description'>`, article.article_url)).toMatchObject({ headline: "Headline — Football", summary: "Description", thumbnail_url: null });
    expect(extractArticleMetadata("<html>No title</html>", article.article_url)).toBeNull();
  });
  it("rejects dangerous image URLs and ignores cross-domain canonicals", () => {
    expect(extractArticleMetadata(`<title>News</title><link rel=canonical href='https://attacker.example.org/other'><meta property='og:image' content='javascript:alert(1)'>`, article.article_url)).toMatchObject({ canonical_url: article.article_url, thumbnail_url: null });
  });
  it("deduplicates canonical/tracking URLs and normalized headlines per domain", () => {
    expect(dedupeArticles([article, { ...article, headline: "Other", canonical_url: `${article.canonical_url}?utm_source=search#top` }])).toHaveLength(1);
    expect(dedupeArticles([article, { ...article, article_url: "https://sports.example.com/alternate", canonical_url: "https://sports.example.com/alternate", headline: "DAYMEION HUGHES RETURNS TO CAL!" }])).toHaveLength(1);
    expect(dedupeArticles([article, { ...article, article_url: "https://another.example.com/story", canonical_url: "https://another.example.com/story", source_domain: "another.example.com" }])).toHaveLength(2);
  });
  it("requires athlete name plus contextual evidence from publisher metadata", () => {
    expect(articleRelevance(article, identity)).toBeGreaterThanOrEqual(0.8);
    expect(articleRelevance({ ...article, headline: "John Hughes returns to Cal" }, identity)).toBe(0);
    expect(articleRelevance({ ...article, headline: "Daymeion Hughes speaks", summary: "The actor spoke today." }, identity)).toBeLessThan(0.8);
    expect(articleRelevance({ ...article, headline: "Daymeion Hughes speaks", summary: "Football news" }, identity)).toBeLessThan(0.8);
    expect(identityQueries(identity)).toContain('Daymeion Hughes football Cal news interviews');
  });
  it("deduplicates search candidates and survives blocked publishers", async () => {
    const extract = vi.fn(async (url: string) => { if (url.endsWith("blocked")) throw new Error("blocked"); return article; });
    const result = await discoverNews(identity, { name: "fixture", search: async () => [{ url: article.article_url }, { url: `${article.article_url}?utm_source=x` }, { url: "https://sports.example.com/blocked" }] }, extract, AbortSignal.timeout(1000));
    expect(result.articles).toHaveLength(1); expect(extract).toHaveBeenCalledTimes(2); expect(result.errors).toContain("metadata_unavailable");
  });
  it("rejects the same name, sport and position at the wrong affiliation", async () => {
    const wrong = { ...article, headline: "Daymeion Hughes signs", summary: "The football cornerback joins Stanford in the NFL." };
    expect(articleRelevance(wrong, { ...identity, league: "NFL" })).toBeLessThan(0.8);
    expect(articleRelevance(article, { ...identity, schools: [], teams: [] })).toBeLessThan(0.8);
    const result = await discoverNews(identity, { name: "fixture", search: async () => [{ url: wrong.article_url }] }, async () => wrong, AbortSignal.timeout(1000));
    expect(result.articles).toEqual([]);
    expect(result.rejected).toBe(1);
  });
});
describe("optional preview stages", () => {
  const content = previewContent.parse({ full_name: "Daymeion Hughes", slug: "daymeion-hughes", awards: [{ label: "Heisman Trophy", year: "2001" }] });
  it("builds when news fails", async () => {
    const result = await buildEnrichment(content, { awards: async () => normalizeAwards(content.awards, catalog), news: async () => { throw new Error("private upstream error"); } });
    expect(result.awards).toHaveLength(1); expect(result.report.errors).toEqual(["news_unavailable"]); expect(result.report.status).toBe("partial");
  });
  it("builds when awards fail, including a synchronous provider failure", async () => {
    const result = await buildEnrichment(content, { awards: () => { throw new Error("catalog offline"); }, news: async () => ({ articles: [], candidates: 0, rejected: 0, duplicates: 0, errors: [], status: "complete" }) });
    expect(result.awards).toBeNull(); expect(result.report.errors).toContain("awards_unavailable"); expect(result.news).not.toBeNull();
  });
  it.each(["127.0.0.1", "10.0.0.1", "169.254.169.254", "172.16.1.1", "192.168.1.1", "100.64.0.1", "224.0.0.1", "::1", "::ffff:127.0.0.1"])("blocks non-public destination %s", address => expect(isPublicAddress(address)).toBe(false));
  it("allows public IPv4", () => expect(isPublicAddress("8.8.8.8")).toBe(true));
});
it("preserves CDN image path slashes and signed query ordering", () => {
  const thumbnail = "https://cdn.example.com/quality/75/?z=last&url=https%3A%2F%2Fassets.example.com%2Fphoto&a=first&signature=AB%2Bcd";
  const metadata = extractArticleMetadata(`<meta property="og:title" content="Career"><meta property="og:image" content="${thumbnail.replaceAll('&', '&amp;')}">`, "https://sports.example.com/story/");
  expect(metadata?.thumbnail_url).toBe(thumbnail);
  expect(metadata?.article_url).toBe("https://sports.example.com/story");
});
it("uses publisher sharing artwork before stale structured-data images", () => {
  const share = "https://cdn.example.com/share/quality/75/?signature=ABC";
  const html = `<meta property="og:title" content="Career news"><meta property="og:image" content="${share}"><script type="application/ld+json">{"@type":"NewsArticle","headline":"Career news","image":{"url":"https://cdn.example.com/stale-image"}}</script>`;
  expect(extractArticleMetadata(html, "https://sports.example.com/story")?.thumbnail_url).toBe(share);
});

it("revalidates a previously saved article omitted by the new search", async () => {
  const old = { ...article, headline: "Daymeion Hughes Cal football career", article_url: "https://sports.example.com/old", canonical_url: "https://sports.example.com/old" };
  const fresh = { ...article, article_url: "https://sports.example.com/new", canonical_url: "https://sports.example.com/new" };
  const extract = vi.fn(async (url: string) => url.endsWith("old") ? old : fresh);
  const result = await discoverNews(identity, { name: "fixture", search: async () => [{ url: fresh.article_url }] }, extract, AbortSignal.timeout(1000), [old.article_url]);
  expect(result.articles.map(a => a.article_url)).toEqual([old.article_url, fresh.article_url]);
  expect(extract).toHaveBeenCalledWith(old.article_url, expect.anything());
});
it("does not retain prior article URLs when their metadata no longer matches", async () => {
  const wrong = { ...article, headline: "Someone Else", article_url: "https://sports.example.com/old", canonical_url: "https://sports.example.com/old" };
  const result = await discoverNews(identity, { name: "fixture", search: async () => [] }, async () => wrong, AbortSignal.timeout(1000), [wrong.article_url]);
  expect(result.articles).toEqual([]);
  expect(result.rejected).toBe(1);
});
