import "server-only";

import { z } from "zod";
import { loadIntelligenceLabUnchecked } from "@/lib/intelligence/lab-server";
import type { LabAthlete } from "@/lib/intelligence/lab-types";
import type { OrganizationContext } from "@/lib/organization/types";
import { createServiceClient } from "@/lib/supabase/service";
import { socialPlatformMatches } from "@/lib/preview-lockers/social";
import { signalHeadline } from "@/lib/intelligence/signal-copy";
import { safeSourceUrl, scalarStatistics } from "@/lib/intelligence/lab-format";
import { contentItemsFromEvidence } from "@/lib/intelligence/content";
import type { SignalEvidence } from "@/lib/intelligence/signals/types";
import type { GraphEvidence } from "@/lib/intelligence/contracts";
import { loadSchoolRoster } from "./former-players";
import type { AthleteFile, PilotPlayer, ResearchSource } from "./types";

export type SchoolAthlete = {
  player: PilotPlayer;
  lab: LabAthlete | null;
  evaluatedAt: string;
  socialLinks: Array<{ platform: string; handle: string; url: string }>;
};

const socialEntry = z.object({ platform: z.string(), handle: z.string().catch(""), sourceUrl: z.string() }).passthrough();

async function lockerSocialLinks(playerId: string): Promise<SchoolAthlete["socialLinks"]> {
  const { data } = await createServiceClient().from("preview_lockers").select("social").eq("player_id", playerId).limit(2);
  if (!Array.isArray(data) || data.length !== 1) return [];
  const entries = z.array(z.unknown()).catch([]).parse((data[0] as { social?: unknown }).social);
  const seen = new Set<string>();
  return entries.flatMap((entry) => {
    const parsed = socialEntry.safeParse(entry);
    if (!parsed.success || !socialPlatformMatches(parsed.data.platform, parsed.data.sourceUrl)) return [];
    const key = `${parsed.data.platform}:${parsed.data.handle}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ platform: parsed.data.platform, handle: parsed.data.handle, url: parsed.data.sourceUrl }];
  }).slice(0, 8);
}

/**
 * One former player's intelligence file, only when the player belongs to the
 * requesting school. Caller must have authorized `intelligence.read`.
 */
export async function loadSchoolAthlete(context: OrganizationContext, playerId: string): Promise<SchoolAthlete | null> {
  const roster = await loadSchoolRoster(context);
  const player = roster.players.find((row) => row.id === playerId);
  if (!player) return null;
  const [lab, socialLinks] = await Promise.all([
    loadIntelligenceLabUnchecked({ athlete: playerId }),
    lockerSocialLinks(playerId).catch(() => []),
  ]);
  return { player, lab: lab.selected, evaluatedAt: lab.evaluatedAt ?? `${lab.asOf}T23:59:59.999Z`, socialLinks };
}

const OPPORTUNITY_LABEL: Record<string, string> = {
  anniversary_retrospective_review: "Anniversary retrospective",
  career_milestone_review: "Career milestone feature",
  birthday_greeting_review: "Birthday shout-out",
};
const STAT_LABELS: Record<string, string> = {
  passing_yards: "pass yds", rushing_yards: "rush yds", receiving_yards: "rec yds", receptions: "rec",
  passing_tds: "pass TD", rushing_tds: "rush TD", receiving_tds: "rec TD", sacks: "sacks", interceptions: "INT", tackles: "tackles",
};

function seasonLine(stats: Record<string, unknown>): string {
  const pairs = scalarStatistics(stats).filter(([key, value]) => STAT_LABELS[key] && Number(value) > 0).slice(0, 3);
  return pairs.map(([key, value]) => `${value} ${STAT_LABELS[key]}`).join(" · ");
}

/** One row per distinct source, with a safe link when the source has one. */
function sourcesOf(evidence: readonly SignalEvidence[]): ResearchSource[] {
  const seen = new Set<string>();
  return evidence.flatMap((row) => {
    const url = safeSourceUrl(row.sourceUrl ?? row.sourceLocator);
    const key = `${row.sourceLabel}|${url ?? ""}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ label: row.sourceLabel, url, note: row.assertion.slice(0, 300) }];
  }).slice(0, 6);
}

