// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { evaluateSource, requireSourceAction, remoteAssetReference, policyDiagnostics } from "@/lib/source-policy/policy";
import { fetchSourceFacts } from "@/lib/source-policy/fetch";
import { policyCheckedResult } from "@/lib/source-policy/results";
import { extractArticleMetadata } from "@/lib/enrichment/article-metadata";
import { normalizeAward } from "@/lib/enrichment/awards";
import { discoverNews } from "@/lib/enrichment/news";

const pfr = "https://www.pro-football-reference.com/players/H/HughDa20.htm";
const story = "https://publisher.example.com/story";
const identity = { fullName: "Fixture Athlete", sport: "football", teams: ["Cal"], schools: [] };
const html = '<title>Fixture Athlete football career at Cal</title><meta name="description" content="Career retrospective"><meta property="og:image" content="https://cdn.example.com/photo.jpg"><p>RAW BODY MUST NOT BE PERSISTED</p>';
afterEach(() => vi.unstubAllGlobals());

it.each(["pro-football-reference.com", "basketball-reference.com", "baseball-reference.com", "hockey-reference.com", "fbref.com", "sports-reference.com"])("keeps the exact %s domain family reference-only", domain => {
  for (const prefix of ["", "www.", "college."]) {
    const url = `https://${prefix}${domain}/athlete`;
    expect(evaluateSource(url)).toMatchObject({ decision: "REFERENCE_ONLY", discovery_allowed: true, asset_download_allowed: false });
    expect(() => requireSourceAction(url, "PERSIST_METADATA")).not.toThrow();
    for (const action of ["EXTRACT_METADATA", "EXTRACT_FACTS", "PERSIST_FACTS", "CRAWL", "BULK_INGEST", "ASSET_DOWNLOAD"] as const) {
      expect(() => requireSourceAction(url, action)).toThrow("source_policy_blocked");
    }
  }
});
it("does not confuse misleading domains with a trusted domain family", () => {
  expect(evaluateSource("https://sports-reference.com.attacker.com").source_type).toBe("unknown");
  expect(evaluateSource("https://notespn.com/apis/search/v2").allowed_actions).not.toContain("EXTRACT_FACTS");
  expect(evaluateSource("https://sports-reference.com./").decision).toBe("REFERENCE_ONLY");
});
it.each(["http://espn.com", "file:///etc/passwd", "https://user:secret@espn.com", "https://localhost", "https://127.0.0.1", "https://espn.com:444"])("denies unsafe source URL %s", url => {
  expect(evaluateSource(url).decision).toBe("DENY");
});
it("allows only bounded metadata for an unknown publisher, without granting crawl or asset download rights", () => {
  expect(evaluateSource(story)).toMatchObject({ decision: "RESTRICT", policy_status: "review_required", extract_allowed: "metadata_only", rate_limit: null });
  expect(remoteAssetReference("https://cdn.example.com/photo.jpg")).not.toBeNull();
  expect(remoteAssetReference(pfr)).toBeNull();
  expect(() => requireSourceAction(story, "PERSIST_FACTS")).toThrow();
  expect(() => requireSourceAction(story, "ASSET_DOWNLOAD")).toThrow();
});
it("denies raw source fact requests before any network call", async () => {
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  await expect(fetchSourceFacts(pfr)).rejects.toThrow("source_policy_blocked");
  await expect(fetchSourceFacts(story)).rejects.toThrow("source_policy_blocked");
  expect(fetcher).not.toHaveBeenCalled();
});
it("registered fact transport forces no-store and refuses automatic redirects", async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({})); vi.stubGlobal("fetch", fetcher);
  await fetchSourceFacts("https://en.wikipedia.org/api/rest_v1/page/summary/Fixture", { redirect: "follow", cache: "force-cache" });
  expect(fetcher).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ redirect: "error", cache: "no-store" }));
});
it("does not authorize arbitrary synthesized facts from metadata-only citations", () => {
  expect(policyCheckedResult({ source: "wikipedia", ok: true, urls: [story], facts: { games_played: 100 } })).toMatchObject({ ok: false, reason: "blocked" });
  expect(policyCheckedResult({ source: "wikipedia", ok: true, facts: { full_name: "Fixture Athlete" } })).toMatchObject({ ok: false, reason: "blocked" });
});
it("separates a permitted extraction endpoint from its presentation citation", () => {
  const endpoint = "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/athletes/123";
  const result = policyCheckedResult({ source: "espn", ok: true,
    urls: ["https://www.espn.com/nfl/player/_/id/123"], fact_source_urls: [endpoint], facts: { full_name: "Fixture Athlete" } });
  expect(result.ok).toBe(true);
  expect(result.provenance).toEqual(expect.arrayContaining([expect.objectContaining({ source_url: endpoint, policy_id: "espn-player-metadata" })]));
  expect(policyCheckedResult({ ...result, fact_source_urls: [story] }).ok).toBe(false);
});
it("does not let an allowed source hide an additional denied fact source", () => {
  const result = policyCheckedResult({ source: "wikipedia", ok: true,
    urls: ["https://en.wikipedia.org/wiki/Fixture", story], facts: { full_name: "Fixture Athlete" } });
  expect(result.ok).toBe(false);
});
it("sanitizes discovered asset references independently from source facts", () => {
  const result = policyCheckedResult({ source: "wikipedia", ok: true, urls: ["https://en.wikipedia.org/wiki/Fixture"],
    facts: { photos: [{ url: pfr }, { url: "https://cdn.example.com/photo.jpg" }] } });
  expect(result.facts?.photos).toHaveLength(1);
  expect(result.facts?.photos?.[0]).toMatchObject({ source_url: "https://en.wikipedia.org/wiki/Fixture" });
});
it("keeps a reviewed reference-only award citation unverified without granting extraction", () => {
  const award = normalizeAward({ label: "Fixture award", year: "2001", sourceUrl: pfr }, []);
  expect(award).toMatchObject({ verified: false, source_url: pfr, metadata: { provenance: { policy_decision: "REFERENCE_ONLY", confidence: null } } });
  expect(() => extractArticleMetadata(html, pfr)).toThrow("source_policy_blocked");
});
it("blocks reference-only discovery and known URLs before publisher extraction", async () => {
  const extract = vi.fn(async (url: string) => extractArticleMetadata(html, url));
  const result = await discoverNews(identity, { name: "fixture", search: async () => [{ url: pfr }, { url: story }] }, extract, AbortSignal.timeout(1000), [pfr]);
  expect(extract).toHaveBeenCalledOnce(); expect(extract).toHaveBeenCalledWith(story, expect.any(AbortSignal));
  expect(result.articles).toHaveLength(1);
  expect(result.source_policy).toMatchObject({ discovered: 2, allowed: 1, reference_only: 1, rejected: 1 });
  expect(result.articles[0].metadata.provenance).toMatchObject({ source_url: story, discovery_provider: "fixture", confidence: expect.any(Number) });
  expect(JSON.stringify(result.articles)).not.toContain("RAW BODY");
});
it("rechecks canonical URLs from an alternate extractor before persistence", async () => {
  const result = await discoverNews(identity, { name: "fixture", search: async () => [{ url: story }] },
    async () => ({ ...extractArticleMetadata(html, story)!, canonical_url: pfr }), AbortSignal.timeout(1000));
  expect(result.articles).toEqual([]); expect(result.status).toBe("unavailable");
});
it("retains signed image parameters exactly while applying asset-reference policy", () => {
  const image = "https://cdn.example.com/image.png?X-Signature=abc&expires=1&transform=400";
  const article = extractArticleMetadata(html.replace("https://cdn.example.com/photo.jpg", image), story)!;
  expect(article.thumbnail_url).toBe(image);
  expect(extractArticleMetadata(html.replace("https://cdn.example.com/photo.jpg", pfr), story)?.thumbnail_url).toBeNull();
});
it("source diagnostics distinguish limits from permission and remain bounded", () => {
  expect(policyDiagnostics([pfr, pfr, story], "CRAWL")).toMatchObject({ discovered: 2, allowed: 0, rejected: 2 });
  expect(policyDiagnostics([pfr, story], "CRAWL").reasons.length).toBeLessThanOrEqual(8);
});
