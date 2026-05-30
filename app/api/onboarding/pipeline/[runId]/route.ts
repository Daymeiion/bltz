import { createClient } from "@/lib/supabase/server";
import type { PipelineEvent } from "@/lib/pipeline/types";
import { claimTestRun, getTestRun, getTestUser } from "@/lib/onboarding/test-auth";

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
  const testUser = await getTestUser();
  const testRun = testUser ? getTestRun(runId) : null;
  if (testRun) {
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const enc = new TextEncoder();
        const send = (event: string, payload: unknown) => {
          controller.enqueue(
            enc.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`),
          );
        };

        // Replay any events already on the run, then poll the in-memory map
        // until the pipeline reaches a terminal state. The test-auth path
        // drives the real scraper + synthesis pipeline against this same
        // map (see lib/onboarding/test-auth.createTestRun), so the loader
        // UI sees the same event timing it would in production.
        // Claim + drive the pipeline from this connection, mirroring the
        // production SSE-driven flow. Exactly-once: a second connection just
        // streams. No-op if already terminal/owned.
        claimTestRun(runId);

        let lastIdx = 0;
        const startedAt = Date.now();
        try {
          while (Date.now() - startedAt < MAX_RUNTIME_MS) {
            const current = getTestRun(runId);
            if (!current) break;
            for (let i = lastIdx; i < current.events.length; i++) {
              send("event", current.events[i]);
            }
            lastIdx = current.events.length;
            if (
              current.status === "complete" ||
              current.status === "error" ||
              current.status === "manual"
            ) {
              send("done", {
                status: current.status,
                draft: current.draft,
                error: current.error ?? null,
              });
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, POLL_MS));
          }
        } finally {
          controller.close();
        }
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

      // Claim and drive the pipeline from THIS connection. The pipeline runs
      // as a background promise inside this SSE invocation; the open stream
      // keeps the serverless function alive until the run reaches a terminal
      // state. The claim is exactly-once (CAS), so a second tab just streams.
      // Awaited so the status flip lands before we start polling.
      const { claimAndRun } = await import("@/lib/pipeline/run");
      await claimAndRun(runId).catch(() => {
        // Claim failure is non-fatal: another connection may own the run, or
        // it'll be retried on the next reconnect. The poll loop still streams.
      });

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
