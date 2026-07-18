-- =============================================================================
-- 20260718000001_media_rights_requests.sql
-- Track scraped media candidates and outbound license-request workflow state.
-- =============================================================================

alter type media_provenance add value if not exists 'scraped_candidate';

alter table media
  add column if not exists license_request_status text not null default 'not_started'
    check (
      license_request_status in (
        'not_started',
        'queued',
        'sent',
        'responded',
        'approved',
        'denied',
        'error'
      )
    ),
  add column if not exists license_request_sent_at timestamptz,
  add column if not exists license_request_recipient_email text,
  add column if not exists license_request_recipient_name text,
  add column if not exists license_request_last_error text,
  add column if not exists license_requested_by uuid references auth.users(id) on delete set null;

update media
   set license_status = 'needs_review',
       public_locker_approved = false,
       license_request_status = case
         when license_request_status = 'not_started' then 'queued'
         else license_request_status
       end
 where provenance = 'scraped_candidate'
   and license_status = 'pending';

create index if not exists media_license_request_queue_idx
  on media(license_request_status, license_status, created_at)
  where public_locker_approved = false;
