import "server-only";
import type { SearchProvider } from "./news";
import { tavilySearch } from "@/lib/search/tavily";

/** Provider choice is isolated from persisted article/domain types. */
export function configuredSearchProvider(): SearchProvider | null {
  if (!process.env.TAVILY_API_KEY?.trim()) return null;
  return {
    name: "tavily",
    async search(query, signal) {
      const results = await tavilySearch(query, 6, {
        includeDomains: [],
        timeoutMs: 15000,
        searchDepth: "advanced",
        signal,
      });
      // Provider snippets and ranking scores are not athlete identity evidence.
      return results.map(({ url }) => ({ url }));
    },
  };
}
