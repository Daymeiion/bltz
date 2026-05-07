import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { scrapeYouTube } from "@/lib/pipeline/scrapers/youtube";
import { scrapeESPN } from "@/lib/pipeline/scrapers/espn";
import { scrapeWikipedia } from "@/lib/pipeline/scrapers/wikipedia";
import { scrapeNflverse } from "@/lib/pipeline/scrapers/nflverse";

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

describe("scrapeWikipedia", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("extracts birthdate, hometown, pro teams, bio, and thumbnail candidates", async () => {
    const search = {
      query: {
        search: [
          {
            title: "Daymeion Hughes",
            pageid: 123,
            snippet: "American football cornerback",
          },
        ],
      },
    };
    const summary = {
      extract: "Daymeion Hughes is a former American football cornerback.",
      content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/Daymeion_Hughes" } },
      thumbnail: { source: "https://upload.wikimedia.org/daymeion.jpg" },
    };
    const article = `
      <html>
        Daymeion Hughes (born August 21, 1985) is from Los Angeles, California.
        He played for the Indianapolis Colts and San Diego Chargers.
        Height 5 ft 10 in Weight 187 lb
      </html>`;
    let call = 0;
    globalThis.fetch = vi.fn(async () => {
      call++;
      return new Response(call === 1 ? JSON.stringify(search) : call === 2 ? JSON.stringify(summary) : article, {
        status: 200,
        headers: { "content-type": call < 3 ? "application/json" : "text/html" },
      });
    }) as unknown as typeof fetch;

    const result = await scrapeWikipedia(identity);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.facts?.dob).toBe("1985-08-21");
    expect(result.facts?.hometown).toBe("Los Angeles, California");
    expect(result.facts?.pro_teams).toEqual(["Indianapolis Colts", "San Diego Chargers"]);
    expect(result.facts?.bio_text).toContain("former American football cornerback");
    expect(result.facts?.photos?.[0]?.url).toBe("https://upload.wikimedia.org/daymeion.jpg");
  });
});

describe("scrapeNflverse", () => {
  const originalFetch = globalThis.fetch;
  const SUPABASE_URL = "https://test.supabase.co";
  const SERVICE_KEY = "service-role-key";

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_KEY;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockResponse(rows: unknown[]) {
    return vi.fn(async () =>
      new Response(JSON.stringify(rows), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ) as unknown as typeof fetch;
  }

  it("returns a fact-rich hit on a single match", async () => {
    globalThis.fetch = mockResponse([
      {
        gsis_id: "00-0033873",
        display_name: "Patrick Mahomes",
        birth_date: "1995-09-17",
        position: "QB",
        position_group: "QB",
        height_in: 74,
        weight_lbs: 225,
        headshot_url: "https://nfl.example/mahomes.png",
        college_name: "Texas Tech",
        latest_team: "KC",
        espn_id: "3139477",
        pfr_id: "MahoPa00",
      },
    ]);

    const result = await scrapeNflverse({ full_name: "Patrick Mahomes" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.source).toBe("nflverse");
    expect(result.facts?.dob).toBe("1995-09-17");
    expect(result.facts?.height_in).toBe(74);
    expect(result.facts?.weight_lbs).toBe(225);
    expect(result.facts?.position).toBe("QB");
    expect(result.facts?.school).toBe("Texas Tech");
    expect(result.facts?.pro_teams).toEqual(["KC"]);
    expect(result.facts?.photos?.[0]?.url).toBe("https://nfl.example/mahomes.png");
    expect(result.urls?.[0]).toBe("https://www.espn.com/nfl/player/_/id/3139477");
  });

  it("disambiguates two players with the same name by college", async () => {
    // Real-world example seen in the synced data.
    globalThis.fetch = mockResponse([
      {
        gsis_id: "00-0036322",
        display_name: "Justin Jefferson",
        birth_date: "1999-06-16",
        position: "WR",
        position_group: "WR",
        height_in: 73,
        weight_lbs: 195,
        headshot_url: null,
        college_name: "LSU",
        latest_team: "MIN",
        espn_id: null,
        pfr_id: null,
      },
      {
        gsis_id: "JEF270909",
        display_name: "Justin Jefferson",
        birth_date: "2003-03-20",
        position: "LB",
        position_group: "LB",
        height_in: 73,
        weight_lbs: 227,
        headshot_url: null,
        college_name: "Alabama",
        latest_team: "CLE",
        espn_id: null,
        pfr_id: null,
      },
    ]);

    const result = await scrapeNflverse({
      full_name: "Justin Jefferson",
      school: "LSU",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.facts?.position).toBe("WR");
    expect(result.facts?.school).toBe("LSU");
  });

  it("returns ambiguous when multiple matches and no school/position to disambiguate", async () => {
    globalThis.fetch = mockResponse([
      {
        gsis_id: "A",
        display_name: "John Smith",
        birth_date: null,
        position: "RB",
        position_group: "RB",
        height_in: null,
        weight_lbs: null,
        headshot_url: null,
        college_name: "Texas",
        latest_team: null,
        espn_id: null,
        pfr_id: null,
      },
      {
        gsis_id: "B",
        display_name: "John Smith",
        birth_date: null,
        position: "DT",
        position_group: "DL",
        height_in: null,
        weight_lbs: null,
        headshot_url: null,
        college_name: "Florida",
        latest_team: null,
        espn_id: null,
        pfr_id: null,
      },
    ]);

    const result = await scrapeNflverse({ full_name: "John Smith" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("ambiguous");
  });

  it("returns not_found when there are zero matches", async () => {
    globalThis.fetch = mockResponse([]);
    const result = await scrapeNflverse({ full_name: "Nobody Real" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("not_found");
  });

  it("returns not_found gracefully when env vars are missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const result = await scrapeNflverse({ full_name: "Patrick Mahomes" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("not_found");
  });
});
