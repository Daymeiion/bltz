/**
 * Scraper registry. Each scraper takes a `PlayerIdentityInput` and returns
 * a `ScraperResult`. The orchestrator (`run.ts`) drives them in parallel
 * with a concurrency cap and emits one event per scraper result.
 */

import type { PlayerIdentityInput, ScraperResult } from "../types";
import { scrapeWikipedia } from "./wikipedia";
import { scrapeYouTube } from "./youtube";
import { scrapeESPN } from "./espn";

export type Scraper = (
  identity: PlayerIdentityInput,
) => Promise<ScraperResult>;

/** Default registry. Order matters only for friendly log-line ordering. */
export const SCRAPERS: { source: ScraperResult["source"]; run: Scraper }[] = [
  { source: "wikipedia", run: scrapeWikipedia },
  { source: "espn", run: scrapeESPN },
  { source: "youtube", run: scrapeYouTube },
];

export { scrapeWikipedia, scrapeYouTube, scrapeESPN };
