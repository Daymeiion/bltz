import { z } from "zod";

/** Facts BLTZ assembles from the workspace. Numbers in a brief only ever come from here, never from AI. */
export type BriefFacts = {
  generatedAt: string;
  school: { name: string };
  athlete: { name: string; position: string | null; team: string | null; portraitUrl: string | null; lockerUrl: string };
  highlights: Array<{ title: string; date: string | null; stats: Array<{ label: string; value: string }> }>;
  seasons: Array<{ season: string; team: string | null; line: string }>;
  reach: {
    followers: Array<{ platform: string; handle: string | null; followers: number }>;
    totalFollowers: number;
    activationsPosted: number;
    impressions: number;
    engagements: number;
    lockerVisits: number;
  };
  /** Businesses and partners already connected to the athlete. */
  brands: Array<{ name: string; note: string | null }>;
  channels: {
    locker: Array<{ label: string; description: string }>;
    planned: Array<{ title: string; kind: string; dueOn: string | null }>;
    upcoming: Array<{ headline: string; targetDate: string }>;
  };
  coverage: Array<{ title: string; publisher: string; url: string; date: string | null }>;
};

export type BriefIdea = { title: string; channel: string; timing: string; description: string };
export type BriefNarrative = { headline: string; summary: string; fit: string; ideas: BriefIdea[] };
export type BriefRecipient = { brandName: string; contactName: string | null; contactEmail: string | null; goal: string | null; budget: string | null };

/** What a shared link shows: the snapshot as it was when shared. */
export type BriefContent = { recipient: BriefRecipient; facts: BriefFacts; narrative: BriefNarrative };

/** A brief as the school sees it in its list. */
export type BriefSummary = {
  id: string; playerId: string; brandName: string; contactName: string | null; status: "shared" | "revoked";
  expiresAt: string; createdAt: string; viewCount: number; lastViewedAt: string | null;
};

/** Spots on the fan Locker a brand can appear in. Same for every athlete; BLTZ fills them. */
export const LOCKER_PLACEMENTS: BriefFacts["channels"]["locker"] = [
  { label: "Locker hero video", description: "The first thing fans see on the athlete's fan Locker." },
  { label: "Film Room", description: "Game film and highlights, with room for a presenting partner." },
  { label: "Photo Room", description: "Career photos; a natural home for a branded gallery." },
  { label: "Social and podcast spots", description: "Short videos placed for sharing on the athlete's channels." },
  { label: "Merchandise", description: "Trading cards, jerseys and apparel sold from the Locker." },
];

const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max).nullish().transform((value) => value || null);

export const briefRecipientInput = z.object({
  brandName: text(120),
  contactName: optionalText(120),
  contactEmail: z.string().trim().max(254).email().nullish().or(z.literal("")).transform((value) => value || null),
  goal: optionalText(1000),
  budget: optionalText(120),
}).strict();

export const briefNarrativeInput = z.object({
  headline: text(160),
  summary: text(1500),
  fit: text(1500),
  ideas: z.array(z.object({ title: text(120), channel: text(80), timing: text(80), description: text(600) }).strict()).max(5),
}).strict();

export const briefDraftInput = z.object({ playerId: z.string().uuid(), recipient: briefRecipientInput }).strict();

export const briefShareInput = z.object({
  playerId: z.string().uuid(),
  recipient: briefRecipientInput,
  narrative: briefNarrativeInput,
  /** Partners staff added that BLTZ does not record yet. */
  partners: z.array(z.object({ name: text(120), note: optionalText(200) }).strict()).max(10).default([]),
  origin: z.enum(["ai", "manual"]).default("ai"),
  expiresInDays: z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30),
  /** Staff confirm the athlete approved sharing their name, image and numbers with this brand. */
  athleteConsent: z.literal(true),
}).strict();
export type BriefShareInput = z.infer<typeof briefShareInput>;

export function formatFollowers(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 10_000) return `${Math.round(value / 1000)}K`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}
