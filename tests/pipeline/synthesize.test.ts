import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { synthesize } from "@/lib/pipeline/claude";
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
    expect(draft.bio).toMatch(/Daymeion Hughes/);
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
});
