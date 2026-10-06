import "server-only";
import { requireSourceAction } from "./policy";
/** Raw responses are restricted to registered single-player adapters, never arbitrary discovery URLs.
 * Metadata-only sources use fetchArticleMetadata, which does not expose HTML.
 * Redirects are deliberately refused: endpoint permission does not transfer to another URL.
 */
export async function fetchSourceFacts(url: string, init: RequestInit = {}): Promise<Response> {
  requireSourceAction(url, "EXTRACT_FACTS");
  requireSourceAction(url, "PERSIST_FACTS");
  return fetch(url, { ...init, cache: "no-store", redirect: "error", signal: init.signal ?? AbortSignal.timeout(8000) });
}
