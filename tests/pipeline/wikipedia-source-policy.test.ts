// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { extractWikipediaAwardEvidence, scrapeWikipedia } from "@/lib/pipeline/scrapers/wikipedia";
import { SourcePolicyError } from "@/lib/source-policy/policy";

afterEach(() => vi.unstubAllGlobals());

function fixtureFetch(articleUrl = "https://en.wikipedia.org/wiki/Fixture_Player") {
  return vi.fn(async (url: string | URL | Request) => {
    const address = String(url);
    if (address.includes("/w/api.php")) return Response.json({ query: { search: [{ title: "Fixture Player", pageid: 1, snippet: "" }] } });
    if (address.includes("/api/rest_v1/")) return Response.json({ extract: "Fixture Player is a football player.", description: "American football player", content_urls: { desktop: { page: articleUrl } } });
    return new Response("<html>Fixture Player is a football player.</html>", { headers: { "content-type": "text/html" } });
  });
}

it("uses bounded, uncached and redirect-refusing requests for Wikipedia search and summary", async () => {
  const fetch = fixtureFetch();
  vi.stubGlobal("fetch", fetch);
  const result = await scrapeWikipedia({ full_name: "Fixture Player" });
  expect(result.ok).toBe(true);
  expect(fetch).toHaveBeenCalledTimes(3);
  for (const [, options] of fetch.mock.calls.slice(0, 2) as unknown as [string, RequestInit][]) {
    expect(options).toMatchObject({ cache: "no-store", redirect: "error" });
    expect(options.signal).toBeInstanceOf(AbortSignal);
  }
});

it("never follows a response-provided article link into a reference-only source", async () => {
  const fetch = fixtureFetch("https://www.pro-football-reference.com/players/P/Player00.htm");
  vi.stubGlobal("fetch", fetch);
  const result = await scrapeWikipedia({ full_name: "Fixture Player" });
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.urls).toEqual(["https://en.wikipedia.org/wiki/Fixture%20Player"]);
  expect(fetch.mock.calls.every(([url]) => new URL(String(url)).hostname === "en.wikipedia.org")).toBe(true);
});

it("refuses evidence extraction from supplied HTML attributed to a reference-only source", () => {
  const html = "<table><th>Career highlights and awards</th><td><ul><li>Pro Bowl (2001)</li></ul></td></table>";
  expect(() => extractWikipediaAwardEvidence(html, "https://www.pro-football-reference.com/players/P/Player00.htm")).toThrow(SourcePolicyError);
  expect(extractWikipediaAwardEvidence(html, "https://en.wikipedia.org/wiki/Fixture_Player")).toEqual([{ name: "Pro Bowl (2001)", year: "2001", source_url: "https://en.wikipedia.org/wiki/Fixture_Player" }]);
});
