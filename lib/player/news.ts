import "server-only";
import { unstable_cache } from "next/cache";
import { discoverNews, type NewsIdentity, type NewsResult } from "@/lib/enrichment/news";
import { configuredSearchProvider } from "@/lib/enrichment/search-provider";
import { fetchArticleMetadata } from "@/lib/enrichment/safe-fetch";
import { POLICY_VERSION } from "@/lib/source-policy/policy";

// The caller must first load a visible canonical player through its normal RLS
// client. Only public identity context enters this shared cache; no preview rows,
// cookies, service-role client, article bodies or private diagnostics are read.
type PublicNews = Pick<NewsResult, "articles" | "status">;
const unavailable = (): PublicNews => ({ articles: [], status: "unavailable" });
const cachedNews = unstable_cache(async (_playerId: string, identity: NewsIdentity): Promise<PublicNews> => {
  const result = await discoverNews(identity, configuredSearchProvider(), fetchArticleMetadata, AbortSignal.timeout(45_000));
  return { articles: result.articles, status: result.status };
}, ["public-player-news-v2", POLICY_VERSION], { revalidate: 3600 });

export async function readPublicPlayerNews(playerId: string, identity: NewsIdentity): Promise<PublicNews> {
  if (!configuredSearchProvider()) return unavailable();
  try { return await cachedNews(playerId, identity); }
  catch { return unavailable(); } // Optional discovery must never prevent opening a Locker.
}
