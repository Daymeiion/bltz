import { previewContent, type PreviewContent } from "./validation";

export async function readDiscovery(response: Response, onProgress: (text: string) => void): Promise<{ draft?: PreviewContent; message: string }> {
  if (!response.ok) throw new Error(response.status === 429
    ? "The scraper run was not started. The same player may have been searched less than 3 minutes ago, or this Admin account may have reached 50 successful or active scraper runs for the current UTC day. Failed and timed-out runs do not consume the daily allowance."
    : "Discovery unavailable. Your manual draft is still here.");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Discovery unavailable. Continue manually.");
  let policySummary = "";
  const totals = { discovered: 0, allowed: 0, reference_only: 0, rejected: 0 };
  const decoder = new TextDecoder(); let buffer = ""; let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 256 * 1024) throw new Error("Discovery response too large. Continue manually.");
      buffer += decoder.decode(value, { stream: true });
      let end: number;
      while ((end = buffer.indexOf("\n\n")) >= 0) {
        const block = buffer.slice(0, end); buffer = buffer.slice(end + 2);
        const event = block.match(/^event: (.+)$/m)?.[1];
        const raw = block.match(/^data: (.+)$/m)?.[1];
        if (!raw) continue;
        const data = JSON.parse(raw);
        if (event === "event") {
          const policy = data.source_policy;
          if (policy && [policy.discovered, policy.allowed, policy.reference_only, policy.rejected].every(v => Number.isInteger(v) && v >= 0 && v <= 100)) {
            for (const key of ["discovered", "allowed", "reference_only", "rejected"] as const) totals[key] += policy[key];
            policySummary = ` Source decisions: ${totals.discovered} discovered, ${totals.allowed} allowed, ${totals.reference_only} reference only, ${totals.rejected} blocked.`;
          }
          onProgress((typeof data.message === "string" ? data.message.slice(0, 200) : "Searching…") + policySummary);
        }
        if (event === "done") {
          const parsed = previewContent.safeParse(data.draft);
          return { draft: parsed.success ? parsed.data : undefined, message: data.status === "complete" ? "Suggestions ready. Review every field before saving; identity and rights are not verified." + policySummary : "Discovery did not complete. Review available suggestions or continue manually." };
        }
      }
    }
    throw new Error("Discovery disconnected. Your manual draft is still here.");
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
