import { isMomentDismissed, isSignalDismissed, type Dismissal } from "./dismissals-shared";
import { LOCKER_PLACEMENTS, type BriefFacts } from "./briefs-shared";
import { toFileSignal, type SchoolSignal } from "./school-signals-shared";
import { mediaSignals, summarizeReach, type AthleteFile, type PilotActivation, type PilotAthleteMedia, type PilotSocialReach } from "./types";

export type BriefSources = {
  schoolName: string;
  origin: string;
  file: AthleteFile;
  activations: readonly PilotActivation[];
  reach: readonly PilotSocialReach[];
  media: readonly PilotAthleteMedia[];
  schoolSignals: readonly SchoolSignal[];
  dismissals: readonly Dismissal[];
  partners?: ReadonlyArray<{ name: string; note: string | null }>;
  now?: Date;
};

/** A headshot the brand can load: same-site paths become absolute; anything but https is dropped. */
function publicImage(url: string | null, origin: string): string | null {
  if (!url) return null;
  if (url.startsWith("/")) return `${origin}${url}`;
  return url.startsWith("https://") ? url : null;
}

/**
 * Everything a partnership brief states as fact, from the school's own workspace.
 * Leaves out private contact details, unverified Moments and anything the school dismissed.
 */
export function buildBriefFacts(sources: BriefSources): BriefFacts {
  const { file, origin, dismissals } = sources;
  const now = sources.now ?? new Date();
  const player = file.player;
  const totals = summarizeReach(sources.activations);
  const posted = sources.activations.filter((row) => row.status === "posted");
  const businesses = sources.media.filter((item) => item.kind === "business" && item.reviewStatus !== "rejected");
  const signals = [...file.signals, ...mediaSignals(sources.media, now), ...sources.schoolSignals.flatMap((row) => toFileSignal(row, now) ?? [])]
    .filter((signal) => !isSignalDismissed(signal, dismissals) && signal.verdict !== "upcoming")
    .sort((a, b) => a.daysUntil - b.daysUntil);
  const seen = new Set<string>();
  const brands = [...businesses.map((item) => ({ name: item.title, note: item.description })), ...(sources.partners ?? [])]
    .filter((brand) => { const key = brand.name.trim().toLowerCase(); if (seen.has(key)) return false; seen.add(key); return true; });

  return {
    generatedAt: now.toISOString(),
    school: { name: sources.schoolName },
    athlete: {
      name: player.name, position: player.position, team: player.team,
      portraitUrl: publicImage(player.portraitUrl, origin), lockerUrl: `${origin}${player.lockerHref}`,
    },
    highlights: file.moments
      .filter((moment) => moment.status === "verified" && !isMomentDismissed(moment.id, dismissals))
      .slice(0, 4)
      .map((moment) => ({ title: moment.title, date: moment.date, stats: (moment.stats ?? []).slice(0, 3) })),
    seasons: file.seasons.slice(0, 3).map((row) => ({ season: row.season, team: row.team, line: row.line })),
    reach: {
      followers: sources.reach.map((row) => ({ platform: row.platform, handle: row.handle, followers: row.followers })),
      totalFollowers: sources.reach.reduce((sum, row) => sum + row.followers, 0),
      activationsPosted: posted.length,
      impressions: totals.impressions,
      engagements: totals.engagements,
      lockerVisits: totals.visits,
    },
    brands,
    channels: {
      locker: LOCKER_PLACEMENTS,
      planned: sources.activations.filter((row) => row.status === "planned").slice(0, 5).map((row) => ({ title: row.title, kind: row.kind, dueOn: row.dueOn })),
      upcoming: signals.slice(0, 4).map((signal) => ({ headline: signal.headline, targetDate: signal.targetDate })),
    },
    coverage: (file.research ?? []).slice(0, 3).map((item) => ({ title: item.title, publisher: item.publisher, url: item.url, date: item.date })),
  };
}

/** Pitch sections without AI, built only from the facts; the template and the "write it myself" path use it. */
export function plainNarrative(facts: BriefFacts, brandName: string, goal: string | null): { headline: string; summary: string; fit: string; ideas: Array<{ title: string; channel: string; timing: string; description: string }> } {
  const first = facts.athlete.name.split(/\s+/)[0];
  const next = facts.channels.upcoming[0];
  return {
    headline: `${facts.athlete.name} × ${brandName}`,
    summary: `${facts.athlete.name}${facts.athlete.position ? `, ${facts.athlete.position}` : ""}${facts.athlete.team ? ` (${facts.athlete.team})` : ""}, is a former ${facts.school.name} player with a live fan Locker.`,
    fit: goal ? `${brandName} is looking for: ${goal}` : `Tell ${brandName} why ${first} is the right partner.`,
    ideas: next ? [{ title: `Partner on "${next.headline}"`, channel: "Fan Locker and school social", timing: next.targetDate, description: `A presented-by moment around ${next.headline.toLowerCase()}.` }] : [],
  };
}
