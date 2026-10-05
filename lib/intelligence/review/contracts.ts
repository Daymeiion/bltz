import { z } from "zod";

const label = z.string().trim().min(1).max(400);
const confidence = z.number().min(0).max(1);
const day = z.iso.date();
const timestamp = z.iso.datetime({ offset: true });
const credentialKey = /^(api[_-]?key|authorization|cookie|password|secret|(?:access|refresh)[_-]?token|credentials|signature)$/i;

/** Public locators/content links only. HTTPS YouTube watch URLs are allowed. */
export function isSafeReviewUrl(value: string): boolean {
  if (/\s|\\/.test(value)) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return !/[?#]/.test(value);
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.hash
      && [...url.searchParams.keys()].every(key => !credentialKey.test(key));
  } catch { return false; }
}

function containsTransportSecrets(value: unknown): boolean {
  if (typeof value === "string") {
    return /bearer\s+\S+/i.test(value) || (/^https?:\/\//i.test(value) && !isSafeReviewUrl(value));
  }
  if (Array.isArray(value)) return value.some(containsTransportSecrets);
  return !!value && typeof value === "object"
    && Object.entries(value).some(([key, item]) => credentialKey.test(key) || containsTransportSecrets(item));
}

const reviewedContent = z.object({
  title: label, url: z.string().refine(isSafeReviewUrl, "unsafe_content_url"),
  contentType: z.enum(["article", "interview", "video", "podcast", "profile"]),
  publishedOn: day.nullable(), releasedOn: day.nullable(), describedEventOn: day.nullable(),
  careerContext: z.enum(["career_era", "postcareer", "unknown"]), identityStatus: z.literal("verified"),
}).passthrough();

const momentCreate = z.object({
  mode: z.literal("create"), title: label, occurredOn: day.nullable(),
  occurredYear: z.number().int().min(1800).max(2200).nullable(),
  datePrecision: z.enum(["day", "year", "unknown"]), sport: label,
  relationshipType: z.enum(["featured", "participant", "contributor"]), confidence,
}).strict().refine(moment => moment.datePrecision === "day"
  ? !!moment.occurredOn && moment.occurredYear === Number(moment.occurredOn.slice(0, 4))
  : moment.datePrecision === "year" ? moment.occurredOn === null && moment.occurredYear !== null
    : moment.occurredOn === null && moment.occurredYear === null, "invalid_moment_precision");

export const IntelligenceReviewPacketSchema = z.object({
  schemaVersion: z.literal(1), idempotencyKey: z.string().min(1).max(240),
  athleteId: z.string().uuid(), expectedAthleteName: label,
  identityReview: z.object({ status: z.literal("verified"), matchMethod: label, confidence }).strict(),
  source: z.object({
    key: z.string().min(1).max(160), name: z.string().min(1).max(240), provider: z.string().min(1).max(120),
    namespace: z.string().min(1).max(160), externalId: z.string().min(1).max(400).nullable(),
    locator: z.string().max(4000).refine(isSafeReviewUrl, "unsafe_source_locator"),
    fetchedAt: timestamp, normalizerVersion: z.string().min(1).max(120),
  }).strict(),
  rawObservation: z.record(z.string(), z.json()),
  normalizedCandidate: z.record(z.string(), z.json()),
  review: z.object({ reviewedAt: timestamp, reason: z.string().trim().min(1).max(4000) }).strict(),
  moment: z.union([momentCreate, z.object({ mode: z.literal("link"), id: z.string().uuid() }).strict()]).nullable(),
  evidence: z.array(z.object({
    factType: z.string().min(1).max(120), statement: z.string().trim().min(1).max(4000),
    data: z.record(z.string(), z.json()), confidence, attachToMoment: z.boolean(),
  }).strict()).min(1).max(40),
}).strict().superRefine((packet, context) => {
  if (containsTransportSecrets(packet)) context.addIssue({ code: "custom", message: "transport_secrets_rejected" });
  if (new Date(packet.review.reviewedAt) < new Date(packet.source.fetchedAt)) context.addIssue({ code: "custom", message: "review_precedes_observation" });
  const occurrence = packet.evidence.filter(item => item.factType === "moment_occurrence" && item.attachToMoment);
  const createdMoment = packet.moment?.mode === "create" ? packet.moment : null;
  if (createdMoment && (!occurrence.length || occurrence.some(item =>
    item.data.dateBasis !== "described_event" || item.data.occurredOn !== createdMoment.occurredOn))) {
    context.addIssue({ code: "custom", message: "moment_requires_independent_occurrence_evidence" });
  }
  for (const item of packet.evidence) {
    if (item.attachToMoment && !packet.moment) context.addIssue({ code: "custom", message: "missing_moment_target" });
    if (item.factType === "content_item" && item.attachToMoment) context.addIssue({ code: "custom", message: "content_publication_is_not_sports_occurrence" });
    if (item.factType === "content_item" && !["career_era", "postcareer", "unknown"].includes(String(item.data.careerContext))) {
      context.addIssue({ code: "custom", message: "content_requires_career_context" });
    }
    if (item.factType === "content_item" && !reviewedContent.safeParse(item.data).success) {
      context.addIssue({ code: "custom", message: "invalid_reviewed_content_dates_or_identity" });
    }
  }
});

export type IntelligenceReviewPacket = z.infer<typeof IntelligenceReviewPacketSchema>;

export const IntelligenceReviewReceiptSchema = z.object({
  ingestionId: z.string().uuid(), momentId: z.string().uuid().nullable(),
  evidenceIds: z.array(z.string().uuid()), reviewerId: z.string().uuid(), replay: z.boolean(),
});
export type IntelligenceReviewReceipt = z.infer<typeof IntelligenceReviewReceiptSchema>;
