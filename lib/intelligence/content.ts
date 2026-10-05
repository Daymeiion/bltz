import type { GraphEvidence, GraphReviewStatus } from "./contracts";
import { safeSourceUrl } from "./lab-format";

export interface IntelligenceContentItem {
  evidenceId: string;
  athleteId: string;
  sourceId: string | null;
  title: string;
  url: string;
  publisher: string;
  contentType: "article" | "interview" | "video" | "podcast" | "profile";
  publishedOn: string | null;
  releasedOn: string | null;
  describedEventOn: string | null;
  careerContext: "career_era" | "postcareer" | "unknown";
  matchMethod: string;
  matchConfidence: number;
  status: GraphReviewStatus;
  fetchedAt: string | null;
  sourceUrl: string | null;
  assertion: string;
  metadataDateBasis: string | null;
  sourcePaths: string[];
  youtubeId: string | null;
  incompleteReasons: string[];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function safeUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  return safeSourceUrl(value);
}

function text(value: unknown, maxLength: number): string | null {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength ? value.trim() : null;
}

function exactDay(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value ? value : null;
}

/**
 * Whitelisted metadata only: publication, release, and described occurrence stay
 * separate. This never creates a sports Moment or infers publication rights.
 */
export function contentItemsFromEvidence(evidence: GraphEvidence[]): IntelligenceContentItem[] {
  return evidence.flatMap(item => {
    if (item.factType !== "content_item" || item.status === "rejected" || !UUID.test(item.athleteId)) return [];
    const data = item.data;
    const title = text(data.title, 500);
    const url = safeUrl(data.url);
    const publisher = text(data.publisher, 200);
    const matchMethod = text(data.matchMethod, 200);
    const contentType = data.contentType;
    const identityStatus = data.identityStatus;
    const matchConfidence = data.matchConfidence;
    if (!title || !url || !publisher || !matchMethod
      || !["article", "interview", "video", "podcast", "profile"].includes(String(contentType))
      || !["verified", "candidate"].includes(String(identityStatus))
      || typeof matchConfidence !== "number" || !Number.isFinite(matchConfidence)
      || matchConfidence < 0 || matchConfidence > 1) return [];
    const publishedOn = exactDay(data.publishedOn);
    const releasedOn = exactDay(data.releasedOn);
    const describedEventOn = exactDay(data.describedEventOn);
    const incompleteReasons: string[] = [];
    for (const [field, value] of [["publishedOn", publishedOn], ["releasedOn", releasedOn], ["describedEventOn", describedEventOn]] as const) {
      if (data[field] != null && value === null) incompleteReasons.push(`invalid_${field}`);
    }
    if (!publishedOn && !releasedOn) incompleteReasons.push("publication_or_release_date_unknown");
    const rawFetchedAt = item.source.fetchedAt;
    const validFetchedAt = rawFetchedAt && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(rawFetchedAt)
      && exactDay(rawFetchedAt.slice(0, 10)) !== null && Number.isFinite(Date.parse(rawFetchedAt));
    if (!validFetchedAt) incompleteReasons.push("capture_timestamp_unknown");
    const careerContext = ["career_era", "postcareer", "unknown"].includes(String(data.careerContext))
      ? data.careerContext as IntelligenceContentItem["careerContext"] : "unknown";
    const youtubeId = typeof data.youtubeId === "string" && /^[A-Za-z0-9_-]{11}$/.test(data.youtubeId) ? data.youtubeId : null;
    return [{
      evidenceId: item.id, athleteId: item.athleteId, sourceId: item.source.id,
      title, url, publisher, contentType: contentType as IntelligenceContentItem["contentType"],
      publishedOn, releasedOn, describedEventOn, careerContext, matchMethod, matchConfidence,
      status: item.status === "verified" && identityStatus === "verified" ? "verified" : "candidate",
      fetchedAt: validFetchedAt ? new Date(rawFetchedAt!).toISOString() : null,
      sourceUrl: safeUrl(item.source.locator), assertion: text(item.statement, 2000) ?? "",
      metadataDateBasis: text(data.metadataDateBasis, 1500),
      sourcePaths: Array.isArray(data.sourcePaths) ? data.sourcePaths.slice(0, 10).map(path => text(path, 300)).filter((path): path is string => path !== null) : [],
      youtubeId, incompleteReasons,
    } satisfies IntelligenceContentItem];
  }).sort((a, b) => (b.publishedOn ?? b.releasedOn ?? "").localeCompare(a.publishedOn ?? a.releasedOn ?? "") || a.evidenceId.localeCompare(b.evidenceId));
}

/** A recency gate, not a generated Signal or a claim of activity increase. */
export function contentRecency(item: IntelligenceContentItem, asOf: string, windowDays = 30): "recent" | "historical" | "incomplete" | "future" {
  if (!Number.isInteger(windowDays) || windowDays < 0 || windowDays > 366) throw new RangeError("content window must be whole days from 0 to 366");
  const evaluationTime = Date.parse(asOf);
  if (!Number.isFinite(evaluationTime) || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(asOf)
    || exactDay(asOf.slice(0, 10)) === null) throw new RangeError("asOf must be a valid timestamp with an offset");
  if (item.status !== "verified" || !item.fetchedAt) return "incomplete";
  if (Date.parse(item.fetchedAt) > evaluationTime) return "future";
  // A newsletter's publication date cannot replace an embedded video's release.
  const date = item.contentType === "video" || item.contentType === "podcast" ? item.releasedOn : item.publishedOn;
  if (!date) return "incomplete";
  const today = new Date(evaluationTime).toISOString().slice(0, 10);
  const daysAgo = (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86_400_000;
  if (daysAgo < 0) return "future";
  return daysAgo <= windowDays ? "recent" : "historical";
}
