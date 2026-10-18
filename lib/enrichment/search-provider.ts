import "server-only";
import type { SearchProvider } from "./news";
import { tavilySearch } from "@/lib/search/tavily";
import { domainMatches } from "@/lib/source-policy/policy";

/** Provider choice is isolated from persisted article/domain types. */
export function configuredSearchProvider(options: { reviewTitles?: boolean } = {}): SearchProvider | null {
  if (!process.env.TAVILY_API_KEY?.trim()) return null;
  return {
    name: "tavily",
    async search(query, signal, searchOptions) {
      const domains = [...(searchOptions?.includeDomains ?? [])];
      const results = await tavilySearch(query, 6, {
        includeDomains: domains,
        timeoutMs: 15000,
        searchDepth: "advanced",
        signal,
      });
      // Provider snippets and ranking scores are not athlete identity evidence.
      return results.filter(({ url }) => !domains.length || domains.some(domain => domainMatches(new URL(url).hostname.toLowerCase(), domain)))
        .map(({ url, title }) => ({ url, ...(options.reviewTitles ? { title } : {}) }));
    },
  };
}
