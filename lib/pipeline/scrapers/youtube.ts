import type { PlayerIdentityInput, ScraperResult } from "../types";

/**
 * YouTube scraper. Avoids the official Data API (it requires a key and
 * generates billing). Instead we hit the public results page and parse
 * out the watch links from the embedded `ytInitialData` JSON.
 *
 * If the page changes shape, we fail soft — `ok: false, reason: "blocked"`.
 */

function buildQuery(identity: PlayerIdentityInput): string {
  return [identity.full_name, identity.school, "highlights"]
    .filter(Boolean)
    .join(" ");
}

function extractVideoIds(html: string, max = 8): string[] {
  // Watch URLs appear as `"watchEndpoint":{"videoId":"<11 chars>"}` and as
  // `"videoId":"<11 chars>"` next to renderer keys. We match the latter
  // because it's the most common shape.
  const out = new Set<string>();
  const re = /"videoId":"([A-Za-z0-9_-]{11})"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    out.add(m[1]);
    if (out.size >= max) break;
  }
  return Array.from(out);
}

export async function scrapeYouTube(
  identity: PlayerIdentityInput,
): Promise<ScraperResult> {
  const query = buildQuery(identity);
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 6000);
    const r = await fetch(url, {
      signal: ctl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; BLTZ-OnboardBot/1.0; +https://bltz.com/bots)",
      },
    });
    clearTimeout(t);
    if (!r.ok) {
      return { source: "youtube", ok: false, reason: "blocked" };
    }
    const html = await r.text();
    const ids = extractVideoIds(html);
    if (!ids.length) return { source: "youtube", ok: false, reason: "no_match" };
    const youtube_urls = ids.map((id) => `https://www.youtube.com/watch?v=${id}`);
    return {
      source: "youtube",
      ok: true,
      facts: { youtube_urls },
      urls: [url],
    };
  } catch {
    return { source: "youtube", ok: false, reason: "timeout" };
  }
}
