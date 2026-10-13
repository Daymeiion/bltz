import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { synthesize } from "@/lib/pipeline/claude";
import { scrapeCfbverse } from "@/lib/pipeline/scrapers/cfbverse";
import { scrapeWikipedia } from "@/lib/pipeline/scrapers/wikipedia";
import { discoveryDraft } from "@/lib/preview-lockers/discovery";
import { mergeSuggestions } from "@/lib/preview-lockers/merge-suggestions";
import { previewContent } from "@/lib/preview-lockers/validation";
import type { ScraperResult } from "@/lib/pipeline/types";

const identity = {
  full_name: "Daymeion Hughes",
  school: "California",
  position: "CB",
  level: "former" as const,
};

const ORIGINAL_KEY = process.env.OPENAI_API_KEY;

describe("synthesize (no API key — deterministic path)", () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    if (ORIGINAL_KEY) process.env.OPENAI_API_KEY = ORIGINAL_KEY;
  });

  it("merges scraped facts and emits a deterministic bio", async () => {
    const results: ScraperResult[] = [
      {
        source: "wikipedia",
        ok: true,
        facts: {
          bio_text: "Hughes is a former Cal cornerback.",
          dob: "1985-08-21",
          height_in: 71,
          weight_lbs: 187,
          awards: [
            { name: "All-American", source_url: "https://en.wikipedia.org/x" },
          ],
        },
        urls: ["https://en.wikipedia.org/x"],
      },
      {
        source: "espn",
        ok: true,
        facts: { games_played: 14 },
        urls: ["https://www.espn.com/x"],
      },
    ];
    const draft = await synthesize({ identity, results });
    expect(draft.full_name).toBe("Daymeion Hughes");
    expect(draft.dob).toBe("1985-08-21");
    expect(draft.height_in).toBe(71);
    expect(draft.weight_lbs).toBe(187);
    expect(draft.games_played).toBe(14);
    expect(draft.bio).toBe("Hughes is a former Cal cornerback.");
    expect(draft.awards).toHaveLength(1);
    expect(draft.sources?.length).toBeGreaterThanOrEqual(2);
  });

  it("never confirms machine-derived stats by default (T1 hallucination gate)", async () => {
    const results: ScraperResult[] = [
      {
        source: "wikipedia",
        ok: true,
        facts: {
          dob: "1990-01-01",
          height_in: 73,
          weight_lbs: 200,
        },
        urls: ["https://en.wikipedia.org/x"],
      },
    ];
    const draft = await synthesize({ identity, results });
    expect(draft.confirmed?.dob).toBe(false);
    expect(draft.confirmed?.height_in).toBe(false);
    expect(draft.confirmed?.weight_lbs).toBe(false);
    expect(draft.confirmed?.games_played).toBe(false);
  });

  it("dedupes awards across sources", async () => {
    const results: ScraperResult[] = [
      {
        source: "wikipedia",
        ok: true,
        facts: {
          awards: [
            { name: "Pro Bowl", source_url: "https://wiki" },
            { name: "Pro Bowl", source_url: "https://wiki" },
            { name: "All-American", source_url: "https://wiki" },
          ],
        },
        urls: ["https://wiki"],
      },
    ];
    const draft = await synthesize({ identity, results });
    expect(draft.awards.map((a) => a.name)).toEqual(["Pro Bowl", "All-American"]);
  });

  it("auto-confirms numeric stats when sourced from nflverse (high-trust)", async () => {
    const results: ScraperResult[] = [
      {
        source: "nflverse",
        ok: true,
        facts: {
          dob: "1995-09-17",
          height_in: 74,
          weight_lbs: 225,
          position: "QB",
          school: "Texas Tech",
        },
        urls: ["https://www.espn.com/nfl/player/_/id/3139477"],
      },
    ];
    const draft = await synthesize({
      identity: { full_name: "Patrick Mahomes", school: "Texas Tech", position: "QB", level: "pro" },
      results,
    });
    expect(draft.dob).toBe("1995-09-17");
    expect(draft.height_in).toBe(74);
    expect(draft.weight_lbs).toBe(225);
    expect(draft.confirmed?.dob).toBe(true);
    expect(draft.confirmed?.height_in).toBe(true);
    expect(draft.confirmed?.weight_lbs).toBe(true);
  });

  it("does not auto-confirm fields that nflverse missed but Wikipedia filled", async () => {
    const results: ScraperResult[] = [
      {
        source: "nflverse",
        ok: true,
        facts: {
          // nflverse hit but missing height/weight (rare but possible)
          dob: "1995-09-17",
          position: "QB",
        },
        urls: ["https://www.espn.com/nfl/player/_/id/3139477"],
      },
      {
        source: "wikipedia",
        ok: true,
        facts: {
          height_in: 74,
          weight_lbs: 225,
          bio_text: "QB.",
        },
        urls: ["https://en.wikipedia.org/x"],
      },
    ];
    const draft = await synthesize({
      identity: { full_name: "Patrick Mahomes", school: "Texas Tech", position: "QB", level: "pro" },
      results,
    });
    expect(draft.confirmed?.dob).toBe(true); // nflverse-sourced
    expect(draft.confirmed?.height_in).toBe(false); // wikipedia-sourced
    expect(draft.confirmed?.weight_lbs).toBe(false);
  });

  it("ignores failed scrapers entirely", async () => {
    const results: ScraperResult[] = [
      { source: "wikipedia", ok: false, reason: "blocked" },
      {
        source: "espn",
        ok: true,
        facts: { height_in: 72 },
        urls: ["https://www.espn.com/x"],
      },
    ];
    const draft = await synthesize({ identity, results });
    expect(draft.height_in).toBe(72);
    expect(draft.sources?.length).toBe(1);
  });

  it("preserves every school and applies school and pro team branding to preview discovery", async () => {
    const results: ScraperResult[] = [
      {
        source: "cfbverse",
        ok: true,
        facts: {
          school: "Oklahoma",
          schools: [
            { label: "Alabama", color: "#9E1B32", logo: "https://example.com/alabama.png" },
            { label: "Oklahoma", color: "#841617", logo: "https://example.com/oklahoma.png" },
          ],
        },
        urls: ["https://collegefootballdata.com"],
      },
      {
        source: "wikipedia",
        ok: true,
        facts: {
          bio_text: "A transfer athlete with a multi-team professional career.",
          pro_teams: ["Dallas Cowboys", "New York Giants"],
        },
        urls: ["https://en.wikipedia.org/wiki/Transfer_Athlete"],
      },
    ];

    const draft = await synthesize({
      identity: { full_name: "Transfer Athlete", school: "Oklahoma", level: "former" },
      results,
    });
    const preview = discoveryDraft({ full_name: "Transfer Athlete", school: "Oklahoma", level: "former" }, draft);

    expect(draft.schools?.map(school => school.label)).toEqual(["Alabama", "Oklahoma"]);
    expect(preview.schools).toEqual([
      { label: "Alabama", color: "#9E1B32", logo: "https://example.com/alabama.png" },
      { label: "Oklahoma", color: "#841617", logo: "https://example.com/oklahoma.png" },
    ]);
    expect(preview.pro_teams.map(team => team.label)).toEqual(["Dallas Cowboys", "New York Giants"]);
    expect(preview.pro_teams.every(team => team.color !== "#152238" && team.logo)).toBe(true);
  });

  it("reads ordered transfer stints from College Football Data and brands each school", async () => {
    const originalFetch = globalThis.fetch;
    const original = {
      cfbd: process.env.CFBD_API_KEY,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      key: process.env.SUPABASE_SERVICE_ROLE_KEY,
    };
    process.env.CFBD_API_KEY = "test-cfbd-key";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
    globalThis.fetch = (async input => {
      const url = new URL(String(input));
      if (url.hostname === "api.collegefootballdata.com") return new Response(JSON.stringify([{
        id: "4040715", name: "Jalen Hurts", team: "Oklahoma", position: "QB", height: 73, weight: 223,
        teamColor: "#841617", teamStints: [
          { team: "Alabama", startYear: 2015, endYear: 2018 },
          { team: "Oklahoma", startYear: 2019, endYear: 2019 },
        ],
      }]));
      if (url.pathname.endsWith("/cfb_teams")) return new Response(JSON.stringify([
        { display_name: "Alabama Crimson Tide", location: "Alabama", abbreviation: "ALA", mascot: "Crimson Tide", primary_color: "9E1B32", logo_url: "https://example.com/alabama.png", logo_dark_url: null },
        { display_name: "Oklahoma Sooners", location: "Oklahoma", abbreviation: "OU", mascot: "Sooners", primary_color: "841617", logo_url: "https://example.com/oklahoma.png", logo_dark_url: null },
      ]));
      throw new Error(`Unexpected request: ${url}`);
    }) as typeof fetch;

    try {
      const result = await scrapeCfbverse({ full_name: "Jalen Hurts", school: "Oklahoma", position: "QB", level: "former" });
      expect(result.ok).toBe(true);
      expect(result.facts?.schools).toEqual([
        { label: "ALA", name: "Alabama", color: "#9E1B32", logo: "https://example.com/alabama.png", start_year: 2015, end_year: 2018 },
        { label: "OU", name: "Oklahoma", color: "#841617", logo: "https://example.com/oklahoma.png", start_year: 2019, end_year: 2019 },
      ]);
      const draft = await synthesize({
        identity: { full_name: "Jalen Hurts", school: "Oklahoma", position: "QB", level: "former" },
        results: [{ source: "nflverse", ok: true, facts: { school: "Oklahoma" } }, result],
      });
      expect(draft.schools?.map(school => school.label)).toEqual(["ALA", "OU"]);
    } finally {
      globalThis.fetch = originalFetch;
      for (const [key, value] of Object.entries({ CFBD_API_KEY: original.cfbd, NEXT_PUBLIC_SUPABASE_URL: original.url, SUPABASE_SERVICE_ROLE_KEY: original.key })) {
        if (value === undefined) delete process.env[key]; else process.env[key] = value;
      }
    }
  });

  it("appends missing scraped teams when a saved preview already has one team", () => {
    const current = previewContent.parse({
      slug: "lavelle-hawkins",
      full_name: "Lavelle Hawkins",
      pro_teams: [{ label: "Tennessee Titans", color: "#4B92DB", logo: null }],
    });
    const suggestion = previewContent.parse({
      slug: "lavelle-hawkins",
      full_name: "Lavelle Hawkins",
      pro_teams: [
        "Tennessee Titans",
        "New England Patriots",
        "San Francisco 49ers",
        "San Diego Chargers",
        "Tampa Bay Buccaneers",
        "BC Lions",
      ].map(label => ({ label, color: "#1A3DCC", logo: null })),
    });

    expect(mergeSuggestions(current, suggestion).pro_teams.map(team => team.label)).toEqual([
      "Tennessee Titans",
      "New England Patriots",
      "San Francisco 49ers",
      "San Diego Chargers",
      "Tampa Bay Buccaneers",
      "BC Lions",
    ]);
  });

  it("retains at least ten career teams instead of truncating the history", async () => {
    const teams = Array.from({ length: 10 }, (_, index) => `Career Team ${index + 1}`);
    const draft = await synthesize({
      identity: { full_name: "Journeyman Player" },
      results: [{ source: "wikipedia", ok: true, facts: { pro_teams: teams } }],
    });
    expect(draft.pro_teams).toEqual(teams);
    expect(discoveryDraft({ full_name: "Journeyman Player" }, draft).pro_teams.map(team => team.label)).toEqual(teams);
  });

  it("returns Lavelle Hawkins' complete cross-league career and qualified NJCAA award", async () => {
    const originalFetch = globalThis.fetch;
    const search = { query: { search: [{ title: "Lavelle Hawkins", pageid: 123, snippet: "American football wide receiver" }] } };
    const summary = {
      extract: "Lavelle Hawkins is an American former professional football wide receiver selected by the Tennessee Titans.",
      description: "American football player",
      content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/Lavelle_Hawkins" } },
    };
    const article = `<html>
      <table class="infobox">
        <tr><th>Career history</th><td><ul>
          <li>Tennessee Titans (2008−2012)</li>
          <li>New England Patriots (2013)*</li>
          <li>San Francisco 49ers (2013)*</li>
          <li>San Diego Chargers (2013)</li>
          <li>Tampa Bay Buccaneers (2014)*</li>
          <li>BC Lions (2015)</li>
        </ul></td></tr>
        <tr><th>Awards and highlights</th><td><ul>
          <li>NJCAA All-American (2004)</li>
          <li>Second-team All-Pac-10 (2007)</li>
        </ul></td></tr>
      </table>
    </html>`;
    let call = 0;
    globalThis.fetch = (async () => {
      call++;
      return new Response(call === 1 ? JSON.stringify(search) : call === 2 ? JSON.stringify(summary) : article, {
        status: 200,
        headers: { "content-type": call < 3 ? "application/json" : "text/html" },
      });
    }) as typeof fetch;

    try {
      const result = await scrapeWikipedia({ full_name: "Lavelle Hawkins" });
      expect(result.ok).toBe(true);
      expect(result.facts?.pro_teams).toEqual([
        "Tennessee Titans",
        "New England Patriots",
        "San Francisco 49ers",
        "San Diego Chargers",
        "Tampa Bay Buccaneers",
        "BC Lions",
      ]);
      expect(result.facts?.awards).toEqual([
        expect.objectContaining({ name: "NJCAA All-American", year: "2004" }),
        expect.objectContaining({ name: "Second-team All-Pac-10", year: "2007" }),
      ]);
      const draft = await synthesize({ identity: { full_name: "Lavelle Hawkins" }, results: [result] });
      expect(discoveryDraft({ full_name: "Lavelle Hawkins" }, draft).pro_teams.at(-1)).toMatchObject({ label: "BC Lions", color: "#F15A22" });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
