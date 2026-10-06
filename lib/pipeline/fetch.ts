/**
 * Tiny fetch helper for scrapers.
 *
 * Why not Playwright/cheerio: the bulk of the public sources we hit
 * (Wikipedia, ESPN, official rosters) ship server-rendered HTML that we
 * can read with raw fetch. Heavy headless tooling drags Vercel cold-start
 * times and adds CAPTCHA risk. We keep the surface narrow so we can swap
 * in a Playwright path later if a specific source needs JS execution.
 */

import { fetchSourceFacts } from "@/lib/source-policy/fetch";
import { requireSourceAction, SourcePolicyError } from "@/lib/source-policy/policy";

const DEFAULT_UA =
  "Mozilla/5.0 (compatible; BLTZ-OnboardBot/1.0; +https://bltz.com/bots)";

export interface FetchOpts {
  timeoutMs?: number;
  ua?: string;
}

export async function fetchHtml(
  url: string,
  opts: FetchOpts = {},
): Promise<{ ok: true; html: string; finalUrl: string } | { ok: false; reason: "blocked" | "timeout" | "not_found" | "network" }> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), opts.timeoutMs ?? 8000);
  try {
    const r = await fetchSourceFacts(url, {
      signal: ctl.signal,
      headers: {
        "User-Agent": opts.ua ?? DEFAULT_UA,
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (r.status === 404) return { ok: false, reason: "not_found" };
    if (r.status === 403 || r.status === 429) return { ok: false, reason: "blocked" };
    if (!r.ok) return { ok: false, reason: "network" };
    const finalUrl = r.url || url;
    requireSourceAction(finalUrl, "EXTRACT_FACTS");
    const reader = r.body?.getReader();
    if (!reader) return { ok: false, reason: "network" };
    const chunks: Uint8Array[] = []; let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.byteLength;
        if (size > 1024 * 1024) return { ok: false, reason: "blocked" };
        chunks.push(value);
      }
    } finally { void reader.cancel().catch(() => {}); }
    return { ok: true, html: new TextDecoder().decode(Buffer.concat(chunks)), finalUrl };
  } catch (error) {
    if (error instanceof SourcePolicyError) return { ok: false, reason: "blocked" };
    if (ctl.signal.aborted || error instanceof Error && error.name === "AbortError") return { ok: false, reason: "timeout" };
    return { ok: false, reason: "network" };
  } finally { clearTimeout(timer); }
}

/**
 * Strip HTML tags and condense whitespace. Good enough for first-pass
 * extraction; the LLM polish step will fix the prose.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function pickFirst<T>(...vals: (T | undefined | null)[]): T | undefined {
  for (const v of vals) if (v !== undefined && v !== null) return v;
  return undefined;
}
