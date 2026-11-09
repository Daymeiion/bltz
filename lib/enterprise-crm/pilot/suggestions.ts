import type { SignalVerdict } from "@/lib/intelligence/signals/types";
import type { ActivationKind, AthleteFile, PilotActivation, PilotAthleteMedia } from "./types";

type Signal = AthleteFile["signals"][number];

/** What to do, by when: one instruction per verdict. */
export const VERDICT_ACTION: Record<SignalVerdict, string> = {
  act_now: "Post or send this week.",
  prepare: "Draft it and line up media now.",
  plan: "Add it to the content calendar.",
  upcoming: "Nothing to do yet.",
};

/** The school's own track record for one kind of activation. Only posted activations with recorded reach count. */
export type KindHistory = { posted: number; avgReach: number | null; avgVisits: number | null };
export type ReachHistory = Record<ActivationKind, KindHistory>;

export type Suggestion = {
  id: string;
  kind: ActivationKind;
  title: string;
  /** Why this activation fits this date, from facts the school can check. */
  reasons: string[];
  /** Expected reach from the school's history for this kind, or why there is no estimate. */
  reach: string;
  /** The same estimate in a few words, for a chip. */
  reachShort: string;
  ready: boolean;
  status: string;
  brief: string;
};

const KIND_NOUN: Record<ActivationKind, [string, string]> = {
  post: ["social post", "social posts"], video: ["video", "videos"], article: ["article", "articles"],
  campaign: ["campaign", "campaigns"], event: ["event", "events"],
};

export function reachHistory(activations: readonly PilotActivation[]): ReachHistory {
  const history = {} as ReachHistory;
  for (const kind of Object.keys(KIND_NOUN) as ActivationKind[]) {
    const posted = activations.filter((row) => row.kind === kind && row.status === "posted");
    const withReach = posted.filter((row) => row.impressions !== null);
    history[kind] = {
      posted: posted.length,
      avgReach: withReach.length ? Math.round(withReach.reduce((sum, row) => sum + (row.impressions ?? 0), 0) / withReach.length) : null,
      avgVisits: posted.length ? Math.round(posted.reduce((sum, row) => sum + row.visits, 0) / posted.length) : null,
    };
  }
  return history;
}

/** Same short counts the workspace shows elsewhere (1.2K, 48K, 1.1M). */
export function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 10_000) return `${Math.round(value / 1000)}K`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

/** Chip-sized version of the estimate: "48K reach · 412 visits", or "First one" with no history. */
export function reachShort(kind: ActivationKind, history: ReachHistory): string {
  const row = history[kind];
  if (!row.posted) return "First one, no estimate";
  return [row.avgReach !== null ? `${formatCount(row.avgReach)} reach` : null, row.avgVisits !== null ? `${formatCount(row.avgVisits)} visits` : null].filter(Boolean).join(" · ");
}

/** Never invents a number: with no posted history for this kind, it says so. */
export function reachLine(kind: ActivationKind, history: ReachHistory, followers: number, firstName: string): string {
  const row = history[kind];
  const [one, many] = KIND_NOUN[kind];
  const share = followers > 0 && (kind === "post" || kind === "video") ? ` ${firstName} can share it with ${formatCount(followers)} followers.` : "";
  if (!row.posted) return `No ${many} posted yet, so no estimate. This would be your first.${share}`;
  const parts = [row.avgReach !== null ? `${formatCount(row.avgReach)} reach` : null, row.avgVisits !== null ? `${formatCount(row.avgVisits)} Locker visits` : null].filter(Boolean);
  const basis = row.posted === 1 ? `Your last ${one}` : `Your ${row.posted} posted ${many}`;
  return `${basis} ${row.posted === 1 ? "got" : "averaged"} ${parts.join(" and ")}.${share}`;
}

