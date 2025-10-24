-- supabase/migrations/20251023_create_awards.sql
create table if not exists awards (
  id bigserial primary key,
  player_id text not null,
  player_name text not null,
  award_name text not null,
  award_short_desc text not null,
  year text not null, -- store as text to allow ranges like '2004–2005'
  level text check (level in ('HS','College','Pro')),
  team_or_school text,
  league text,
  source_site text not null,
  source_url text not null,
  accessed_at timestamptz default now(),
  evidence_quote text,
  extractor_confidence numeric,
  extractor_version text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists awards_player_idx on awards(player_id);
create index if not exists awards_name_year_idx on awards(award_name, year);
