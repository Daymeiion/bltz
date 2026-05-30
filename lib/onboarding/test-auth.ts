import type { PipelineDraft, PipelineEvent, PlayerIdentityInput } from "@/lib/pipeline/types";
import type { PipelineSink } from "@/lib/pipeline/run";

export const TEST_AUTH_COOKIE = "bltz_test_auth";
export const TEST_USER_ID = "00000000-0000-4000-8000-000000000001";

export type TestRunStatus =
  | "pending"
  | "scraping"
  | "generating"
  | "complete"
  | "error"
  | "manual";

export interface TestRun {
  id: string;
  user_id: string;
  status: TestRunStatus;
  identity: PlayerIdentityInput;
  events: PipelineEvent[];
  draft: PipelineDraft;
  error?: string;
  started_at?: string;
  completed_at?: string;
}

declare global {
  var __bltzTestRuns: Map<string, TestRun> | undefined;
}

export function isTestAuthEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.TEST_AUTH_ENABLED === "true";
}

export async function getTestUser() {
  if (!isTestAuthEnabled()) return null;
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  return cookieStore.get(TEST_AUTH_COOKIE)?.value === "1"
    ? { id: TEST_USER_ID, email: "test-player@bltz.local" }
    : null;
}

export function getTestRuns() {
  globalThis.__bltzTestRuns ??= new Map<string, TestRun>();
  return globalThis.__bltzTestRuns;
}

function emptyDraft(identity: PlayerIdentityInput): PipelineDraft {
  return {
    full_name: identity.full_name,
    bio: "",
    awards: [],
    youtube_urls: [],
    photos: [],
    confirmed: { bio: false, dob: false, height_in: false, weight_lbs: false, games_played: false },
    sources: [],
    position: identity.position ?? null,
    school: identity.school ?? null,
    level: identity.level ?? null,
  };
}

function inMemorySink(runId: string): PipelineSink {
  return {
    emit(event) {
      const run = getTestRuns().get(runId);
      if (!run) return;
      run.events = [...run.events, event];
    },
    setStatus(status, patch = {}) {
      const run = getTestRuns().get(runId);
      if (!run) return;
      run.status = status as TestRunStatus;
      if (patch.draft) run.draft = patch.draft;
      if (patch.error) run.error = patch.error;
      if (patch.started_at) run.started_at = patch.started_at;
      if (patch.completed_at) run.completed_at = patch.completed_at;
    },
  };
}

// Mirror of run.ts RECLAIM_STALE_MS so the test harness exercises the same
// claim/reclaim semantics as production.
const RECLAIM_STALE_MS = 180_000;

/**
 * Create a test-mode run. Inserts a `pending` run and returns it WITHOUT
 * kicking the pipeline — execution is started by the SSE route via
 * `claimTestRun`, exactly like production now starts it from the SSE
 * connection (see lib/pipeline/run.ts claimAndRun). This keeps the test path
 * faithful to the real durable-execution flow so it's actually verifiable
 * locally.
 */
export function createTestRun(identity: PlayerIdentityInput) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const run: TestRun = {
    id,
    user_id: TEST_USER_ID,
    status: "pending",
    identity,
    draft: emptyDraft(identity),
    events: [
      { at: now, phase: "queued", message: `Starting search for ${identity.full_name}…` },
    ],
  };
  getTestRuns().set(id, run);
  return run;
}

/**
 * In-memory analogue of run.ts claimAndRun: compare-and-set `pending` →
 * `scraping` (or reclaim a stale in-flight run), then drive the real pipeline
 * against the in-memory sink. Returns true if THIS call claimed the run.
 * Single-threaded JS means the CAS can't truly race, but the status guard
 * matches production so a second SSE connection just streams.
 */
export function claimTestRun(id: string): boolean {
  const run = getTestRuns().get(id);
  if (!run) return false;

  const startedAtMs = run.started_at ? Date.parse(run.started_at) : 0;
  const stale =
    (run.status === "scraping" || run.status === "generating") &&
    Date.now() - startedAtMs > RECLAIM_STALE_MS;
  if (run.status !== "pending" && !stale) return false;

  run.status = "scraping";
  run.started_at = new Date().toISOString();

  // Imported lazily so this module doesn't drag pipeline code into client
  // bundles that only need the cookie helpers.
  void (async () => {
    try {
      const { executePipeline } = await import("@/lib/pipeline/run");
      await executePipeline(inMemorySink(id), run.identity);
    } catch (e: any) {
      const r = getTestRuns().get(id);
      if (r) {
        r.events.push({
          at: new Date().toISOString(),
          phase: "error",
          message: `Pipeline failed: ${e?.message ?? "unknown error"}`,
        });
        r.status = "manual";
        r.error = e?.message ?? String(e);
      }
    }
  })();

  return true;
}

export function getTestRun(id: string) {
  return getTestRuns().get(id) ?? null;
}
