import type { PlayerIdentityInput, ScraperResult } from "../types";
import { fetchSourceFacts } from "@/lib/source-policy/fetch";

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

function extractVideoIds(html: string, fullName: string, max = 8): string[] {
  const normalizedName = normalizeName(fullName);
  if (!normalizedName || normalizedName.split(" ").length < 2) return [];
  const out = new Set<string>();
  const re = /"videoRenderer"\s*:\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const start = m.index + m[0].length - 1;
    const raw = balancedObject(html, start);
    if (!raw) continue;
    re.lastIndex = start + raw.length;
    try {
      const renderer = JSON.parse(raw) as { videoId?: string; title?: { runs?: Array<{ text?: string }>; simpleText?: string } };
      const title = renderer.title?.runs?.map(run => run.text ?? "").join("") ?? renderer.title?.simpleText ?? "";
      const normalizedTitle = normalizeName(title);
      if (renderer.videoId && /^[A-Za-z0-9_-]{11}$/.test(renderer.videoId)
        && (` ${normalizedTitle} `).includes(` ${normalizedName} `)) out.add(renderer.videoId);
    } catch { /* A malformed renderer is not evidence for a player match. */ }
    if (out.size >= max) break;
  }
  return Array.from(out);
}

function normalizeName(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function balancedObject(input: string, start: number): string | null {
  let depth = 0; let quoted = false; let escaped = false;
  for (let i = start; i < input.length; i++) {
    const char = input[i];
    if (quoted) { if (escaped) escaped = false; else if (char === "\\") escaped = true; else if (char === '"') quoted = false; continue; }
    if (char === '"') quoted = true;
    else if (char === "{") depth++;
    else if (char === "}" && --depth === 0) return input.slice(start, i + 1);
  }
  return null;
}

export async function scrapeYouTube(
  identity: PlayerIdentityInput,
): Promise<ScraperResult> {
  const query = buildQuery(identity);
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 6000);
    const r = await fetchSourceFacts(url, {
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
    const ids = extractVideoIds(html, identity.full_name);
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
