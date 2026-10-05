/** Curated research observations, dated explicitly; never live athlete metrics. */
export const TRIAL_WINDOW = { confirmedOn: "2026-09-30", daysConfirmed: 10, planningDeadline: "2026-10-10", authority: "Founder-corrected deadline" } as const;
export const RESEARCH_CAPTURED_AT = "2026-10-01T03:56:26.000Z";
export const RESEARCH_ATHLETE = { id: "c5dae871-a277-4256-9a0c-17a40940ad3f", name: "Keith Rivers", school: "USC", position: "Linebacker" };

export type FindingState = "observed" | "documented" | "blocked" | "not_implemented";
export const FINDINGS: Array<{ id: string; title: string; state: FindingState; detail: string; evidence: string; next: string; href?: string }> = [
  { id: "identity", title: "Athlete identity", state: "observed", detail: "One reviewed Sportradar mapping links to a canonical BLTZ Career ID. Two imported Keith Rivers profile snapshots are available.", evidence: "Existing verified mapping and saved profile snapshots · observed September 30", next: "Compare provider identity against a second source; keep ambiguous matches in review." },
  { id: "career", title: "Career & season context", state: "observed", detail: "Stored profiles span 2008–2015. Dallas' official July 30, 2015 report establishes retirement; 2014 is Keith's last regular-season context in the sample.", evidence: "Stored profile snapshots and official Dallas retirement report", next: "Keep final playing season separate from retirement date and label incomplete career coverage.", href: "https://www.dallascowboys.com/news/r-mcclain-mcfadden-placed-on-pup-list-to-start-camp-keith-rivers-retires-380591" },
  { id: "catalog", title: "Historical depth", state: "observed", detail: "The live NFL catalog listed seasons from 2000 through 2026. Listing a year does not prove detailed feed coverage.", evidence: "NFL Seasons · HTTP 200 · September 30, 11:29 a.m. Pacific", next: "Test one historical schedule and a game before crediting event-level coverage.", href: "https://developer.sportradar.com/football/reference/nfl-seasons" },
  { id: "game", title: "Games & performances", state: "observed", detail: "The paced 2014 schedule, game statistics and play-by-play probe succeeded. Keith's Bills–Bears game on September 7, 2014 records 3 tackles, 1 assist and 4 combined tackles. A 2000 schedule and sampled game-statistics feed also returned HTTP 200.", evidence: "Five reserved calls · HTTP 200 · September 30, 8:56 p.m. Pacific", next: "Review exact source pointers before promoting game/performance evidence. One 2000 sample does not guarantee every historical field.", href: "https://developer.sportradar.com/football/reference/nfl-game-statistics" },
  { id: "play", title: "Moment contribution", state: "observed", detail: "The sampled 2014 play-by-play contains explicit Keith Rivers references across 9 unique plays. Eighteen nested matches are not eighteen plays or contributions.", evidence: "Stored sampled game play-by-play · exact athlete-ID matches", next: "Review each action and role; athlete participation does not establish ownership, licensing rights or economic participation." },
  { id: "throttle", title: "Request pacing & HTTP 429", state: "observed", detail: "The controlled probe used global-ledger checks and a 2.5-second minimum gap; actual request starts were about 3.4 seconds apart. All five calls succeeded. The earlier 429's precise cause remains unknown.", evidence: "Successful paced probe; founder reports 1% rolling quota usage", next: "Keep quota separate from QPS. Honor Retry-After and the shared cooldown, and stop after bounded failure instead of repeated retries.", href: "https://developer.sportradar.com/football/docs/football-ig-account-maintenance" },
  { id: "content", title: "Career & post-career content", state: "observed", detail: "USC's October 7, 2006 postgame report names Keith Rivers. A 2021 interview and a 2025 publisher-linked video provide post-career context. The 20-year USC anniversary falls before the October 10 deadline.", evidence: "Official USC report; identity-matched post-career publisher sources", next: "Keep publication, video release, described event and fetched dates separate. Unknown YouTube upload dates stay unknown.", href: "https://usctrojans.com/news/2006/10/7/USC_vs_Washington_Quotes_10_7_2006" },
  { id: "media", title: "Moment-to-media evidence", state: "documented", detail: "Existing athlete media metadata can be inspected. Verified Moment links, media coverage and usage clearance are not established.", evidence: "Repository media audit · legacy associations", next: "Prepare a small manual media-to-Moment review sample; appearance must not imply contribution or rights." },
  { id: "sources", title: "Additional sources", state: "not_implemented", detail: "Sports Reference uses a reviewed CFB CSV workflow. No Jivly ingestion was found in the repository.", evidence: "Pipeline audit · September 30", next: "Define provider adapters around the shared candidate and source contracts." },
];

