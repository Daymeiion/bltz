import { createClient } from "@/lib/supabase/server";
import type { PipelineEvent } from "@/lib/pipeline/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POLL_MS = 750;
const MAX_RUNTIME_MS = 90_000;

/**
 * Server-Sent Events stream over a single onboarding pipeline run.
 *
 * Polls the run row, sends each new event as it appears, and emits a
 * terminal `done` event once status is `complete`, `error`, or `manual`.
 *
 * Why polling instead of Supabase Realtime: keeps the runtime narrow
 * (no websocket egress, no extra channel quota) and the table is tiny.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("unauthorized", { status: 401 });

  // Confirm the run belongs to this user (RLS would also prevent it, but
  // we want a useful 404 message rather than an empty stream).
  const { data: run } = await supabase
    .from("onboarding_pipeline_runs")
    .select("id,status,events,draft,error,user_id")
    .eq("id", runId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!run) return new Response("not_found", { status: 404 });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      let lastIdx = 0;
      const startedAt = Date.now();

      function send(event: string, payload: unknown) {
        controller.enqueue(
          enc.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`),
        );
      }

      // Initial backfill — replay any events that already happened.
      const initial = (run.events ?? []) as PipelineEvent[];
      for (const ev of initial) send("event", ev);
      lastIdx = initial.length;

      // If the run is already terminal, finish immediately.
      if (["complete", "error", "manual"].includes(run.status)) {
        send("done", { status: run.status, draft: run.draft, error: run.error });
        controller.close();
        return;
      }

      send("ping", { t: Date.now() });

      const sb = supabase;
      const interval = setInterval(async () => {
        if (Date.now() - startedAt > MAX_RUNTIME_MS) {
          send("done", { status: "timeout", error: "stream timeout" });
          clearInterval(interval);
          controller.close();
          return;
        }
        const { data: cur } = await sb
          .from("onboarding_pipeline_runs")
          .select("status,events,draft,error")
          .eq("id", runId)
          .maybeSingle();
        if (!cur) return;
        const events = (cur.events ?? []) as PipelineEvent[];
        for (let i = lastIdx; i < events.length; i++) send("event", events[i]);
        lastIdx = events.length;
        if (["complete", "error", "manual"].includes(cur.status)) {
          send("done", { status: cur.status, draft: cur.draft, error: cur.error });
          clearInterval(interval);
          controller.close();
        }
      }, POLL_MS);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
