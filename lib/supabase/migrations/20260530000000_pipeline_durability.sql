-- Onboarding pipeline durability (trimmed /autoplan plan, 2026-05-30)
--
-- Adds an atomic append for pipeline events so the event-write path is safe by
-- construction, not by the (currently true) single-writer argument. The old
-- path in lib/pipeline/run.ts supabaseSink.emit did SELECT events → append in
-- JS → UPDATE, a read-modify-write that loses events the moment two writers
-- overlap (a reclaimed/double-run, or the deferred scraper parallelization).
--
-- This function does the append in one statement under a row lock, so
-- concurrent appends serialize instead of clobbering each other.

create or replace function append_pipeline_event(p_run_id uuid, p_event jsonb)
returns void
language sql
as $$
  update onboarding_pipeline_runs
  set events = events || p_event
  where id = p_run_id;
$$;

comment on function append_pipeline_event(uuid, jsonb) is
  'Atomically append one event object to onboarding_pipeline_runs.events. Used by the pipeline sink so concurrent emits cannot drop events via read-modify-write.';

-- Atomic claim for SSE-driven pipeline execution. The pipeline no longer runs as
-- a fire-and-forget promise from the start route (Vercel could freeze it once the
-- response returned, stranding the run). It now runs inside the SSE connection,
-- claimed exactly once here: flip pending → scraping, or reclaim a
-- scraping/generating run whose started_at is older than the reclaim window
-- (previous connection died). The UPDATE row-locks, so racing SSE connections
-- serialize and only one wins. Returns the run identity if claimed, NULL if a
-- live connection already owns it.
create or replace function claim_pipeline_run(p_run_id uuid, p_reclaim_seconds int)
returns jsonb
language plpgsql
as $$
declare
  v_identity jsonb;
begin
  update onboarding_pipeline_runs
  set status = 'scraping', started_at = now()
  where id = p_run_id
    and (
      status = 'pending'
      or (
        status in ('scraping', 'generating')
        and started_at < now() - make_interval(secs => p_reclaim_seconds)
      )
    )
  returning identity into v_identity;
  return v_identity;
end;
$$;

comment on function claim_pipeline_run(uuid, int) is
  'Atomic compare-and-set claim for SSE-driven pipeline execution. Returns the run identity if claimed (pending, or stale reclaim), NULL if another live connection owns it.';
