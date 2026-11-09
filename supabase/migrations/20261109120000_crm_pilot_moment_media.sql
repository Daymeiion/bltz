-- =============================================================================
-- 20261109120000_crm_pilot_moment_media.sql
-- Enterprise CRM pilot: schools attach media (uploads, Getty Images, archive
-- links) to a specific career Moment, so it is ready when they plan an
-- activation from that Moment.
--
-- moment_id names an Intelligence graph Moment. The workspace API only
-- accepts Moments that belong to the same former player. Server-only.
--
-- Requires 20261102160000_crm_pilot_media_uploads.sql.
-- =============================================================================

alter table public.organization_athlete_media
  add column if not exists moment_id text
    check (moment_id is null or char_length(moment_id) between 1 and 80);

create index if not exists organization_athlete_media_moment_idx
  on public.organization_athlete_media (organization_id, player_id, moment_id)
  where moment_id is not null;
