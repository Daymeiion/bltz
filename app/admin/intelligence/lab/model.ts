import type { LabAthlete, LabGraphMoment, LabStatistic } from "@/lib/intelligence/lab-types";
import type { IntelligenceOpportunity, IntelligenceSignal } from "@/lib/intelligence/signals";
import type { WorkspaceAthleteSummary, WorkspaceResult } from "@/lib/intelligence/workspace-types";
import { safeSourceUrl, scalarStatistics } from "@/lib/intelligence/lab-format";

export type MediaItem = { id: string; title: string; kind: "video" | "interview" | "article" | "profile" | "photo" | "media"; publisher: string; date: string | null; url: string | null; imageUrl: string | null; origin?: "locker" | "getty" | "upload" | "link" };
/** Server-resolved Preview Locker media; signed URLs expire, so this is never persisted. */
export type LockerMedia = {
  state: "ready" | "none" | "unavailable";
  slug: string | null;
  photos: Array<{ id: string; title: string; url: string; credits: string | null; sourceUrl: string | null; level: string; season: string | null; isHeadshot: boolean }>;
  videos: Array<{ id: string; title: string; url: string | null; thumb: string | null; level: string | null }>;
};
export type Model = {
  athlete: LabAthlete | null;
  ready: boolean;
  signals: IntelligenceSignal[];
  opportunities: IntelligenceOpportunity[];
  watchlist: WorkspaceAthleteSummary[];
  moments: LabGraphMoment[];
  lastSeason: { season: string; team: string } | null;
  media: MediaItem[];
  asOf: string;
};

/** Year-only sorts mid-year and unknown dates sort last, so precision is never invented. */
export function momentSortKey(moment: LabGraphMoment): number {
  if (moment.datePrecision === "day" && moment.occurredOn) return Date.parse(`${moment.occurredOn}T00:00:00Z`);
  if (moment.datePrecision === "year" && moment.occurredYear) return Date.UTC(moment.occurredYear, 6, 1);
  return Number.POSITIVE_INFINITY;
}

/** Latest recorded season context; it is not a retirement or status claim. */
function lastSeason(athlete: LabAthlete): { season: string; team: string } | null {
  const rows = athlete.statistics.rows.filter(row => row.team?.trim()).sort((a, b) => a.season.localeCompare(b.season));
  const last = rows.at(-1);
  return last ? { season: last.season, team: last.team!.trim() } : null;
}

function mediaItems(data: WorkspaceResult): MediaItem[] {
  const items: MediaItem[] = [];
  const portrait = safeSourceUrl(data.profile?.portraitUrl ?? null);
  if (portrait && data.result.selected) items.push({ id: "portrait", title: `${data.result.selected.name} portrait`, kind: "photo", publisher: data.profile?.portraitSource ?? "Source not recorded", date: null, url: null, imageUrl: portrait });
  for (const row of data.media.rows) items.push({ id: `media:${row.model}:${row.id}`, title: row.title, kind: /video/i.test(row.kind) ? "video" : /photo|image/i.test(row.kind) ? "photo" : "media", publisher: row.source ?? "Source not recorded", date: null, url: safeSourceUrl(row.sourceUrl), imageUrl: safeSourceUrl(row.previewUrl) });
  for (const row of data.content.rows) items.push({ id: `content:${row.evidenceId}`, title: row.title, kind: row.contentType === "video" ? "video" : row.contentType === "interview" ? "interview" : row.contentType === "profile" ? "profile" : "article", publisher: row.publisher, date: row.publishedOn ?? row.releasedOn ?? null, url: safeSourceUrl(row.url), imageUrl: null });
  return items;
}

export function buildModel(data: WorkspaceResult): Model {
  const athlete = data.result.selected;
  const ready = athlete?.intelligenceState === "ready";
  const moments = [...(athlete?.moments.rows ?? [])].sort((a, b) => momentSortKey(a) - momentSortKey(b));
  return {
    athlete, ready, moments,
    signals: ready ? athlete!.intelligence.signals : [],
    opportunities: ready ? athlete!.intelligence.opportunities : [],
    watchlist: Array.from(new Map(data.directory.rows.map(row => [row.id, row])).values()),
    lastSeason: athlete ? lastSeason(athlete) : null,
    media: athlete ? mediaItems(data) : [],
    asOf: data.result.asOf,
  };
}

export function initials(name: string): string { return name.trim().split(/\s+/).slice(0, 2).map(part => part[0] ?? "").join("").toUpperCase(); }
export function human(value: string): string { return value.replace(/_/g, " ").replace(/^./, letter => letter.toUpperCase()); }
/** Sentence end = terminal punctuation not after an abbreviation like "vs." or "St.". */
export function firstSentence(value: string): string {
  const match = /^.*?(?<!\b(?:vs|St|Jr|Sr|No|Mt|U\.S))[.!?](?=["”)]?\s|["”)]?$)/.exec(value);
  return match ? match[0].trim() : value;
}
export function dayLabel(value: string | null | undefined): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}
export function daysBetween(from: string, to: string): number | null {
  const a = Date.parse(`${from}T00:00:00Z`), b = Date.parse(`${to}T00:00:00Z`);
  return Number.isFinite(a) && Number.isFinite(b) ? Math.round((b - a) / 86_400_000) : null;
}
/** When stat chips already show the numbers, describe the occurrence instead of repeating them. */
export function momentSummary(moment: LabGraphMoment): string {
  const occurrence = moment.evidence.find(row => row.factType === "moment_occurrence")?.statement;
  const performance = moment.evidence.find(row => row.factType === "performance")?.statement;
  const text = performanceStats(moment).length ? occurrence ?? performance : performance ?? occurrence;
  return firstSentence(text ?? moment.evidence[0]?.statement ?? "Description not recorded.");
}
/** Numeric source-reported statistics only; identifiers and review metadata stay out. */
export function performanceStats(moment: LabGraphMoment): [string, string][] {
  const seen = new Set<string>();
  return moment.evidence.filter(row => row.factType === "performance").flatMap(row => {
    const stats = row.data.statistics && typeof row.data.statistics === "object" && !Array.isArray(row.data.statistics) ? row.data.statistics as Record<string, unknown> : row.data;
    return scalarStatistics(stats);
  }).filter(([key, value]) => !/review|rights|license|significance|fact.?type|version|date|source|url|provider|player|moment|status|method|confidence|team|opponent|sport|season|precision|(?:^|[ /_])id(?:$|[ /_])/i.test(key) && value.trim() !== "" && Number.isFinite(Number(value)) && Number(value) !== 0)
    .filter(([key]) => !seen.has(key) && Boolean(seen.add(key))).slice(0, 6).map(([key, value]) => [key.replace(/_/g, " "), value]);
}
export function seasonStats(row: LabStatistic): [string, string][] {
  return scalarStatistics(row.stats).filter(([, value]) => Number.isFinite(Number(value)) && Number(value) !== 0).slice(0, 4).map(([key, value]) => [key.replace(/_/g, " "), value]);
}
