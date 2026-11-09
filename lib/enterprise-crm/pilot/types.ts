import { signalVerdict } from "@/lib/intelligence/signals/evaluate";
import type { SignalVerdict } from "@/lib/intelligence/signals/types";

/** A former player of the pilot school, as the workspace shows them. */
export interface PilotPlayer {
  id: string;
  name: string;
  position: string | null;
  team: string | null;
  portraitUrl: string | null;
  /** The fan-facing Locker every player gets. */
  lockerHref: string;
  next: {
    headline: string;
    targetDate: string;
    daysUntil: number;
    verdict: SignalVerdict;
  } | null;
  signalCount: number;
}

export interface PilotRoster {
  state: "ready" | "unavailable";
  players: PilotPlayer[];
}

export const ACTIVATION_KINDS = ["post", "video", "article", "campaign", "event"] as const;
export type ActivationKind = (typeof ACTIVATION_KINDS)[number];

export const ACTIVATION_CHANNELS = ["instagram", "x", "facebook", "linkedin", "tiktok", "youtube", "email", "website", "in_person", "other"] as const;
export type ActivationChannel = (typeof ACTIVATION_CHANNELS)[number];

export const SOCIAL_PLATFORMS = ["instagram", "x", "facebook", "linkedin", "tiktok", "youtube"] as const;
export type SocialPlatformKey = (typeof SOCIAL_PLATFORMS)[number];

/** Something the school plans or posts about a former player, and how far it went. */
export interface PilotActivation {
  id: string;
  playerId: string;
  playerName: string | null;
  kind: ActivationKind;
  title: string;
  brief: string | null;
  signalKey: string | null;
  momentId: string | null;
  dueOn: string | null;
  status: "planned" | "posted" | "cancelled";
  channel: ActivationChannel | null;
  postUrl: string | null;
  postedAt: string | null;
  impressions: number | null;
  engagements: number | null;
  /** Fan visits to the Locker through this activation's tracked link. */
  visits: number;
  /** Everyone featured, lead athlete first. */
  athletes: Array<{ id: string; name: string; portraitUrl: string | null }>;
  /** Video, photos and Getty media attached to the activation. */
  media: PilotAthleteMedia[];
  trackedHref: string;
  createdAt: string;
}

export interface PilotSocialReach {
  platform: SocialPlatformKey;
  handle: string | null;
  followers: number;
  recordedAt: string;
}

export interface PilotReachSummary {
  posted: number;
  planned: number;
  impressions: number;
  engagements: number;
  visits: number;
}

export function summarizeReach(activations: readonly PilotActivation[]): PilotReachSummary {
  return activations.reduce<PilotReachSummary>((total, row) => ({
    posted: total.posted + (row.status === "posted" ? 1 : 0),
    planned: total.planned + (row.status === "planned" ? 1 : 0),
    impressions: total.impressions + (row.impressions ?? 0),
    engagements: total.engagements + (row.engagements ?? 0),
    visits: total.visits + row.visits,
  }), { posted: 0, planned: 0, impressions: 0, engagements: 0, visits: 0 });
}

/** One reviewed record behind a signal (a stats feed, a box score, the Locker record). */
export type ResearchSource = { label: string; url: string | null; note: string };

/** A verified article, interview, video, podcast or profile about the athlete, from BLTZ research. */
export type ResearchItem = {
  id: string;
  title: string;
  url: string;
  publisher: string;
  type: "article" | "interview" | "video" | "podcast" | "profile";
  /** Published or released. */
  date: string | null;
  /** The day the piece is about, when recorded (a game, a ceremony). */
  aboutDate: string | null;
};

export type SignalSubject = "birthday" | "anniversary" | "milestone" | "business" | "school_media";

