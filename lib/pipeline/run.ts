/**
 * Onboarding pipeline orchestrator.
 *
 * Drives the scrapers, runs the synthesis gate, and streams human-readable
 * events into `onboarding_pipeline_runs.events`. The SSE route (
 * `app/api/onboarding/pipeline/[runId]/route.ts`) reads from the same row
 * and forwards new events to the browser.
 *
 * Designed to be called from a Node-runtime route handler — NOT from the
 * Edge runtime. Scrapers do their own fetches; we just orchestrate.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { SCRAPERS } from "./scrapers";
import { synthesize } from "./claude";
import {
  SOURCE_UNHEALTHY_REASONS,
  type PipelineDraft,
  type PipelineEvent,
  type PlayerIdentityInput,
  type ScraperResult,
} from "./types";

const RUN_TIMEOUT_MS = 45_000;

// If a run has been claimed (status scraping/generating) but its started_at is
// older than this, the claiming connection is presumed dead (tab closed, server
// reaped) and a fresh connection may re-claim and restart. Set above the worst-
// case pipeline runtime (~141s: 5 scrapers x 12s cap + 45s synthesis) so a
// healthy in-flight run is never stolen out from under itself.
const RECLAIM_STALE_MS = 180_000;

// Roster sources backed by our Supabase cache. When BOTH are unreachable at the
// same time it's the paused-dependency signature, not a missing athlete.
const DB_BACKED_SOURCES: ReadonlySet<string> = new Set(["nflverse", "cfbverse"]);

export interface StartArgs {
  userId: string;
  identity: PlayerIdentityInput;
}

export interface StartResult {
  runId: string;
}

/**
 * Sink the pipeline writes events and status into. The Supabase-backed
 * production sink writes to `onboarding_pipeline_runs`; the test-auth path
 * uses an in-memory map sink so the loader UI shows the real pipeline
 * without persisting test data.
 */
export interface PipelineSink {
  emit(event: PipelineEvent): Promise<void> | void;
  setStatus(
    status: string,
    patch?: {
      started_at?: string;
      completed_at?: string;
      draft?: PipelineDraft;
      error?: string;
    },
  ): Promise<void> | void;
}

function nowIso(): string {
  return new Date().toISOString();
}

function supabaseSink(runId: string): PipelineSink {
  return {
    async emit(event) {
      // Atomic append via the append_pipeline_event() Postgres function
      // (migration 20260530000000). The old read-modify-write here
      // (SELECT events → append in JS → UPDATE) dropped events the moment
      // two writers overlapped. `events || event` runs under a row lock so
      // concurrent appends serialize instead of clobbering each other.
      const sb = createServiceClient();
      await sb.rpc("append_pipeline_event", {
        p_run_id: runId,
        p_event: event,
      });
    },
    async setStatus(status, patch = {}) {
      const sb = createServiceClient();
      await sb
        .from("onboarding_pipeline_runs")
        .update({ status, ...patch })
        .eq("id", runId);
    },
  };
}

/**
 * Public entry point: start a run. Inserts a `pending` row and returns the
 * runId. It does NOT kick off the pipeline — that now happens inside the SSE
 * route (see `claimAndRun`), driven by the long-lived connection the client
 * holds open. The old design fired `void executePipeline(...)` here as a
 * background promise, which Vercel could freeze the moment this response
 * returned, stranding the run in `scraping` forever. Running the work in the
 * SSE invocation keeps it alive exactly as long as the client is watching.
 */
