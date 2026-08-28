-- =============================================================================
-- Phase 2A: legacy authorization and Data API exposure hardening.
--
-- This migration intentionally does not add organization or Media Graph tables.
-- It closes browser privilege-escalation paths before tenant authorization is
-- introduced, while preserving visible-player reads and owner-scoped writes.
-- =============================================================================

-- The baseline granted future public objects to browser roles. Supabase now
-- requires explicit Data API exposure, so remove those legacy defaults.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated;

-- Profiles are private account records. Browser users may create/read their
-- own row, but may update presentation fields only. Authorization (`role`) and
-- athlete association (`player_id`) remain server-controlled compatibility
-- fields until the platform-role migration is complete.
drop policy if exists "Allow all profile operations" on public.profiles;
drop policy if exists "profiles_admin_all" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_public_read" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_self_insert" on public.profiles;
drop policy if exists "profiles_self_update" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant insert (id, email, display_name, avatar_url) on table public.profiles to authenticated;
grant update (display_name, avatar_url) on table public.profiles to authenticated;

-- Keep the participant policies and remove the unconditional messaging paths.
drop policy if exists "Allow all attachment operations" on public.message_attachments;
drop policy if exists "Allow all message operations" on public.messages;
drop policy if exists "Allow all thread operations" on public.message_threads;
drop policy if exists "attachments_admin_all" on public.message_attachments;
drop policy if exists "messages_admin_all" on public.messages;
drop policy if exists "threads_admin_all" on public.message_threads;

revoke all on table public.message_attachments from anon;
revoke all on table public.messages from anon;
revoke all on table public.message_threads from anon;

-- Preserve authenticated participant behavior through the existing RLS
-- policies, but make the required table privileges explicit.
revoke all on table public.message_attachments from authenticated;
grant select, insert, delete on table public.message_attachments to authenticated;
revoke all on table public.messages from authenticated;
grant select, insert, update, delete on table public.messages to authenticated;
revoke all on table public.message_threads from authenticated;
grant select, insert, update on table public.message_threads to authenticated;

-- Player creation must bind the row to the caller; public reads must respect
-- visibility. The stricter owner/public policies already exist in the baseline.
drop policy if exists "Users can create players" on public.players;
drop policy if exists "players_public_read" on public.players;

revoke all on table public.players from anon, authenticated;
grant select on table public.players to anon;
grant select, insert, update, delete on table public.players to authenticated;

-- Colleges is reference data. Browser roles may read it but cannot mutate it.
drop policy if exists "Public profiles are insertable by everyone." on public."Colleges";
drop policy if exists "Public profiles are updatable by everyone." on public."Colleges";

revoke all on table public."Colleges" from anon, authenticated;
grant select on table public."Colleges" to anon, authenticated;
revoke all on sequence public."Colleges_id_seq" from anon, authenticated;

-- These functions are invoked only by triggers or server-side service clients.
-- Direct browser execution bypasses the intended route authorization boundary.
revoke all on function public.append_pipeline_event(uuid, jsonb)
  from public, anon, authenticated;
revoke all on function public.claim_pipeline_run(uuid, integer)
  from public, anon, authenticated;
revoke all on function public.publish_onboarding_run(
  uuid, uuid, jsonb, jsonb, text, jsonb, uuid, text
) from public, anon, authenticated;
revoke all on function public.create_reciprocal_teammate()
  from public, anon, authenticated;
revoke all on function public.handle_new_user()
  from public, anon, authenticated;
revoke all on function public.handle_profile_updated_at()
  from public, anon, authenticated;
revoke all on function public.set_updated_at()
  from public, anon, authenticated;
revoke all on function public.set_updated_at_now()
  from public, anon, authenticated;
revoke all on function public.update_thread_last_message_at()
  from public, anon, authenticated;
revoke all on function public.update_updated_at_column()
  from public, anon, authenticated;

comment on column public.profiles.role is
  'Legacy UI compatibility role. Privileged authorization migrates to platform role assignments; browser writes are forbidden.';
comment on column public.profiles.player_id is
  'Server-controlled link to the canonical athlete row; browser writes are forbidden.';