/** The serializable slice of the Intelligence engine a school sees for one athlete. */
export interface AthleteFile {
  player: PilotPlayer;
  state: "ready" | "incomplete";
  evaluatedAt: string;
  signals: Array<{
    key: string;
    momentId: string | null;
    headline: string;
    explanation: string;
    targetDate: string;
    daysUntil: number;
    verdict: SignalVerdict;
    priority: number;
    confidence: number;
    sources: number;
    /** What the date is about, so suggestions can fit it. Absent on older payloads. */
    type?: SignalSubject;
    /** Age for a birthday, years since for an anniversary. */
    years?: number | null;
    /** The reviewed records behind this date. */
    evidence?: ResearchSource[];
  }>;
  opportunities: Array<{ key: string; label: string; explanation: string; strength: number; signalKeys: string[] }>;
  moments: Array<{
    id: string; title: string; date: string | null; status: string; sources: number;
    /** Source-reported numbers from the game, such as 2 INT. */
    stats?: Array<{ label: string; value: string }>;
    sourceLinks?: ResearchSource[];
  }>;
  seasons: Array<{ id: string; season: string; team: string | null; line: string }>;
  socialLinks: Array<{ platform: string; handle: string; url: string }>;
  /** Verified coverage of the athlete from BLTZ research, newest first. */
  research?: ResearchItem[];
}

export const ATHLETE_MEDIA_KINDS = ["highlight", "image", "archive", "business"] as const;
export type AthleteMediaKind = (typeof ATHLETE_MEDIA_KINDS)[number];

/** Media or a business the school connects to a former player. */
export interface PilotAthleteMedia {
  id: string;
  playerId: string | null;
  launchId: string | null;
  kind: AthleteMediaKind;
  title: string;
  url: string | null;
  description: string | null;
  occurredOn: string | null;
  reviewStatus: "pending" | "approved" | "rejected";
  createdAt: string;
  /** Where it came from: a pasted link, a file the school uploaded, or Getty Images. */
  source: "link" | "upload" | "getty";
  thumbUrl: string | null;
  activationId: string | null;
}

export const LAUNCH_STATUSES = ["requested", "building", "invited", "live", "declined"] as const;
export type LaunchStatus = (typeof LAUNCH_STATUSES)[number];

/** A school's request for BLTZ to build and send a former player's Locker. */
export interface PilotLaunch {
  id: string;
  playerId: string | null;
  playerName: string;
  position: string | null;
  years: string | null;
  contactEmail: string | null;
  message: string | null;
  status: LaunchStatus;
  statusNote: string | null;
  media: PilotAthleteMedia[];
  createdAt: string;
}

const MEDIA_SIGNAL_NOUN: Record<AthleteMediaKind, string> = { business: "", highlight: "since", image: "since", archive: "since" };

/**
 * Next anniversary of a dated school-connected item, inside the same 366-day
 * lookahead the Intelligence engine uses. Businesses read "turns N"; media
 * reads "N years since".
 */
export function mediaAnniversary(item: Pick<PilotAthleteMedia, "kind" | "title" | "occurredOn">, today: Date): { headline: string; targetDate: string; daysUntil: number; years: number } | null {
  if (!item.occurredOn || !/^\d{4}-\d{2}-\d{2}$/.test(item.occurredOn)) return null;
  const [year, month, day] = item.occurredOn.split("-").map(Number);
  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  for (const candidate of [today.getUTCFullYear(), today.getUTCFullYear() + 1]) {
    const target = Date.UTC(candidate, month - 1, day);
    const years = candidate - year;
    if (target < start || years < 1) continue;
    const daysUntil = Math.round((target - start) / 86_400_000);
    if (daysUntil > 366) return null;
    const headline = item.kind === "business" ? `${item.title} turns ${years}` : `${years} year${years === 1 ? "" : "s"} ${MEDIA_SIGNAL_NOUN[item.kind]} ${item.title}`;
    return { headline, targetDate: new Date(target).toISOString().slice(0, 10), daysUntil, years };
  }
  return null;
}

/** School-side signals from dated businesses and media, in the engine's verdict scale. */
export function mediaSignals(media: readonly PilotAthleteMedia[], today = new Date()): AthleteFile["signals"] {
  return media.flatMap((item) => {
    const next = mediaAnniversary(item, today);
    if (!next) return [];
    return [{
      key: `school-media:${item.id}:${next.targetDate}`, momentId: null, headline: next.headline,
      explanation: item.kind === "business"
        ? `Your staff connected this business. A natural moment to feature the player and what they're building.`
        : `Your staff connected this ${item.kind}. Re-share it with the player's Locker link on the day.`,
      targetDate: next.targetDate, daysUntil: next.daysUntil, verdict: signalVerdict(next.daysUntil),
      priority: item.kind === "business" ? 70 : 60, confidence: 1, sources: 1,
      type: item.kind === "business" ? "business" as const : "school_media" as const, years: next.years,
    }];
  });
}

