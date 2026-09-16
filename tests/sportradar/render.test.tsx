import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { StructuredStats } from "@/components/player/StructuredStats";
import { readStructuredStats } from "@/lib/player/structured-stats";
import type { SupabaseClient } from "@supabase/supabase-js";
describe("stored statistics rendering", () => {
  it("keeps a collapsed college season table visible before statistics are imported", () => {
    const html = renderToStaticMarkup(<StructuredStats records={[]} />);
    expect(html).toContain("College Football");
    expect(html).toContain("Season data pending");
    expect(html).toContain("College football season statistics have not been added yet.");
    expect(html).toContain('scope="col"');
    expect(html).not.toContain("Source: Sportradar");
    expect(html).not.toMatch(/<details[^>]*\sopen(?:=|>)/);
  });
  it("retains the college empty state when only NFL statistics are available", () => {
    const html = renderToStaticMarkup(<StructuredStats records={[{ league: "nfl", source: "Sportradar", syncedAt: "2026-09-10", seasons: [] }]} />);
    expect(html).toContain("College football season statistics have not been added yet.");
    expect(html).toContain("NFL statistics");
  });
  it("renders one shared NFL/NCAA view with provenance and separate phases", () => {
    const seasons = [{ year: 2023, seasonType: "REG" as const, team: "Test Team", providerTeamId: "team", position: "DE", gamesPlayed: 17, gamesStarted: 16, statistics: { sacks: 7.5 } }];
    const html = renderToStaticMarkup(<StructuredStats records={[{ league: "nfl", source: "Sportradar", syncedAt: "2026-09-10", seasons }, { league: "ncaafb", source: "Sportradar", syncedAt: "2026-09-10", seasons }]} />);
    expect(html).toContain("NCAA Football"); expect(html).toContain("NFL"); expect(html).toContain("7.5");
    expect(html).toContain("Source: Sportradar"); expect(html).not.toContain("Passing yards");
  });
  it("returns empty stats on storage failure without an external request", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    const db = { from: () => { throw new Error("unavailable"); } } as unknown as SupabaseClient;
    expect(await readStructuredStats(db,"player")).toEqual([]); expect(fetch).not.toHaveBeenCalled(); fetch.mockRestore();
  });
});
