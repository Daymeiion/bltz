-- Reference-only Player Master prospect cohorts for GTM.
--
-- public.nfl_players remains the canonical identity source. Selecting a player
-- stores only the stable GSIS reference and workflow provenance; it never
-- copies player identity fields into public.gtm_contacts and never creates a
-- public.players or Player Locker record.

create table if not exists public.gtm_player_prospects (
  gsis_id text primary key
    references public.nfl_players(gsis_id) on update cascade on delete restrict,
  selected_by uuid not null
    references auth.users(id) on delete restrict,
  selected_at timestamptz not null default now(),
  archived boolean not null default false,
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete set null,
  constraint gtm_player_prospects_archive_state_check check (
    (archived = false and archived_at is null and archived_by is null)
    or (archived = true and archived_at is not null and archived_by is not null)
  )
);

create index if not exists gtm_player_prospects_selected_by_idx
  on public.gtm_player_prospects (selected_by);

create index if not exists gtm_player_prospects_active_selected_at_idx
  on public.gtm_player_prospects (selected_at desc)
  where archived = false;

create index if not exists gtm_player_prospects_archived_by_idx
  on public.gtm_player_prospects (archived_by)
  where archived_by is not null;

alter table public.gtm_player_prospects enable row level security;

revoke all on table public.gtm_player_prospects from public, anon, authenticated;
grant select, insert, update on table public.gtm_player_prospects to authenticated;
grant all on table public.gtm_player_prospects to service_role;

drop policy if exists gtm_player_prospects_internal_admin_select
  on public.gtm_player_prospects;
create policy gtm_player_prospects_internal_admin_select
  on public.gtm_player_prospects
  for select
  to authenticated
  using ((select public.is_internal_admin()));

drop policy if exists gtm_player_prospects_internal_admin_insert
  on public.gtm_player_prospects;
create policy gtm_player_prospects_internal_admin_insert
  on public.gtm_player_prospects
  for insert
  to authenticated
  with check (
    (select public.is_internal_admin())
    and selected_by = (select auth.uid())
    and archived = false
    and archived_at is null
    and archived_by is null
  );

drop policy if exists gtm_player_prospects_internal_admin_update
  on public.gtm_player_prospects;
create policy gtm_player_prospects_internal_admin_update
  on public.gtm_player_prospects
  for update
  to authenticated
  using ((select public.is_internal_admin()))
  with check (
    (select public.is_internal_admin())
    and selected_by is not null
    and (
      (archived = false and archived_at is null and archived_by is null)
      or (
        archived = true
        and archived_at is not null
        and archived_by = (select auth.uid())
      )
    )
  );

comment on table public.gtm_player_prospects is
  'Private GTM cohort selections that reference canonical nfl_players by GSIS ID without duplicating player identity.';

comment on column public.gtm_player_prospects.gsis_id is
  'Stable foreign-key reference to the canonical Player Master row.';

-- Recovery: drop public.gtm_player_prospects. Canonical Player Master and GTM
-- contacts are unaffected because no identity fields are copied.
