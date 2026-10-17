import "server-only";
import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { isIP } from "node:net";
import { isPreviewUrl } from "@/lib/preview-lockers/validation";
import { requireSourceAction } from "@/lib/source-policy/policy";
import { extractArticleMetadata } from "./article-metadata";

/** Deliberately restrict outbound metadata fetches to globally routable IPv4. */
export function isPublicAddress(address: string): boolean {
  if (isIP(address) !== 4) return false;
  const [a, b, c] = address.split(".").map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99)))
    || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113));
}
async function publicAddress(hostname: string, signal: AbortSignal) {
  let onAbort = () => {};
  try {
    const result = await Promise.race([
      lookup(hostname, { family: 4, all: true }),
      new Promise<never>((_, reject) => { onAbort = () => reject(new Error("metadata_timeout")); signal.addEventListener("abort", onAbort, { once: true }); if (signal.aborted) onAbort(); }),
    ]);
    if (!result.length || result.some(item => !isPublicAddress(item.address))) throw new Error("unsafe_destination");
    return result[0].address;
  } finally { signal.removeEventListener("abort", onAbort); }
}
async function fetchArticleHtml(input: string, parentSignal: AbortSignal): Promise<{ html: string; url: string }> {
  const signal = AbortSignal.any([parentSignal, AbortSignal.timeout(7000)]);
  let url = input;
  for (let redirects = 0; redirects <= 3; redirects++) {
    if (!isPreviewUrl(url) || signal.aborted) throw new Error("unsafe_destination");
    // Every redirected destination is a separate permission decision, before DNS.
    requireSourceAction(url, "EXTRACT_METADATA");
    requireSourceAction(url, "PERSIST_METADATA");
    const parsed = new URL(url);
    const address = await publicAddress(parsed.hostname, signal);
    const result = await new Promise<{ html?: string; location?: string }>((resolve, reject) => {
      const req = request(parsed, { signal, agent: false, family: 4,
        // Pin the validated IP while retaining hostname TLS verification and Host.
        lookup: (_hostname, _options, callback) => callback(null, address, 4),
        headers: { "User-Agent": "BLTZ-PreviewMetadata/1.0", Accept: "text/html,application/xhtml+xml", "Accept-Encoding": "identity" },
      }, res => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode ?? 0)) {
          const location = res.headers.location; res.destroy();
          if (!location) reject(new Error("invalid_redirect")); else resolve({ location });
          return;
        }
        if (res.statusCode !== 200 || !/^(text\/html|application\/xhtml\+xml)\b/i.test(res.headers["content-type"] ?? "")
          || (res.headers["content-encoding"] && res.headers["content-encoding"] !== "identity")) {
          res.destroy(); reject(new Error("metadata_blocked")); return;
        }
        const chunks: Buffer[] = []; let size = 0;
        res.on("data", (chunk: Buffer) => { size += chunk.length; if (size > 1_500_000) { res.destroy(); reject(new Error("metadata_too_large")); } else chunks.push(chunk); });
        res.on("end", () => resolve({ html: Buffer.concat(chunks).toString("utf8") }));
        res.on("error", reject);
        res.on("aborted", () => reject(new Error("metadata_aborted")));
      });
      req.on("error", reject); req.end();
    });
    if (result.html !== undefined) return { html: result.html, url };
    url = new URL(result.location!, url).href;
  }
  throw new Error("too_many_redirects");
}

/** The sanctioned public boundary returns metadata only, never publisher HTML. */
export async function fetchArticleMetadata(url: string, signal: AbortSignal) {
  const page = await fetchArticleHtml(url, signal);
  return extractArticleMetadata(page.html, page.url);
}
