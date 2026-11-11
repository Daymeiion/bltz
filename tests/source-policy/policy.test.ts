// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { evaluateSource, requireSourceAction, remoteAssetReference, policyDiagnostics } from "@/lib/source-policy/policy";
import { fetchSourceFacts } from "@/lib/source-policy/fetch";
import { policyCheckedResult } from "@/lib/source-policy/results";
import { fetchHtml } from "@/lib/pipeline/fetch";
import { extractWikipediaAwardEvidence } from "@/lib/pipeline/scrapers/wikipedia";
import { extractArticleMetadata } from "@/lib/enrichment/article-metadata";
import { normalizeAward } from "@/lib/enrichment/awards";
import { discoverNews } from "@/lib/enrichment/news";
import { tavilySearch } from "@/lib/search/tavily";
import { buildEnrichment } from "@/lib/preview-lockers/enrichment";
import { previewContent } from "@/lib/preview-lockers/validation";
const pfr = "https://www.pro-football-reference.com/players/H/HughDa20.htm";
const identity = { fullName: "Fixture Athlete", sport: "football", teams: ["Cal"], schools: [] };
const story = "https://publisher.example.com/story";
const html = '<title>Fixture Athlete football career at Cal</title><meta name="description" content="A career retrospective"><meta property="og:image" content="https://cdn.example.com/photo.jpg"><p>FULL BODY MUST NOT LEAVE EXTRACTOR</p>';
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it.each(["pro-football-reference.com", "basketball-reference.com", "baseball-reference.com", "hockey-reference.com", "fbref.com", "sports-reference.com"])("recognizes %s and every subdomain as reference-only", domain => {
  for (const prefix of ["", "www.", "college."]) {
    const p = evaluateSource(`https://${prefix}${domain}/athlete`);
    expect(p).toMatchObject({ decision: "REFERENCE_ONLY", source_type: "reference_database", discovery_allowed: true, asset_download_allowed: false, attribution_required: true });
    expect(p.allowed_actions).toContain("VERIFY");
    for (const action of ["CRAWL", "BULK_INGEST", "ASSET_DOWNLOAD", "EXTRACT_FACTS", "EXTRACT_METADATA", "PERSIST_FACTS"] as const) expect(() => requireSourceAction(`https://${prefix}${domain}/athlete`, action)).toThrow("source_policy_blocked");
  }
});
it("matches domain boundaries, not misleading substrings", () => {
  expect(evaluateSource("https://sports-reference.com.attacker.com").source_type).toBe("unknown");
  expect(evaluateSource("https://notsports-reference.com").source_type).toBe("unknown");
  expect(evaluateSource("https://sports-reference.com./").decision).toBe("REFERENCE_ONLY");
});
it("unknown sources are metadata-only and never receive bulk or asset rights", () => {
  const p = evaluateSource(story);
  expect(p).toMatchObject({ source_type: "unknown", decision: "RESTRICT", extract_allowed: "metadata_only", persistent_storage_allowed: "limited_metadata", crawl_allowed: false, bulk_ingestion_allowed: false, asset_download_allowed: false, rate_limit: null });
  expect(() => requireSourceAction(story, "EXTRACT_FACTS")).toThrow();
});
it.each([["nfl.com", "official_league"], ["chargers.com", "official_team"], ["calbears.com", "official_school"]])("recognizes configured official source %s without granting media rights", (domain, type) => {
  expect(evaluateSource(`https://${domain}/player`)).toMatchObject({ source_type: type, extract_allowed: "metadata_only", asset_download_allowed: false });
});
it.each(["http://sports-reference.com", "file:///etc/passwd", "https://user:secret@espn.com", "https://localhost", "https://127.0.0.1", "https://espn.com:444"]) ("denies unsafe source %s", url => {
  expect(evaluateSource(url).decision).toBe("DENY");
});
it("legacy raw extraction cannot bypass policy or make a network request", async () => {
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  await expect(fetchSourceFacts(pfr)).rejects.toThrow("source_policy_blocked");
  await expect(fetchSourceFacts(story)).rejects.toThrow("source_policy_blocked");
  expect(await fetchHtml(pfr)).toMatchObject({ ok: false });
  expect(fetcher).not.toHaveBeenCalled();
  expect(() => extractArticleMetadata(html, pfr)).toThrow();
  expect(() => extractWikipediaAwardEvidence(html, pfr)).toThrow();
});
it("registered single-athlete requests refuse automatic redirects and persistent fetch caches", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response("{}")); vi.stubGlobal("fetch", fetcher);
  await fetchSourceFacts("https://en.wikipedia.org/api/rest_v1/page/summary/Fixture", { redirect: "follow", cache: "force-cache" });
  expect(fetcher).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ redirect: "error", cache: "no-store" }));
});
it("every returned Tavily URL carries policy; reference links remain discoverable", async () => {
  vi.stubEnv("TAVILY_API_KEY", "test-key");
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ results: [{ url: pfr }, { url: story }, { url: "file:///secret" }] })));
  const results = await tavilySearch("Fixture Athlete", 6, { includeDomains: [] });
  expect(results).toHaveLength(2);
  expect(results[0].policy.decision).toBe("REFERENCE_ONLY"); expect(results[1].policy.extract_allowed).toBe("metadata_only");
});
it("news metadata works, excludes reference-only URLs before extraction, and retains provenance", async () => {
  const extract = vi.fn(async (url: string) => extractArticleMetadata(html, url));
  const result = await discoverNews(identity, { name: "fixture", search: async () => [{ url: pfr }, { url: story }] }, extract, AbortSignal.timeout(1000));
  expect(extract).toHaveBeenCalledTimes(1); expect(extract).toHaveBeenCalledWith(story, expect.any(AbortSignal));
  expect(result.articles).toHaveLength(1);
  expect(result.articles[0].metadata.provenance).toMatchObject({ source_url: story, source_domain: "publisher.example.com", source_type: "unknown", discovery_provider: "fixture", policy_decision: "RESTRICT", attribution_required: true, confidence: expect.any(Number) });
  expect(JSON.stringify(result.articles)).not.toContain("FULL BODY");
  expect(result.source_policy).toMatchObject({ discovered: 2, allowed: 1, reference_only: 1, rejected: 1 });
});
it("re-evaluates extractor canonical URLs before persistence", async () => {
  const result = await discoverNews(identity, { name: "fixture", search: async () => [{ url: story }] }, async () => ({ ...extractArticleMetadata(html, story)!, canonical_url: pfr }), AbortSignal.timeout(1000));
  expect(result.articles).toEqual([]);
});
it("award evidence keeps raw text, source domain and unverified provenance", () => {
  const url = "https://en.wikipedia.org/wiki/Fixture_Athlete";
  const [evidence] = extractWikipediaAwardEvidence("Career highlights and awards<td><ul><li>Fixture Honor (2001)</li></ul></td>", url);
  const normalized = normalizeAward({ label: evidence.name, year: evidence.year!, sourceUrl: evidence.source_url }, []);
  expect(normalized).toMatchObject({ raw_label: "Fixture Honor (2001)", source_url: url, award_id: null, verified: false, metadata: { provenance: { source_domain: "en.wikipedia.org", source_type: "encyclopedic" } } });
});
it("page extraction and asset reference/download decisions are independent", () => {
  expect(remoteAssetReference("https://cdn.example.com/photo.jpg")).not.toBeNull();
  expect(() => requireSourceAction("https://cdn.example.com/photo.jpg", "ASSET_DOWNLOAD")).toThrow();
  const article = extractArticleMetadata(html.replace("https://cdn.example.com/photo.jpg", `${pfr}?image=1`), story)!;
  expect(article.headline).toContain("Fixture"); expect(article.thumbnail_url).toBeNull();
});
it("initial pipeline rejects reference-only facts before synthesis and preserves safe facts with provenance", () => {
  expect(policyCheckedResult({ source: "wikipedia", ok: true, urls: [pfr], facts: { games_played: 100 } })).toMatchObject({ ok: false, reason: "blocked" });
  const result = policyCheckedResult({ source: "wikipedia", ok: true, urls: ["https://en.wikipedia.org/wiki/Fixture"], facts: { photos: [{ url: "https://cdn.example.com/photo.jpg" }] } });
  expect(result.provenance?.[0].source_type).toBe("encyclopedic");
  expect(result.facts?.photos?.[0].source_url).toBe("https://en.wikipedia.org/wiki/Fixture");
});
it.each(["blocked", "failed"])("base preview survives %s optional news", async failure => {
  const content = previewContent.parse({ slug: "fixture-athlete", full_name: "Fixture Athlete" });
  const result = await buildEnrichment(content, { awards: async () => [], news: async () => {
    if (failure === "failed") throw new Error("extract failed");
    return discoverNews(identity, { name: "fixture", search: async () => [{ url: pfr }] }, vi.fn(), AbortSignal.timeout(1000));
  } });
  expect(result.awards).toEqual([]); expect(result.report).toBeDefined();
});
it("source diagnostics are bounded and policy does not equate rate limits with permission", () => {
  const d = policyDiagnostics([pfr, pfr, story], "CRAWL");
  expect(d).toMatchObject({ discovered: 2, allowed: 0, rejected: 2 }); expect(d.reasons.length).toBeLessThanOrEqual(8);
});
it("external initial adapters use the sanctioned transport, and raw metadata HTML stays private", () => {
  for (const adapter of ["wikipedia", "espn", "youtube"]) {
    const source = readFileSync(`lib/pipeline/scrapers/${adapter}.ts`, "utf8");
    expect(source).not.toMatch(/\bfetch\(/); expect(source).toContain("fetchSourceFacts");
  }
  const source = readFileSync("lib/enrichment/safe-fetch.ts", "utf8");
  expect(source).not.toMatch(/export\s+async\s+function\s+fetchArticleHtml/);
  expect(source).toContain('requireSourceAction(url, "EXTRACT_METADATA")');
});
