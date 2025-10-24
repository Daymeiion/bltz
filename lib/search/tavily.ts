// lib/search/tavily.ts
// Simple Tavily wrapper. Replace with Bing/SerpAPI if preferred.
export type SearchResult = { title: string; url: string; snippet?: string };

export async function tavilySearch(query: string, max_results = 6): Promise<SearchResult[]> {
  const r = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.TAVILY_API_KEY || ""}`
    },
    body: JSON.stringify({
      query,
      max_results,
      include_domains: [
        "wikipedia.org","pro-football-reference.com","espn.com","nfl.com",
        "247sports.com","rivals.com","on3.com",".edu"
      ]
    })
  });
  if (!r.ok) throw new Error(`Tavily error: ${r.status}`);
  const json = await r.json();
  return (json.results || []).map((x: any) => ({
    title: x.title, url: x.url, snippet: x.snippet
  }));
}
