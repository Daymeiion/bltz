import type { NormalizedGtmImportRow } from "@/lib/gtm/import-contract";
import { calculateEnterprisePriority } from "@/lib/gtm/scoring";
import type { GtmContactType } from "@/lib/gtm/types";

export const GTM_CLASSIFICATION_STATUSES = [
  "auto_classified",
  "manual_verified",
  "needs_review",
  "unclassified",
] as const;

export type GtmClassificationStatus =
  (typeof GTM_CLASSIFICATION_STATUSES)[number];

export type GtmPrimaryContactType = GtmContactType;

export interface GtmAutomaticPriorityExplanation {
  model: "enterprise_v1";
  factors: {
    relationshipStrength: number;
    bltzRelevance: number;
    buyingAuthority: number;
    networkLeverage: number;
    timing: number;
  };
  inferredFields: string[];
  reasons: string[];
  score: number;
  tier: string;
}

export interface GtmClassificationResult {
  contactType: GtmPrimaryContactType;
  segment: string | null;
  personas: string[];
  classificationSource: "deterministic_rules_v1" | "csv_explicit" | "manual_player_match";
  classificationConfidence: number;
  classificationStatus: GtmClassificationStatus;
  classificationReasons: string[];
  relationshipStrength: number | null;
  bltzRelevance: number | null;
  buyingAuthority: number | null;
  networkLeverage: number | null;
  timingScore: number | null;
  priorityScoreExplanation: GtmAutomaticPriorityExplanation | null;
}

export interface PlayerClassificationEvidence {
  matched: boolean;
  strong: boolean;
  status?: string | null;
  team?: string | null;
  college?: string | null;
}

type Rule = {
  pattern: RegExp;
  type: "athlete" | "enterprise" | "multiplier";
  segment: string;
  persona: string;
  confidence: number;
  reason: string;
};

const RULES: Rule[] = [
  { pattern: /\b(professional athlete|pro athlete|nfl player|football player|student[- ]athlete)\b/i, type: "athlete", segment: "Professional Player", persona: "Athlete", confidence: 0.92, reason: "athlete title" },
  { pattern: /\b(general manager|director of athletics|athletic director)\b/i, type: "enterprise", segment: "Athletic Director", persona: "Enterprise Decision Maker", confidence: 0.96, reason: "senior athletics decision-maker title" },
  { pattern: /\b(player personnel|football operations|team operations|athlete development|player development)\b/i, type: "enterprise", segment: "Player Personnel", persona: "Team Operations", confidence: 0.9, reason: "team or player operations title" },
  { pattern: /\b(nil|name image likeness)\b/i, type: "enterprise", segment: "NIL", persona: "NIL Professional", confidence: 0.88, reason: "NIL role" },
  { pattern: /\b(contract advisor|sports agent|athlete agent|player agent|athlete manager|talent agent)\b/i, type: "multiplier", segment: "Agent", persona: "Athlete Representative", confidence: 0.91, reason: "athlete representation role" },
  { pattern: /\b(investor|venture partner|managing partner|venture capital|private equity|family office)\b/i, type: "multiplier", segment: "Investor", persona: "Investor", confidence: 0.9, reason: "investment role" },
  { pattern: /\b(founder|co[- ]founder|chief executive officer|\bceo\b|operator)\b/i, type: "multiplier", segment: "Founder", persona: "Founder / Operator", confidence: 0.84, reason: "founder or operator title" },
  { pattern: /\b(creative director|art director|photographer|videographer|producer|content creator)\b/i, type: "multiplier", segment: "Creative", persona: "Creative / Brand", confidence: 0.86, reason: "creative role" },
  { pattern: /\b(media|journalist|reporter|editor|broadcaster|host|content)\b/i, type: "multiplier", segment: "Media", persona: "Sports Media", confidence: 0.78, reason: "media role" },
  { pattern: /\b(brand|marketing|partnerships|sponsorship)\b/i, type: "multiplier", segment: "Brand", persona: "Creative / Brand", confidence: 0.75, reason: "brand or partnership role" },
  { pattern: /\b(sports technology|sportstech|sports tech)\b/i, type: "multiplier", segment: "Sports Technology", persona: "Sports Technology", confidence: 0.86, reason: "sports technology context" },
];

