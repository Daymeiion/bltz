import type { ScraperResult } from "@/lib/pipeline/types";
import { evaluateSource, remoteAssetReference, sourceProvenance, policyDiagnostics } from "./policy";
/** Defense before synthesis/persistence, in addition to mandatory pre-request gates. */
export function policyCheckedResult(result: ScraperResult): ScraperResult {
  const urls = result.urls ?? [];
  const source_policy = policyDiagnostics(urls, "EXTRACT_METADATA");
  const rejected = urls.some(url => !evaluateSource(url).allowed_actions.includes("EXTRACT_METADATA"));
  if (rejected) return { source: result.source, ok: false, reason: "blocked", source_policy };
  const provenance = urls.slice(0, 12).map(url => sourceProvenance(url, result.source));
  const facts = result.facts ? { ...result.facts } : undefined;
  if (facts?.awards) facts.awards = facts.awards.filter(a => evaluateSource(a.source_url).allowed_actions.includes("EXTRACT_METADATA"));
  if (facts?.photos) facts.photos = facts.photos.flatMap(photo => remoteAssetReference(photo.url)
    ? [{ ...photo, source_url: photo.source_url ?? urls[0], provenance: sourceProvenance(photo.url, result.source) }] : []);
  if (facts?.youtube_urls) facts.youtube_urls = facts.youtube_urls.filter(url => evaluateSource(url).allowed_actions.includes("PERSIST_METADATA"));
  return { ...result, facts, provenance, source_policy };
}