function dayLabel(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function ordinal(value: number): string {
  const tail = value % 100 >= 11 && value % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[value % 10] ?? "th";
  return `${value}${tail}`;
}

function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

export type SuggestionInput = {
  signal: Signal;
  playerName: string;
  momentTitle: string | null;
  /** The school's connected media for this player; rejected items are ignored. */
  media: readonly PilotAthleteMedia[];
  hasContact: boolean;
  followers: number;
  history: ReachHistory;
};

/** "Why it matters": short, checkable reasons this date is worth acting on. */
export function signalReasons({ signal, playerName, momentTitle, media, followers }: Omit<SuggestionInput, "hasContact" | "history">): string[] {
  const first = playerName.split(/\s+/)[0] ?? playerName;
  const years = signal.years ?? null;
  const usable = media.filter((item) => item.reviewStatus !== "rejected");
  const lines: string[] = [];
  const day = dayLabel(signal.targetDate);
  if (signal.type === "birthday" && years) {
    lines.push(`${first} turns ${years} on ${day}${years % 10 === 0 ? ", a round-number birthday worth a bigger moment" : years % 5 === 0 ? ", a milestone birthday" : ""}.`);
  } else if ((signal.type === "anniversary" || signal.type === "milestone") && years) {
    lines.push(`${day}: ${signal.headline}${years % 5 === 0 ? ", a round anniversary fans and letterwinners tend to revisit" : ""}.`);
    if (momentTitle) lines.push(`The game on record: ${momentTitle}.`);
  } else if (signal.type === "business" && years) {
    lines.push(`${first}'s business turns ${years} on ${day}. Featuring it shows fans what former players build after the game.`);
  }
  if (signal.sources > 0 && signal.type !== "business" && signal.type !== "school_media") lines.push(`${plural(signal.sources, "checked source")} back${signal.sources === 1 ? "s" : ""} it up, so every claim can be cited.`);
  const videos = usable.filter((item) => item.kind === "highlight").length;
  const images = usable.filter((item) => item.kind === "image").length;
  if (videos || images) lines.push(`Your staff has connected ${[videos ? plural(videos, "video") : null, images ? plural(images, "image") : null].filter(Boolean).join(" and ")} to build from.`);
  if (followers > 0) lines.push(`${first} reaches ${formatCount(followers)} followers, so a tag or share extends the post past your own accounts.`);
  return lines;
}

/**
 * Ready-made activation ideas for one signal, each with its reasons, a reach
 * estimate from the school's own history, and a starting brief. Built only from
 * data already on the athlete's file.
 */
export function suggestActivations(input: SuggestionInput): Suggestion[] {
  const { signal, playerName, momentTitle, media, hasContact, followers, history } = input;
  const first = playerName.split(/\s+/)[0] ?? playerName;
  const years = signal.years ?? null;
  const day = dayLabel(signal.targetDate);
  const usable = media.filter((item) => item.reviewStatus !== "rejected");
  const videos = usable.filter((item) => item.kind === "highlight").length;
  const images = usable.filter((item) => item.kind === "image").length;
  const reach = (kind: ActivationKind) => reachLine(kind, history, followers, first);
  const contact = hasContact ? "Contact on file" : "Add an email first";
  const make = (id: string, kind: ActivationKind, title: string, reasons: string[], ready: boolean, status: string, brief: string): Suggestion =>
    ({ id: `${signal.key}:${id}`, kind, title, reasons, reach: reach(kind), reachShort: reachShort(kind, history), ready, status, brief });

  if (signal.type === "birthday") {
    return [
      make("birthday-post", "post", `Birthday post for ${first}`, [`Goes out on ${day}, the day itself.`, images ? `${plural(images, "image")} ready for a throwback.` : "Works with a headshot if there is no photo yet."], true, "Ready to draft",
        `Happy ${years ? `${ordinal(years)} ` : ""}birthday to ${playerName}! Throwback photo, tag ${first}, and link the fan Locker.`),
      make("birthday-reel", "video", "Birthday highlight reel", [videos ? `Cut from ${plural(videos, "connected video")}.` : "Add highlight video in From your school first."], videos > 0, videos ? "Footage ready" : "Needs video",
        `30-second highlight reel for ${playerName}'s birthday. End card: fan Locker link.`),
      make("birthday-qa", "article", `Where are they now: ${first}`, ["A short Q&A timed to the birthday keeps the story current, not just nostalgic."], hasContact, contact,
        `Ask ${playerName} three questions: a favorite memory, what they do now, a message to fans. Publish on ${day} with the Locker link.`),
    ];
  }

  if (signal.type === "business") {
    return [
      make("business-post", "post", `Feature ${first}'s business`, [`Its anniversary on ${day} gives the post a timely hook.`, "Shows fans what former players build after the game."], true, "Ready to draft",
        `${signal.headline}. Spotlight ${playerName} and the business, tag both, and link the fan Locker.`),
      make("business-story", "article", `${first}'s life after football`, ["Gives letterwinners and local sponsors a story to share."], hasContact, contact,
        `Profile ${playerName}'s business: how it started, what the program taught them, how fans can support it.`),
    ];
  }

  if (signal.type === "school_media") {
    return [
      make("reshare", "post", "Re-share on the anniversary", [`${signal.headline} on ${day}.`, "Content you already own: no new production needed."], true, "Ready to draft",
        `Re-share with an "on this day" caption, tag ${first}, and link the fan Locker.`),
    ];
  }

  // The headline names the milestone; the Moment title names the game it came from.
  const label = momentTitle ? `${signal.headline} (${momentTitle})` : signal.headline;
  const round = years !== null && years % 5 === 0;
  const ideas = [
    make("on-this-day", "post", `"On this day" post`, [`Goes out on ${day}, the anniversary itself.`, images ? `${plural(images, "image")} ready to pair with it.` : "Pair it with a game photo from Getty Images."], true, "Ready to draft",
      `On this day: ${label}. Tag ${first} and link the fan Locker.`),
    make("highlight", "video", "Highlight clip", [videos ? `Cut from ${plural(videos, "connected video")}.` : "Add game footage in From your school first."], videos > 0, videos ? "Footage ready" : "Needs video",
      `20 to 40 second clip of ${label}. Caption with the date and ${first}'s tag; end card links the Locker.`),
    make("look-back", "article", `${first} looks back`, [`${first} tells the story in their own words, which fans can't get anywhere else.`], hasContact, contact,
      `Interview ${playerName} about ${label}: the moment, the team, where they are now. Publish on ${day} with the Locker link.`),
  ];
  if (round) ideas.push(make("legends-event", "event", `Invite ${first} back`, [`A ${years}-year anniversary is a natural game-day recognition or sideline visit.`], hasContact, contact,
    `Invite ${playerName} to a home game near ${day} for an on-field recognition. Show the Locker QR code on the board.`));
  return ideas;
}
