-- =============================================================================
-- 20261102160000_crm_pilot_media_uploads.sql
-- Enterprise CRM pilot: schools upload highlight video and images, attach
-- Getty Images editorial media, and attach media to activations.
--
-- Uploads go to a private bucket through one-time signed upload links issued
-- by the authorized workspace API. Nothing in it is public: BLTZ reviews each
-- item before anything reaches a Locker.
--
-- Requires 20261102140000_crm_pilot_locker_launches.sql. Server-only.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'organization-athlete-media', 'organization-athlete-media', false, 262144000,
  array['video/mp4', 'video/webm', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

alter table public.organization_athlete_media
  add column if not exists source text not null default 'link'
    check (source in ('link', 'upload', 'getty')),
  add column if not exists storage_path text
    check (storage_path is null or (char_length(storage_path) <= 300 and storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(mp4|webm|mov|jpg|png|webp)$')),
  add column if not exists thumb_url text
    check (thumb_url is null or (char_length(thumb_url) <= 2048 and thumb_url ~ '^https://')),
  add column if not exists external_id text
    check (external_id is null or char_length(external_id) <= 80),
  add column if not exists activation_id uuid
    references public.organization_activations(id) on delete restrict;

alter table public.organization_athlete_media
  drop constraint if exists organization_athlete_media_subject;
alter table public.organization_athlete_media
  add constraint organization_athlete_media_subject
  check (player_id is not null or launch_id is not null or activation_id is not null);

alter table public.organization_athlete_media
  drop constraint if exists organization_athlete_media_source_shape;
alter table public.organization_athlete_media
  add constraint organization_athlete_media_source_shape check (
    (source = 'upload' and storage_path is not null) or
    (source = 'getty' and external_id is not null and url is not null) or
    (source = 'link' and storage_path is null)
  );

create index if not exists organization_athlete_media_activation_idx
  on public.organization_athlete_media (activation_id)
  where activation_id is not null;