export const COOLDOWN_WORK = [
  { title: "Make findings inspectable", detail: "Expose tested coverage, blockers, sources and the next evidence needed in the existing Lab.", state: "Implemented in this view" },
  { title: "Prepare source review", detail: "Specify exact-date evidence, athlete matching and rejected/ambiguous candidate handling before importing real Moments.", state: "Contract prepared" },
  { title: "Validate the intelligence display", detail: "Use a separate illustrative case to demonstrate Moment → evidence → Signal → Opportunity without creating athlete records.", state: "Display example available" },
] as const;

export const TRIAL_PLAN = [
  { window: "September 30–October 2", title: "Resolve access & collect a representative sample", detail: "Diagnose request rate separately from rolling quota, then test historical schedules and athlete-confirmed game statistics. Retain sourced news and interviews while provider access is limited." },
  { window: "October 3–5", title: "Normalize & review real Moments", detail: "Preserve source pointers and date precision. Separate content publication dates from described events, and career-era coverage from post-career content." },
  { window: "October 6–8", title: "Run rules against reviewed evidence", detail: "Evaluate supported anniversary, milestone and content conditions; record false positives and missing facts. Associate media only where the relationship is supported." },
  { window: "October 9–10", title: "Preserve the learning & make the provider decision", detail: "Inspect the real evidence → Signal → Opportunity chain in the Lab. Preserve reproducible results and coverage gaps, and review Opportunity usefulness before deciding whether to retain the provider." },
] as const;

export function trialWindowAt(now: string) {
  const date = new Date(now);
  if (!Number.isFinite(date.getTime())) throw new Error("invalid_research_clock");
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)!.value;
  const today = `${part("year")}-${part("month")}-${part("day")}`;
  const daysRemaining = Math.max(0, Math.round((Date.parse(TRIAL_WINDOW.planningDeadline) - Date.parse(today)) / 86_400_000));
  return { ...TRIAL_WINDOW, today, daysRemaining };
}

export type ResearchCooldown = { state: "active" | "elapsed" | "clear" | "unavailable"; until: string | null; lastRateLimitAt: string | null };
export type ResearchViewData = { checkedAt: string; trial: ReturnType<typeof trialWindowAt>; cooldown: ResearchCooldown };
export function cooldownAt(requestedAt: string | null, now: string): ResearchCooldown {
  if (!requestedAt) return { state: "clear", until: null, lastRateLimitAt: null };
  const instant = Date.parse(requestedAt);
  if (!Number.isFinite(instant) || !Number.isFinite(Date.parse(now))) return { state: "unavailable", until: null, lastRateLimitAt: null };
  const until = new Date(instant + 3_600_000).toISOString();
  return { state: Date.parse(until) > Date.parse(now) ? "active" : "elapsed", until, lastRateLimitAt: requestedAt };
}

export function intelligenceView(value: unknown, hasAthleteContext = false): "findings" | "athlete" | "example" {
  return value === "athlete" || value === "example" || value === "findings" ? value : hasAthleteContext ? "athlete" : "findings";
}
