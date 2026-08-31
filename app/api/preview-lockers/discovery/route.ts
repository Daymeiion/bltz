import { executePipeline, type PipelineSink } from "@/lib/pipeline/run";
import { previewIdentity } from "@/lib/preview-lockers/validation";
import { discoveryDraft } from "@/lib/preview-lockers/discovery";
import { previewAdmin, readBody, failure, PreviewError, PRIVATE_HEADERS } from "@/lib/preview-lockers/server";

export const runtime = "nodejs";
export const maxDuration = 120;
const TIME_LIMIT_MS = 90_000;

export async function POST(req: Request) {
  try {
    const { client } = await previewAdmin();
    const parsed = previewIdentity.safeParse(await readBody(req, 4096));
    if (!parsed.success) throw new PreviewError("invalid_input", 400);
    if (req.signal.aborted) throw new PreviewError("cancelled", 400);
    const admission = await client.rpc("admit_preview_discovery");
    if (admission.error) throw new PreviewError("discovery_unavailable", 503);
    if (!admission.data) throw new PreviewError("discovery_rate_limited", 429);
    const identity = parsed.data;
    let stopped = false; let terminal = false; let timer: ReturnType<typeof setTimeout> | undefined;
    let cleanup = () => {};
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder(); let count = 0;
        const send = (type: string, value: unknown) => {
          if (stopped || req.signal.aborted) throw new Error("cancelled");
          if (type !== "done" && ++count > 40) throw new Error("event_limit");
          controller.enqueue(encoder.encode(`event: ${type}\ndata: ${JSON.stringify(value)}\n\n`));
        };
        const finish = () => {
          if (!stopped) { stopped = true; controller.close(); }
          clearTimeout(timer); req.signal.removeEventListener("abort", finish);
        };
        cleanup = finish;
        const complete = (value: unknown) => {
          if (terminal || stopped || req.signal.aborted) return;
          terminal = true;
          send("done", value);
        };
        req.signal.addEventListener("abort", finish, { once: true });
        if (req.signal.aborted) { finish(); return; }
        timer = setTimeout(() => {
          try { complete({ status: "timeout", error: "Discovery timed out. Continue with a manual preview." }); }
          finally { finish(); }
        }, TIME_LIMIT_MS);
        const sink: PipelineSink = {
          emit(event) {
            if (terminal || stopped || req.signal.aborted) throw new Error("cancelled");
            // Do not forward raw provider error messages, URLs, names or source payloads.
            send("event", { phase: event.phase, message: event.phase === "scrape_hit" ? "A source returned suggestions." : event.phase === "scrape_miss" ? "A source was unavailable or had no match." : "Preparing discovery suggestions…" });
          },
          setStatus(status, patch) {
            if (terminal || stopped || req.signal.aborted) throw new Error("cancelled");
            if (["complete", "manual", "error"].includes(status)) {
              complete({ status, draft: discoveryDraft(identity, patch?.draft), error: status === "error" ? "Sources are unavailable. You can create a manual preview." : null });
            }
          },
        };
        try { await executePipeline(sink, identity); }
        catch { complete({ status: "manual", draft: discoveryDraft(identity), error: "Discovery unavailable. Continue manually." }); }
        finally {
          complete({ status: "manual", draft: discoveryDraft(identity) });
          finish();
        }
      },
      cancel() { stopped = true; cleanup(); },
    });
    return new Response(stream, { headers: { ...PRIVATE_HEADERS, "Content-Type": "text/event-stream", "X-Accel-Buffering": "no" } });
  } catch (error) { return failure(error); }
}
