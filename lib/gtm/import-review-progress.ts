import { GTM_CSV_MAX_ROWS, GTM_IMPORT_FIELDS, type GtmFieldMapping } from "@/lib/gtm/import-contract";
import type { PlayerMatchReview } from "@/lib/gtm/player-matching";

export const GTM_REVIEW_PAGE_SIZE = 20;
export const GTM_REVIEW_CHECKPOINT_MAX_BYTES = 3_000_000;
const MAX_SELECTION_BYTES = 1_000_000;
const sourceIdPattern = /^[a-f0-9]{64}$/;
const playerIdPattern = /^[A-Za-z0-9._-]{1,128}$/;

export interface ImportReviewSelections {
  matches: Record<string, string | null>;
  deferred: string[];
}

export interface ImportReviewContext {
  contentSha256: string;
  mapping: GtmFieldMapping;
  playerReviews: PlayerMatchReview[];
}

type ProgressChoice = { kind: "match"; gsisId: string } | { kind: "reject" } | { kind: "defer" };
interface ProgressEntry { sourceRecordId: string; reviewSha256: string; choice: ProgressChoice }
interface ImportReviewCheckpoint {
  version: 1;
  contentSha256: string;
  mappingSha256: string;
  entries: ProgressEntry[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

/** Recomputed reviews authorize all choices; saved browser metadata never does. */
export function validateImportReviewSelections(
  matches: unknown,
  deferred: unknown,
  reviews: Map<string, PlayerMatchReview>,
): ImportReviewSelections {
  if (!isRecord(matches) || !Array.isArray(deferred)
    || Object.keys(matches).length > GTM_CSV_MAX_ROWS || deferred.length > GTM_CSV_MAX_ROWS
    || JSON.stringify({ matches, deferred }).length > MAX_SELECTION_BYTES) {
    throw new Error("The Player review choices are invalid or too large. Validate the CSV again.");
  }
  const validMatches: Record<string, string | null> = {};
  for (const [sourceRecordId, gsisId] of Object.entries(matches)) {
    const review = reviews.get(sourceRecordId);
    if (!sourceIdPattern.test(sourceRecordId) || !review
      || (gsisId !== null && (typeof gsisId !== "string" || !playerIdPattern.test(gsisId)
        || !review.candidates.some((candidate) => candidate.id === gsisId)))) {
      throw new Error("A Player review choice is no longer valid. Preview the import again.");
    }
    validMatches[sourceRecordId] = gsisId as string | null;
  }
  const validDeferred = new Set<string>();
  for (const sourceRecordId of deferred) {
    const review = typeof sourceRecordId === "string" ? reviews.get(sourceRecordId) : undefined;
    if (typeof sourceRecordId !== "string" || !sourceIdPattern.test(sourceRecordId)
      || !review || review.strength === "strong" || Object.hasOwn(validMatches, sourceRecordId)
      || validDeferred.has(sourceRecordId)) {
      throw new Error("A deferred Player review is invalid. Preview the import again.");
    }
    validDeferred.add(sourceRecordId);
  }
  return { matches: validMatches, deferred: [...validDeferred] };
}

export function resolveImportPlayerReview(
  review: PlayerMatchReview | undefined,
  hasDecision: boolean,
  selectedId: string | null | undefined,
  deferred: boolean,
) {
  if (deferred && (!review || review.strength === "strong" || hasDecision)) {
    throw new Error("A deferred Player review is invalid. Preview the import again.");
  }
  const selectedGsisId = deferred ? null : hasDecision ? selectedId
    : review?.strength === "strong"
      ? review.candidates.find((candidate) => candidate.matchType !== "name_only" && candidate.confidence >= 0.9)?.id
      : null;
  const match = selectedGsisId ? review?.candidates.find((candidate) => candidate.id === selectedGsisId) : null;
  if (selectedGsisId && !match) throw new Error("The Player match is no longer valid. Preview the import again.");
  const manualPlayerVerification = Boolean(hasDecision && match);
  const identityReviewStatus = !review ? "clear" as const
    : deferred ? review.strength as "possible" | "ambiguous"
      : hasDecision ? match ? "manual_verified" as const : "rejected" as const
        : review.strength === "strong" ? "clear" as const : review.strength;
  const identityReviewReason = review
    ? `${review.strength} Player Master name match${deferred
      ? " deferred during import; contact preserved without a new Player link for later review"
      : hasDecision && !match ? " rejected during import review" : ""}`
    : null;
  return { match: match ?? null, manualPlayerVerification, identityReviewStatus, identityReviewReason };
}

export function importReviewPage<T>(rows: T[], requestedPage: number) {
  const pages = Math.max(1, Math.ceil(rows.length / GTM_REVIEW_PAGE_SIZE));
  const page = Math.max(1, Math.min(pages, Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 1));
  return { rows: rows.slice((page - 1) * GTM_REVIEW_PAGE_SIZE, page * GTM_REVIEW_PAGE_SIZE), page, pages, total: rows.length };
}

async function sha256(value: string) {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function mappingValue(mapping: GtmFieldMapping) {
  return JSON.stringify(GTM_IMPORT_FIELDS.map((field) => [field, mapping[field] ?? ""]));
}

async function reviewSha256(review: PlayerMatchReview) {
  return sha256(JSON.stringify({
    name: review.displayName, company: review.currentCompany, strength: review.strength,
    candidates: [...review.candidates].sort((left, right) => left.id.localeCompare(right.id)).map((candidate) => ({
      id: candidate.id, playerId: candidate.playerId, name: candidate.name, team: candidate.team,
      school: candidate.school, college: candidate.college, position: candidate.position,
      level: candidate.level, status: candidate.status, matchType: candidate.matchType, confidence: candidate.confidence,
    })),
  }));
}

/** Added to the existing approved-preview summary to bind candidate context. */
export async function importPlayerReviewsSha256(reviews: Iterable<PlayerMatchReview>) {
  const entries = await Promise.all([...reviews].sort((left, right) => left.sourceRecordId.localeCompare(right.sourceRecordId))
    .map(async (review) => [review.sourceRecordId, await reviewSha256(review)]));
  return sha256(JSON.stringify(entries));
}

/** Contains hashes and reviewed identifiers only, never raw CSV/contact fields. */
export async function captureImportReviewProgress(context: ImportReviewContext, selections: ImportReviewSelections): Promise<string> {
  if (!sourceIdPattern.test(context.contentSha256)) throw new Error("Validate the CSV before saving review progress.");
  const reviews = new Map(context.playerReviews.map((review) => [review.sourceRecordId, review]));
  const valid = validateImportReviewSelections(selections.matches, selections.deferred, reviews);
  const deferred = new Set(valid.deferred);
  const ids = [...new Set([...Object.keys(valid.matches), ...valid.deferred])].sort();
  const entries = await Promise.all(ids.map(async (sourceRecordId): Promise<ProgressEntry> => ({
    sourceRecordId,
    reviewSha256: await reviewSha256(reviews.get(sourceRecordId)!),
    choice: deferred.has(sourceRecordId) ? { kind: "defer" }
      : valid.matches[sourceRecordId] === null ? { kind: "reject" }
        : { kind: "match", gsisId: valid.matches[sourceRecordId]! },
  })));
  const checkpoint: ImportReviewCheckpoint = {
    version: 1, contentSha256: context.contentSha256,
    mappingSha256: await sha256(mappingValue(context.mapping)), entries,
  };
  const result = JSON.stringify(checkpoint, null, 2);
  if (new TextEncoder().encode(result).byteLength > GTM_REVIEW_CHECKPOINT_MAX_BYTES) throw new Error("Review progress is too large to save as one checkpoint.");
  return result;
}

export async function restoreImportReviewProgress(text: string, context: ImportReviewContext, dropStaleEntries = false): Promise<ImportReviewSelections> {
  if (new TextEncoder().encode(text).byteLength > GTM_REVIEW_CHECKPOINT_MAX_BYTES) throw new Error("The review checkpoint exceeds 3 MB.");
  let candidate: unknown;
  try { candidate = JSON.parse(text); } catch { throw new Error("Choose a valid BLTZ review checkpoint JSON file."); }
  if (!isRecord(candidate) || candidate.version !== 1 || !Array.isArray(candidate.entries)
    || candidate.entries.length > GTM_CSV_MAX_ROWS || candidate.contentSha256 !== context.contentSha256
    || candidate.mappingSha256 !== await sha256(mappingValue(context.mapping))) {
    throw new Error("This checkpoint belongs to a different CSV or field mapping. Validate the original file with the same mapping first.");
  }
  const reviews = new Map(context.playerReviews.map((review) => [review.sourceRecordId, review]));
  const selections: ImportReviewSelections = { matches: {}, deferred: [] };
  const seen = new Set<string>();
  for (const entry of candidate.entries) {
    if (!isRecord(entry) || typeof entry.sourceRecordId !== "string" || !sourceIdPattern.test(entry.sourceRecordId)
      || !isRecord(entry.choice) || seen.has(entry.sourceRecordId)) throw new Error("The review checkpoint contains invalid or repeated decisions.");
    seen.add(entry.sourceRecordId);
    const review = reviews.get(entry.sourceRecordId);
    if (!review || entry.reviewSha256 !== await reviewSha256(review)) {
      if (dropStaleEntries) continue;
      throw new Error("Player candidates or their context changed. Review the CSV again; stale decisions were not restored.");
    }
    if (entry.choice.kind === "defer") selections.deferred.push(entry.sourceRecordId);
    else if (entry.choice.kind === "reject") selections.matches[entry.sourceRecordId] = null;
    else if (entry.choice.kind === "match" && typeof entry.choice.gsisId === "string") selections.matches[entry.sourceRecordId] = entry.choice.gsisId;
    else throw new Error("The review checkpoint contains an invalid decision.");
  }
  return validateImportReviewSelections(selections.matches, selections.deferred, reviews);
}
