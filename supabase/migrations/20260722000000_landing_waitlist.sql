-- =============================================================================
-- 20260722000000_landing_waitlist.sql
-- Public landing-page waitlist for athletes who want to claim their Locker.
-- =============================================================================

create table if not exists landing_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text,
  sport text,
  school text,
  playing_level text
    check (playing_level is null or playing_level in ('hs', 'cfb', 'pro', 'former')),
  current_content_gap text,
  newsletter_opt_in boolean not null default true,
  source text not null default 'claim_locker_landing',
  status text not null default 'new'
    check (status in ('new', 'contacted', 'invited', 'claimed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists landing_waitlist_email_key
  on landing_waitlist (email);

create index if not exists landing_waitlist_status_created_idx
  on landing_waitlist (status, created_at desc);

alter table landing_waitlist enable row level security;

drop trigger if exists landing_waitlist_set_updated_at on landing_waitlist;
create trigger landing_waitlist_set_updated_at
  before update on landing_waitlist
  for each row execute function set_updated_at_now();
