import { safeSourceUrl } from "./lab-format";

const privateStatisticKey = /(?:^_|review|rights|license|significance|payload|provider|identity|(?:^|_)(?:raw|id|uuid|user|token|secret|key|auth)(?:_|$))/i;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

/** Only finite, named measurements inside the explicit statistics container. */
function statistics(value: unknown, depth = 0): Record<string, unknown> {
  const input = record(value);
  const output: Record<string, unknown> = {};
  if (!input || depth > 2) return output;
  for (const [key, item] of Object.entries(input).slice(0, 100)) {
    if (!/^[A-Za-z][A-Za-z0-9_ -]{0,79}$/.test(key) || privateStatisticKey.test(key)) continue;
    if (typeof item === "number" && Number.isFinite(item)) output[key] = item;
    else if (record(item) && depth < 2) {
      const nested = statistics(item, depth + 1);
      if (Object.keys(nested).length) output[key] = nested;
    }
  }
  return output;
}

function text(value: unknown, cap = 2000): string | null {
  return typeof value === "string" && value.length <= cap && !/[\u0000-\u001f\u007f]/.test(value) ? value : null;
}

/**
 * Explicit DTO projection, not raw normalized storage. Review/audit actors,
 * transport payloads, rights metadata and unknown fields never enter the client
 * graph. Existing rule inputs and public content dates remain distinct.
 */
export function projectGraphEvidenceData(factType: string, value: Record<string, unknown>): Record<string, unknown> {
  if (factType === "performance") return { statistics: statistics(value.statistics ?? value.statistics_raw) };
  const fields: Record<string, readonly string[]> = {
    moment_occurrence: ["occurredOn", "dateBasis", "sport", "team", "opponent", "sourcePaths", "scheduledAt", "actualCompletionTime", "uniquePlayCount"],
    career_milestone: ["label", "statistic", "value", "threshold", "unit"],
    career_status: ["status", "statusDate"],
    content_item: ["title", "url", "publisher", "contentType", "publishedOn", "releasedOn", "describedEventOn", "careerContext", "matchMethod", "matchConfidence", "identityStatus", "metadataDateBasis", "sourcePaths", "youtubeId"],
    play_activity: ["type", "clock", "wallClock", "sourcePaths", "actions"],
  };
  const output: Record<string, unknown> = {};
  for (const key of Object.hasOwn(fields, factType) ? fields[factType] : []) {
    const item = value[key];
    if (item === null) { output[key] = null; continue; }
    if (["value", "threshold", "matchConfidence", "uniquePlayCount"].includes(key)) {
      if (typeof item === "number" && Number.isFinite(item)) output[key] = item;
    } else if (key === "url") {
      const url = typeof item === "string" ? safeSourceUrl(item) : null;
      if (url) output[key] = url;
    } else if (key === "sourcePaths") {
      if (Array.isArray(item)) output[key] = item.slice(0, 10).map(path => text(path, 300)).filter((path): path is string => path !== null);
    } else if (key === "actions") {
      if (Array.isArray(item)) output[key] = item.slice(0, 40).flatMap(action => {
        const input = record(action);
        const statType = text(input?.statType, 120);
        if (!input || !statType) return [];
        const pointer = text(input.pointer, 300);
        return [{ statType, ...(pointer?.startsWith("/") ? { pointer } : {}), numericMetrics: statistics(input.numericMetrics) }];
      });
    } else {
      const safe = text(item);
      if (safe !== null) output[key] = safe;
    }
  }
  return output;
}
