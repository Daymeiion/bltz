/**
 * Shared types for the onboarding pipeline. These are the only things the
 * SSE consumer (client) and the run orchestrator (server) need to agree on.
 */

export type PipelineStatus =
  | "pending"
  | "scraping"
  | "generating"
  | "complete"
  | "error"
  | "manual";

export type ScraperSource =
  | "nflverse"
  | "wikipedia"
  | "espn"
  | "youtube"
  | "college_roster"
  | "nfl_team"
  | "founder_archive";

export interface PipelineEvent {
  /** ISO timestamp */
  at: string;
  /** Lifecycle phase. The client uses this to update copy + animation. */
  phase:
    | "queued"
    | "scrape_started"
    | "scrape_hit"
    | "scrape_miss"
    | "scrape_done"
    | "synthesis_started"
    | "synthesis_done"
    | "complete"
    | "manual_fallback"
    | "error";
  /** User-facing one-line copy. Keep founder vocab. */
  message: string;
  /** Optional source the event refers to. */
  source?: ScraperSource;
  /** Optional URL discovered or visited. */
  url?: string;
}

export interface PlayerIdentityInput {
  full_name: string;
  school?: string | null;
  position?: string | null;
  level?: "hs" | "college" | "pro" | "former" | null;
  /**
   * Cohort hint for disambiguation when multiple athletes share a name —
   * "graduation year" or "draft year".
   */
  cohort_year?: number | null;
}

export interface ScrapedAward {
  name: string;
  year?: string;
  organization?: string;
  source_url: string;
  evidence_quote?: string;
}

export interface ScraperResult {
  source: ScraperSource;
  ok: boolean;
  /** When ok = false: reason ("blocked","timeout","not_found"). */
  reason?: string;
  /** Free-form facts the scraper extracted. */
  facts?: Partial<{
    full_name: string;
    dob: string; // YYYY-MM-DD
    height_in: number;
    weight_lbs: number;
    games_played: number;
    position: string;
    school: string;
    hometown: string;
    pro_teams: string[];
    bio_text: string;
    awards: ScrapedAward[];
    youtube_urls: string[];
    photos: { url: string; credits?: string; width?: number; height?: number }[];
  }>;
  /** Raw URLs visited so we can show provenance to the athlete. */
  urls?: string[];
}

export interface PipelineDraft {
  full_name: string;
  bio: string;
  dob?: string | null;
  height_in?: number | null;
  weight_lbs?: number | null;
  games_played?: number | null;
  position?: string | null;
  level?: PlayerIdentityInput["level"];
  school?: string | null;
  hometown?: string | null;
  pro_teams?: string[];
  awards: ScrapedAward[];
  youtube_urls: string[];
  photos: { url: string; credits?: string; width?: number; height?: number }[];
  /** Per-field flag — true if a human source backed it up; numeric stats from
   * scrapers default to false until the athlete confirms during Review. */
  confirmed: Partial<Record<string, boolean>>;
  /** Provenance summary for ClaimRecap and the Review trust badges. */
  sources: { url: string; source: ScraperSource }[];
}
