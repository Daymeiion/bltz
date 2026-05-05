import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { scrapeYouTube } from "@/lib/pipeline/scrapers/youtube";
import { scrapeESPN } from "@/lib/pipeline/scrapers/espn";

const identity = {
  full_name: "Daymeion Hughes",
  school: "California",
  position: "CB",
  level: "former" as const,
};

describe("scrapeYouTube", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("extracts watch URLs from ytInitialData-style HTML", async () => {
    const html = `
      <html>{"videoId":"abcDEF12345","other":"stuff"}
      {"videoId":"xyz9876_QrS","more":"data"}
      {"videoId":"abcDEF12345"} <!-- duplicate, should be deduped -->
      </html>`;
    globalThis.fetch = vi.fn(async () =>
      new Response(html, { status: 200, headers: { "content-type": "text/html" } }),
    ) as unknown as typeof fetch;

    const result = await scrapeYouTube(identity);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.facts?.youtube_urls).toEqual([
      "https://www.youtube.com/watch?v=abcDEF12345",
      "https://www.youtube.com/watch?v=xyz9876_QrS",
    ]);
  });

  it("returns blocked when the response status is non-OK", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response("forbidden", { status: 403 }),
    ) as unknown as typeof fetch;
    const result = await scrapeYouTube(identity);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("blocked");
  });

  it("returns not_found when no video IDs match", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response("<html><body>nothing</body></html>", { status: 200 }),
    ) as unknown as typeof fetch;
    const result = await scrapeYouTube(identity);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("not_found");
  });
});

describe("scrapeESPN", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns not_found when no candidate player URL is on the search page", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response("<html><body>nothing here</body></html>", { status: 200 }),
    ) as unknown as typeof fetch;
    const result = await scrapeESPN(identity);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("not_found");
  });

  it("parses HT, WT, GP off the player page", async () => {
    const search = `<html><a href="https://www.espn.com/nfl/player/_/id/12345/daymeion-hughes">Daymeion Hughes</a></html>`;
    const playerPage = `<html>HT: 5'10 WT: 187 GP: 14 More text...</html>`;
    let call = 0;
    globalThis.fetch = vi.fn(async () => {
      call++;
      return new Response(call === 1 ? search : playerPage, {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    }) as unknown as typeof fetch;

    const result = await scrapeESPN(identity);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.facts?.height_in).toBe(70);
    expect(result.facts?.weight_lbs).toBe(187);
    expect(result.facts?.games_played).toBe(14);
    expect(result.urls?.[0]).toContain("espn.com/nfl/player/_/id/12345");
  });
});
