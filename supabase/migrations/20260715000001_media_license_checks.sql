-- =============================================================================
-- 20260715000000_media_license_checks.sql
-- Add explicit public-usage licensing metadata for media rows.
--
-- Player Locker photos are sourced from scraped media and athlete/team uploads.
-- These columns let BLTZ distinguish uploaded/owned assets from third-party
-- scrape candidates before they are displayed on public locker surfaces.
-- =============================================================================

alter table media
  add column if not exists license_status text not null default 'pending'
    check (license_status in ('pending', 'approved', 'rejected', 'needs_review')),
  add column if not exists license_kind text,
  add column if not exists rights_holder text,
  add column if not exists usage_terms text,
  add column if not exists public_locker_approved boolean not null default false,
  add column if not exists license_checked_at timestamptz,
  add column if not exists license_checked_by uuid references auth.users(id) on delete set null;

update media
   set public_locker_approved = true,
       license_status = case
         when license_status = 'pending' then 'approved'
         else license_status
       end,
       license_kind = coalesce(license_kind, 'owned_or_uploaded')
 where provenance in ('athlete_uploaded', 'founder_archive', 'cal_archive')
   and public_locker_approved = false;

create index if not exists media_player_public_photo_idx
  on media(player_id, display_order)
  where kind = 'photo'
    and (
      public_locker_approved = true
      or provenance in ('athlete_uploaded', 'founder_archive', 'cal_archive')
    );