/** Source-reported game numbers for one Moment, labeled like the season lines. */
function momentStats(evidence: readonly GraphEvidence[]): Array<{ label: string; value: string }> {
  const seen = new Set<string>();
  return evidence.filter((row) => row.factType === "performance").flatMap((row) => {
    const stats = row.data.statistics && typeof row.data.statistics === "object" && !Array.isArray(row.data.statistics) ? row.data.statistics as Record<string, unknown> : row.data;
    return scalarStatistics(stats);
  }).flatMap(([key, value]) => {
    const label = STAT_LABELS[key];
    if (!label || !(Number(value) > 0) || seen.has(label)) return [];
    seen.add(label);
    return [{ label, value }];
  }).slice(0, 6);
}

/** The Moment's reviewed sources, one per source, linked when the source has a safe address. */
function momentSources(evidence: readonly GraphEvidence[]): ResearchSource[] {
  const seen = new Set<string>();
  return evidence.flatMap((row) => {
    const url = safeSourceUrl(row.source.locator);
    const key = `${row.source.name}|${url ?? ""}`;
    if (row.status === "rejected" || seen.has(key)) return [];
    seen.add(key);
    return [{ label: row.source.name, url, note: row.statement.slice(0, 300) }];
  }).slice(0, 6);
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Projects the Lab read into what the school workspace renders; no raw evidence or provider data. */
export function toAthleteFile(athlete: SchoolAthlete): AthleteFile {
  const lab = athlete.lab;
  const ready = lab?.intelligenceState === "ready";
  return {
    player: athlete.player,
    state: ready ? "ready" : "incomplete",
    evaluatedAt: athlete.evaluatedAt,
    signals: ready ? lab!.intelligence.signals.map((signal) => ({
      key: signal.key, momentId: signal.momentId, headline: signalHeadline(signal), explanation: signal.explanation,
      targetDate: signal.targetDate, daysUntil: signal.daysUntil, verdict: signal.verdict, priority: signal.score,
      confidence: signal.confidence, sources: signal.evidence.length,
      type: signal.type === "birthday" ? "birthday" as const : signal.type === "career_milestone" ? "milestone" as const : "anniversary" as const,
      years: signal.type === "birthday" ? numberOrNull(signal.data.age) : numberOrNull(signal.data.anniversaryYears),
      evidence: sourcesOf(signal.evidence),
    })) : [],
    opportunities: ready ? lab!.intelligence.opportunities
      .filter((opportunity) => lab!.intelligence.signals.find((signal) => opportunity.signalKeys.includes(signal.key))?.verdict !== "upcoming")
      .map((opportunity) => ({ key: opportunity.key, label: OPPORTUNITY_LABEL[opportunity.type] ?? "Opportunity", explanation: opportunity.explanation, strength: opportunity.strength, signalKeys: opportunity.signalKeys })) : [],
    moments: (lab?.moments.rows ?? []).filter((moment) => moment.status !== "rejected").map((moment) => ({
      id: moment.id, title: moment.title,
      date: moment.datePrecision === "day" ? moment.occurredOn : moment.occurredYear ? String(moment.occurredYear) : null,
      status: moment.status, sources: moment.evidence.length,
      stats: momentStats(moment.evidence), sourceLinks: momentSources(moment.evidence),
    })),
    seasons: (lab?.statistics.rows ?? [])
      .map((row) => ({ id: row.id, season: row.season, team: row.team, line: seasonLine(row.stats) }))
      .filter((row) => row.line).slice(-12).reverse(),
    socialLinks: athlete.socialLinks,
    // Only verified coverage reaches schools; unconfirmed identity matches stay in the Lab.
    research: contentItemsFromEvidence(lab?.evidence.rows ?? []).filter((item) => item.status === "verified").slice(0, 12).map((item) => ({
      id: item.evidenceId, title: item.title, url: item.url, publisher: item.publisher, type: item.contentType,
      date: item.publishedOn ?? item.releasedOn, aboutDate: item.describedEventOn,
    })),
  };
}
