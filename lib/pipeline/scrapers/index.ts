/**
 * Scraper registry. Each scraper takes a `PlayerIdentityInput` and returns
 * a `ScraperResult`. The orchestrator (`run.ts`) drives them in parallel
 * with a concurrency cap and emits one event per scraper result.
 */

import type { PlayerIdentityInput, ScraperResult } from "../types";
import { scrapeNflverse } from "./nflverse";
import { scrapeCfbverse } from "./cfbverse";
import { scrapeWikipedia } from "./wikipedia";
import { scrapeYouTube } from "./youtube";
import { scrapeESPN } from "./espn";

export type Scraper = (
  identity: PlayerIdentityInput,
) => Promise<ScraperResult>;

/**
 * Default registry. Order matters: synthesis uses first-non-null-wins per
 * field (see `pickFacts` in claude.ts), so high-trust structured sources
 * go first.
 *
 *   nflverse  — authoritative NFL roster (24,740 players, current + historical)
 *   cfbverse  — authoritative D1 college roster cache (CFBD-sourced)
 *   wikipedia — biographical prose (bio_text, awards)
 *   espn      — structured fallback for any athlete (live API)
 *   youtube   — highlight videos
 */
export const SCRAPERS: { source: ScraperResult["source"]; run: Scraper }[] = [
  { source: "nflverse", run: scrapeNflverse },
  { source: "cfbverse", run: scrapeCfbverse },
  { source: "wikipedia", run: scrapeWikipedia },
  { source: "espn", run: scrapeESPN },
  { source: "youtube", run: scrapeYouTube },
];

export { scrapeNflverse, scrapeCfbverse, scrapeWikipedia, scrapeYouTube, scrapeESPN };
