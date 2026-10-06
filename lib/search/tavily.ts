import "server-only";
import { SearchProviderError } from "./errors";

export type SearchResult = { title: string; url: string; snippet?: string };

export async function tavilySearch(query: string, max_results = 6, options: { signal?: AbortSignal; includeDomains?: string[]; timeoutMs?: number; searchDepth?: "basic" | "advanced" } = {}): Promise<SearchResult[]> {
  const key = process.env.TAVILY_API_KEY?.trim();
  if (!key) throw new SearchProviderError("search_not_configured");
  if (!query.trim() || !Number.isFinite(max_results)) throw new SearchProviderError("search_invalid_request");
  const limit = Math.max(1, Math.min(20, Math.trunc(max_results)));
  const signal = AbortSignal.any([...(options.signal ? [options.signal] : []), AbortSignal.timeout(Math.max(1000, Math.min(15000, options.timeoutMs ?? 5000)))]);
  try {
    signal.throwIfAborted();
    const r = await fetch("https://api.tavily.com/search", {
      method: "POST",
      cache: "no-store",
      redirect: "error",
      signal,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        query: query.trim().slice(0, 400),
        max_results: limit,
        search_depth: options.searchDepth ?? "basic",
        topic: "general", // Career history is not restricted to recent news.
        auto_parameters: false,
        chunks_per_source: 1,
        include_raw_content: false,
        include_answer: false,
        include_images: false,
        include_domains: options.includeDomains ?? [
          "wikipedia.org","pro-football-reference.com","espn.com","nfl.com",
          "247sports.com","rivals.com","on3.com",".edu"
        ]
      })
    });
    if (!r.ok) {
      void r.body?.cancel().catch(() => {});
      throw new SearchProviderError(
        r.status === 401 || r.status === 403 ? "search_auth_failed" :
        r.status === 429 ? "search_rate_limited" :
        r.status === 432 || r.status === 433 ? "search_quota_exceeded" :
        r.status === 408 || r.status === 504 ? "search_timeout" :
        r.status >= 500 ? "search_unavailable" : "search_invalid_request",
      );
    }
    // Bound provider output before parsing, then project only known fields.
    const reader = r.body?.getReader();
    if (!reader) throw new SearchProviderError("search_invalid_response");
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        signal.throwIfAborted();
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 256 * 1024) throw new SearchProviderError("search_invalid_response");
        chunks.push(value);
      }
    } finally { void reader.cancel().catch(() => {}); }
    let json: unknown;
    try { json = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { throw new SearchProviderError("search_invalid_response"); }
    if (!json || typeof json !== "object" || !("results" in json) || !Array.isArray(json.results)) {
      throw new SearchProviderError("search_invalid_response");
    }
    // A malformed nonempty result set is failure, never an instruction to erase news.
    if (json.results.some(x => !x || typeof x !== "object" || typeof x.url !== "string" || !x.url.trim() || x.url.length > 2048)) {
      throw new SearchProviderError("search_invalid_response");
    }
    return json.results.slice(0, limit).map(x => ({
      title: typeof x.title === "string" ? x.title.slice(0, 500) : "", url: x.url,
      snippet: typeof x.content === "string" ? x.content.slice(0, 1200) : undefined,
    }));
  } catch (error) {
    if (signal.aborted) throw new SearchProviderError(signal.reason?.name === "TimeoutError" ? "search_timeout" : "search_aborted");
    if (error instanceof SearchProviderError) throw error;
    // Never expose fetch error messages or provider error bodies.
    if (error instanceof Error && error.name === "TimeoutError") throw new SearchProviderError("search_timeout");
    if (error instanceof Error && error.name === "AbortError") throw new SearchProviderError("search_aborted");
    throw new SearchProviderError("search_unavailable");
  }
}
