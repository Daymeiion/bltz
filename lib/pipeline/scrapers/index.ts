/**
 * Scraper registry. Each scraper takes a `PlayerIdentityInput` and returns
 * a `ScraperResult`. The orchestrator (`run.ts`) drives them in parallel
 * with a concurrency cap and emits one event per scraper result.
 */

import type { PlayerIdentityInput, ScraperResult } from "../types";
import { scrapeNflverse } from "./nflverse";
import { scrapeWikipedia } from "./wikipedia";
import { scrapeYouTube } from "./youtube";
import { scrapeESPN } from "./espn";

export type Scraper = (
  identity: PlayerIdentityInput,
) => Promise<ScraperResult>;

/**
 * Default registry. Order matters: synthesis uses first-non-null-wins per
 * field (see `pickFacts` in claude.ts), so high-trust structured sources
 * go first. nflverse has authoritative HW/DOB/position/college for every
 * NFL player, so it seeds the facts before the prose scrapers fill gaps.
 */
export const SCRAPERS: { source: ScraperResult["source"]; run: Scraper }[] = [
  { source: "nflverse", run: scrapeNflverse },
  { source: "wikipedia", run: scrapeWikipedia },
  { source: "espn", run: scrapeESPN },
  { source: "youtube", run: scrapeYouTube },
];

export { scrapeNflverse, scrapeWikipedia, scrapeYouTube, scrapeESPN };
