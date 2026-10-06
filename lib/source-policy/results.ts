import type { ScraperResult } from "@/lib/pipeline/types";
import { evaluateSource, remoteAssetReference, sourceProvenance, policyDiagnostics } from "./policy";
/** Defense before synthesis/persistence, in addition to mandatory pre-request gates. */
export function policyCheckedResult(result: ScraperResult): ScraperResult {
  const urls = result.urls ?? [];
  const factSources = result.fact_source_urls ?? urls;
  const hasFacts = result.facts && Object.keys(result.facts).length > 0;
  const source_policy = policyDiagnostics(hasFacts ? factSources : urls, hasFacts ? "PERSIST_FACTS" : "PERSIST_METADATA");
  // Reference metadata never authorizes biography/statistics merely because a
  // result object labels them "facts". Adapters retain the actual extraction URL.
  const rejected = urls.some(url => !evaluateSource(url).allowed_actions.includes("PERSIST_METADATA"))
    || (hasFacts && (!factSources.length || factSources.some(url => {
      const actions = evaluateSource(url).allowed_actions;
      return !actions.includes("EXTRACT_FACTS") || !actions.includes("PERSIST_FACTS");
    })));
  if (rejected) return { source: result.source, ok: false, reason: "blocked", source_policy };
  const provenance = [...new Set([...urls, ...factSources])].slice(0, 12).map(url => sourceProvenance(url, result.source));
  const facts = result.facts ? { ...result.facts } : undefined;
  if (facts?.awards) facts.awards = facts.awards.filter(a => {
    const actions = evaluateSource(a.source_url).allowed_actions;
    return actions.includes("EXTRACT_FACTS") && actions.includes("PERSIST_FACTS");
  });
  if (facts?.photos) facts.photos = facts.photos.flatMap(photo => remoteAssetReference(photo.url)
    ? [{ ...photo, source_url: photo.source_url ?? urls[0], provenance: sourceProvenance(photo.url, result.source) }] : []);
  if (facts?.youtube_urls) facts.youtube_urls = facts.youtube_urls.filter(url => evaluateSource(url).allowed_actions.includes("PERSIST_METADATA"));
  return { ...result, facts, provenance, source_policy };
}
