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
import type { PipelineEvent, PlayerIdentityInput, ScraperResult } from "./types";

const RUN_TIMEOUT_MS = 45_000;

export interface StartArgs {
  userId: string;
  identity: PlayerIdentityInput;
}

export interface StartResult {
  runId: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Append an event to the run row. We read–modify–write because Postgres
 * jsonb append concatenation requires a custom function and the volume
 * here is tiny (≤ 30 events per run).
 */
async function emit(runId: string, event: PipelineEvent) {
  const sb = createServiceClient();
  const { data: row } = await sb
    .from("onboarding_pipeline_runs")
    .select("events")
    .eq("id", runId)
    .single();
  const prev: PipelineEvent[] = Array.isArray(row?.events) ? (row!.events as PipelineEvent[]) : [];
  await sb
    .from("onboarding_pipeline_runs")
    .update({ events: [...prev, event] })
    .eq("id", runId);
}

async function setStatus(runId: string, status: string, patch: Record<string, unknown> = {}) {
  const sb = createServiceClient();
  await sb
    .from("onboarding_pipeline_runs")
    .update({ status, ...patch })
    .eq("id", runId);
}

/**
 * Public entry point: start a run. Inserts the row, kicks off the work
 * in the background, and returns the runId immediately so the client can
 * subscribe to SSE.
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

  // Fire and forget. We don't await — the API route returns the runId
  // and the SSE channel takes over from here.
  void executeRun(data.id, identity).catch(async (e) => {
    await emit(data.id, {
      at: nowIso(),
      phase: "error",
      message: `Pipeline failed: ${e?.message ?? "unknown error"}`,
    });
    await setStatus(data.id, "manual", { error: e?.message ?? String(e) });
  });

  return { runId: data.id };
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

async function executeRun(runId: string, identity: PlayerIdentityInput) {
  await setStatus(runId, "scraping", { started_at: nowIso() });
  await emit(runId, {
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
        await emit(runId, {
          at: nowIso(),
          phase: "scrape_hit",
          source,
          url: result.urls?.[0],
          message: friendlyHit(source, result),
        });
      } else {
        await emit(runId, {
          at: nowIso(),
          phase: "scrape_miss",
          source,
          message: friendlyMiss(source, result.reason),
        });
      }
    } catch (e: any) {
      results.push({ source, ok: false, reason: "timeout" });
      await emit(runId, {
        at: nowIso(),
        phase: "scrape_miss",
        source,
        message: friendlyMiss(source, "timeout"),
      });
    }
  }

  await emit(runId, {
    at: nowIso(),
    phase: "scrape_done",
    message: "Cross-referencing the facts…",
  });

  await setStatus(runId, "generating");
  await emit(runId, {
    at: nowIso(),
    phase: "synthesis_started",
    message: "Drafting your locker bio…",
  });

  let draft;
  try {
    draft = await withTimeout(
      synthesize({ identity, results }),
      RUN_TIMEOUT_MS,
      "synthesize",
    );
  } catch (e: any) {
    await emit(runId, {
      at: nowIso(),
      phase: "manual_fallback",
      message: "I couldn't auto-draft this one — you can edit it yourself in a moment.",
    });
    await setStatus(runId, "manual", {
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

  await emit(runId, {
    at: nowIso(),
    phase: "synthesis_done",
    message: `Found ${draft.awards.length} awards, ${draft.youtube_urls.length} videos, ${draft.photos.length} photos.`,
  });

  await emit(runId, {
    at: nowIso(),
    phase: "complete",
    message: "Your draft locker is ready.",
  });
  await setStatus(runId, "complete", {
    draft,
    completed_at: nowIso(),
  });
}

function friendlyHit(source: string, r: ScraperResult): string {
  if (source === "wikipedia") return "Found a Wikipedia bio.";
  if (source === "espn") return "Read your ESPN page.";
  if (source === "youtube")
    return `Pulled ${r.facts?.youtube_urls?.length ?? 0} highlight videos.`;
  return `Source ${source} hit.`;
}

function friendlyMiss(source: string, reason?: string): string {
  if (reason === "blocked") return `${source}: blocked, skipping.`;
  if (reason === "timeout") return `${source}: timed out.`;
  if (reason === "not_found") return `${source}: nothing matched.`;
  return `${source}: not available.`;
}
