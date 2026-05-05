-- =============================================================================
-- 20260505000001_onboarding_followups.sql
-- Follow-up additions discovered while wiring the claim/publish flow.
--
-- 1. `media.kind`        — distinguish photos from videos.
-- 2. `media.source_url`  — provenance link surfaced to athletes during claim.
-- 3. `onboarding_pipeline_runs.claim_player_id` + `claim_token` — let claim
--    flows reuse the same Review screen as self-serve.
-- 4. `players.headshot_url` — fast-path locker headshot, separate from the
--    multi-photo media table.
-- =============================================================================

alter table media
  add column if not exists kind text not null default 'photo'
    check (kind in ('photo','headshot','video','document')),
  add column if not exists source_url text;

create index if not exists media_player_kind_idx on media(player_id, kind);

alter table onboarding_pipeline_runs
  add column if not exists claim_player_id uuid references players(id) on delete set null,
  add column if not exists claim_token text references claim_tokens(token) on delete set null;

alter table players
  add column if not exists headshot_url text;
