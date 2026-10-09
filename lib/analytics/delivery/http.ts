import "server-only";

export class AnalyticsBodyLimitError extends Error {}

/** Bound both declared and streamed bytes; content-length alone is untrusted. */
export async function readBoundedBody(input: Request | Response, maxBytes: number, timeoutMs = 15_000): Promise<string> {
  const declared = input.headers.get("content-length");
  if (declared !== null && Number(declared) > maxBytes) throw new AnalyticsBodyLimitError("analytics_body_too_large");
  if (!input.body) return "";
  const reader = input.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let count = 0;
  let body = "";
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { reject(new Error("analytics_body_timeout")); void reader.cancel(); }, timeoutMs);
  });
  try {
    while (true) {
      const result = await Promise.race([reader.read(), timeout]);
      if (result.done) break;
      count += result.value.byteLength;
      if (count > maxBytes) {
        await reader.cancel();
        throw new AnalyticsBodyLimitError("analytics_body_too_large");
      }
      body += decoder.decode(result.value, { stream: true });
    }
    return body + decoder.decode();
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
}