export async function startRun({ userId, identity }: StartArgs): Promise<StartResult> {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from("onboarding_pipeline_runs")
    .insert({
      user_id: userId,
      identity,
      status: "pending",
      events: [
        {
          at: nowIso(),
          phase: "queued",
          message: `Starting search for ${identity.full_name}…`,
        } satisfies PipelineEvent,
      ],
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "could not insert run");

  return { runId: data.id };
}

/**
 * Claim a run and drive it to completion. Called by the SSE route on connect.
 *
 * The claim is an atomic compare-and-set: flip `pending` → `scraping` (or
 * reclaim a `scraping`/`generating` run whose started_at is older than
 * RECLAIM_STALE_MS, i.e. the previous connection died). Postgres row-locks the
 * UPDATE, so if two connections race only one matches the WHERE and wins —
 * exactly-once execution without a queue.
 *
 * Returns true if THIS call claimed and started the run; false if another live
 * connection already owns it (the caller just streams existing events). The
 * pipeline runs as a background promise inside the SSE invocation; the open
 * stream keeps the function alive until it reaches a terminal state.
 */
export async function claimAndRun(runId: string): Promise<boolean> {
  const sb = createServiceClient();

  // Atomic CAS via claim_pipeline_run() (migration 20260530000000). Returns the
  // run identity if THIS call claimed it (pending, or stale reclaim), null if a
  // live connection already owns it. Doing this in a Postgres function keeps the
  // compare-and-set on the server under a row lock — testable directly in SQL,
  // and no fragile PostgREST filter string on the critical durability path.
  const { data } = await sb.rpc("claim_pipeline_run", {
    p_run_id: runId,
    p_reclaim_seconds: Math.floor(RECLAIM_STALE_MS / 1000),
  });

  if (!data) return false; // already owned by a live connection

  const identity = data as PlayerIdentityInput;
  const sink = supabaseSink(runId);
  void executePipeline(sink, identity).catch(async (e) => {
    await sink.emit({
      at: nowIso(),
      phase: "error",
      message: `Pipeline failed: ${e?.message ?? "unknown error"}`,
    });
    await sink.setStatus("manual", {
      error: e?.message ?? String(e),
      completed_at: nowIso(),
    });
  });
  return true;
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timeout`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/**
 * Run the pipeline against an arbitrary sink. Used by both the Supabase-
 * backed `startRun` and the in-memory test path in `lib/onboarding/test-auth`.
 */
export async function executePipeline(
  sink: PipelineSink,
  identity: PlayerIdentityInput,
) {
  await sink.setStatus("scraping", { started_at: nowIso() });
  await sink.emit({
    at: nowIso(),
    phase: "scrape_started",
    message: `Searching ${SCRAPERS.length} sources for ${identity.full_name}…`,
  });

  const results: ScraperResult[] = [];

  for (const { source, run } of SCRAPERS) {
    try {
      const result = await withTimeout(run(identity), 12_000, source);
      results.push(result);
      if (result.ok) {
        await sink.emit({
          at: nowIso(),
          phase: "scrape_hit",
          source,
          url: result.urls?.[0],
          message: friendlyHit(source, result),
        });
      } else {
        // Loud log ONLY when the source itself is unhealthy (down, throttled,
        // paused dependency) — a `no_match` / `ambiguous` is an expected miss
        // and stays quiet. This is the observability the paused-Supabase
        // incident was missing: it failed silently behind a clean "miss".
        if (result.reason && SOURCE_UNHEALTHY_REASONS.has(result.reason)) {
          console.warn(
            `[pipeline] source unhealthy source=${source} reason=${result.reason} athlete=${JSON.stringify(identity.full_name)}`,
          );
        }
        await sink.emit({
          at: nowIso(),
          phase: "scrape_miss",
          source,
          message: friendlyMiss(source, result.reason),
        });
      }
    } catch {
      results.push({ source, ok: false, reason: "timeout" });
      console.warn(
        `[pipeline] source unhealthy source=${source} reason=timeout athlete=${JSON.stringify(identity.full_name)}`,
      );
      await sink.emit({
        at: nowIso(),
        phase: "scrape_miss",
        source,
        message: friendlyMiss(source, "timeout"),
      });
    }
  }

  // Infra guard. If NOTHING succeeded and every source failed for a source-side
  // reason (unreachable/timeout/blocked), this is an outage, not a missing
  // athlete. Fail the run as `error` (retryable) instead of drafting an empty
  // locker and marking it `manual` — which would wrongly tell the athlete to
  // type their whole career in by hand when the real problem is our side.
  const anyHit = results.some((r) => r.ok);
  const everyFailureIsSourceSide =
    results.length > 0 &&
    results.every(
      (r) => !r.ok && r.reason != null && SOURCE_UNHEALTHY_REASONS.has(r.reason),
    );
  const dbBackedDown = results
    .filter((r) => DB_BACKED_SOURCES.has(r.source))
    .every((r) => !r.ok && r.reason != null && SOURCE_UNHEALTHY_REASONS.has(r.reason));

  if (!anyHit && everyFailureIsSourceSide) {
    console.error(
      `[pipeline] total source outage — all ${results.length} sources unhealthy (dbBackedDown=${dbBackedDown}) for athlete=${JSON.stringify(identity.full_name)}`,
    );
    await sink.emit({
      at: nowIso(),
      phase: "error",
      message:
        "Our data sources are temporarily unavailable. Give it a minute and try the search again.",
    });
    await sink.setStatus("error", {
      error: "all sources unreachable",
      completed_at: nowIso(),
    });
    return;
  }

  await sink.emit({
    at: nowIso(),
    phase: "scrape_done",
    message: "Cross-referencing the facts…",
  });

  await sink.setStatus("generating");
  await sink.emit({
    at: nowIso(),
    phase: "synthesis_started",
    message: "Drafting your locker bio…",
  });

  let draft: PipelineDraft;
  try {
    draft = await withTimeout(
      synthesize({ identity, results }),
      RUN_TIMEOUT_MS,
      "synthesize",
    );
  } catch (e: any) {
    await sink.emit({
      at: nowIso(),
      phase: "manual_fallback",
      message: "I couldn't auto-draft this one — you can edit it yourself in a moment.",
    });
    await sink.setStatus("manual", {
      draft: {
        full_name: identity.full_name,
        bio: "",
        confirmed: {},
        sources: [],
        awards: [],
        youtube_urls: [],
        photos: [],
        position: identity.position ?? null,
        school: identity.school ?? null,
        level: identity.level ?? null,
      },
      error: e?.message ?? String(e),
    });
    return;
  }

  await sink.emit({
    at: nowIso(),
    phase: "synthesis_done",
    message: `Found ${draft.awards.length} awards, ${draft.youtube_urls.length} videos, ${draft.photos.length} photos.`,
  });

  await sink.emit({
    at: nowIso(),
    phase: "complete",
    message: "Your draft locker is ready.",
  });
  await sink.setStatus("complete", {
    draft,
    completed_at: nowIso(),
  });
}

function friendlyHit(source: string, r: ScraperResult): string {
  if (source === "nflverse") {
    const team = r.facts?.pro_teams?.[0];
    return team ? `Matched the official NFL roster (${team}).` : "Matched the official NFL roster.";
  }
  if (source === "cfbverse") {
    const team = r.facts?.school;
    return team ? `Matched the official college roster (${team}).` : "Matched the official college roster.";
  }
  if (source === "wikipedia") return "Found a Wikipedia bio.";
  if (source === "espn") return "Read your ESPN page.";
  if (source === "youtube")
    return `Pulled ${r.facts?.youtube_urls?.length ?? 0} highlight videos.`;
  return `Source ${source} hit.`;
}

function friendlyMiss(source: string, reason?: ScraperResult["reason"]): string {
  // These messages feed the event log for debugging. The loader UI no longer
  // surfaces scrape-miss text to the athlete (the dimmed icon carries the
  // signal), so plain-language phrasing here is for our eyes.
  if (reason === "blocked") return `${source}: throttled, skipping.`;
  if (reason === "timeout") return `${source}: timed out.`;
  if (reason === "unreachable") return `${source}: source unavailable.`;
  if (reason === "no_match") return `${source}: nothing matched.`;
  if (reason === "ambiguous") return `${source}: multiple players share this name — needs school or position to confirm.`;
  return `${source}: not available.`;
}