function normalize(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function playerSegment(status: string | null | undefined) {
  const normalized = normalize(status).toLowerCase();
  if (/active|practice|reserve/.test(normalized)) return "Professional Player";
  if (/retired|inactive|former|\bret\b/.test(normalized)) return "Former Player";
  return "Professional Player";
}

function priorityExplanation(
  text: string,
  reasons: string[],
): Pick<GtmClassificationResult,
  "relationshipStrength" | "bltzRelevance" | "buyingAuthority" |
  "networkLeverage" | "timingScore" | "priorityScoreExplanation"> {
  const relationshipStrength = 2;
  const bltzRelevance = /athletic|sports?|football|player|nil|team|league/i.test(text) ? 5 : 3;
  const buyingAuthority = /general manager|athletic director|director of athletics|chief|\bceo\b|president/i.test(text)
    ? 5
    : /vice president|\bvp\b|director|head of/i.test(text) ? 4
      : /manager|lead/i.test(text) ? 3 : 2;
  const networkLeverage = /agent|advisor|founder|investor|partner|media|partnership/i.test(text) ? 4 : 2;
  const timingScore = 2;
  const factors = {
    relationshipStrength,
    bltzRelevance,
    buyingAuthority,
    networkLeverage,
    timing: timingScore,
  };
  const result = calculateEnterprisePriority(factors);
  return {
    relationshipStrength,
    bltzRelevance,
    buyingAuthority,
    networkLeverage,
    timingScore,
    priorityScoreExplanation: {
      model: "enterprise_v1",
      factors,
      inferredFields: [
        "relationshipStrength",
        "bltzRelevance",
        "buyingAuthority",
        "networkLeverage",
        "timing",
      ],
      reasons: [
        ...reasons,
        "Relationship strength and timing use neutral inferred values until the founder verifies them.",
      ],
      score: result.score,
      tier: result.tier,
    },
  };
}

export function classifyGtmImportRow(
  row: NormalizedGtmImportRow,
  player: PlayerClassificationEvidence = { matched: false, strong: false },
): GtmClassificationResult {
  if (row.contactType !== "unclassified") {
    const primary = row.contactType;
    const reasons = ["CSV supplied an explicit contact type"];
    const scoring = primary === "enterprise"
      ? priorityExplanation(`${row.currentTitle} ${row.currentCompany}`, reasons)
      : {
        relationshipStrength: null,
        bltzRelevance: null,
        buyingAuthority: null,
        networkLeverage: null,
        timingScore: null,
        priorityScoreExplanation: null,
      };
    return {
      contactType: primary,
      segment: primary === "athlete" ? "Professional Player" : null,
      personas: primary === "athlete" ? ["Athlete"] : [],
      classificationSource: "csv_explicit",
      classificationConfidence: 1,
      classificationStatus: "auto_classified",
      classificationReasons: reasons,
      ...scoring,
    };
  }

  if (player.strong) {
    const segment = playerSegment(player.status);
    return {
      contactType: "athlete",
      segment,
      personas: unique(["Athlete", segment === "Former Player" ? "Former NFL Player" : "Current Professional Player"]),
      classificationSource: "deterministic_rules_v1",
      classificationConfidence: 0.98,
      classificationStatus: "auto_classified",
      classificationReasons: ["Strong canonical Player Master match"],
      relationshipStrength: null,
      bltzRelevance: null,
      buyingAuthority: null,
      networkLeverage: null,
      timingScore: null,
      priorityScoreExplanation: null,
    };
  }

  const title = normalize(row.currentTitle);
  const text = normalize(`${title} ${row.currentCompany}`);
  const exactAthleteRule: Rule = { pattern: /^athlete$/i, type: "athlete", segment: "Professional Player", persona: "Athlete", confidence: 0.9, reason: "exact athlete title" };
  const matches = [exactAthleteRule, ...RULES].filter((rule) => rule.pattern.test(rule === exactAthleteRule ? title : text));
  if (matches.length === 0) {
    return {
      contactType: "unclassified",
      segment: null,
      personas: player.matched ? ["Potential Player Match"] : [],
      classificationSource: "deterministic_rules_v1",
      classificationConfidence: player.matched ? 0.55 : 0,
      classificationStatus: player.matched ? "needs_review" : "unclassified",
      classificationReasons: player.matched
        ? ["Name matches Player Master but lacks corroborating team or college context"]
        : ["No deterministic role or Player signal"],
      relationshipStrength: null,
      bltzRelevance: null,
      buyingAuthority: null,
      networkLeverage: null,
      timingScore: null,
      priorityScoreExplanation: null,
    };
  }

  const best = [...matches].sort((left, right) => right.confidence - left.confidence)[0];
  const sameType = matches.filter((match) => match.type === best.type);
  const confidence = Math.min(0.99, best.confidence + Math.max(0, sameType.length - 1) * 0.03);
  const reasons = unique(matches.map((match) => match.reason));
  const personas = unique(matches.map((match) => match.persona));
  const scoring = best.type === "enterprise"
    ? priorityExplanation(text, reasons)
    : {
      relationshipStrength: null,
      bltzRelevance: null,
      buyingAuthority: null,
      networkLeverage: null,
      timingScore: null,
      priorityScoreExplanation: null,
    };

  return {
    contactType: best.type,
    segment: best.segment,
    personas,
    classificationSource: "deterministic_rules_v1",
    classificationConfidence: confidence,
    classificationStatus: confidence >= 0.8 ? "auto_classified" : "needs_review",
    classificationReasons: reasons,
    ...scoring,
  };
}
