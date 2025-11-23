-- Create schools table
create table if not exists schools (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  logo_url text,
  city text,
  state text,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create teams table
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  logo_url text,
  school_id uuid references schools(id) on delete set null,
  sport text,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add indexes for search performance
create index if not exists schools_name_idx on schools(name);
create index if not exists schools_slug_idx on schools(slug);
create index if not exists teams_name_idx on teams(name);
create index if not exists teams_slug_idx on teams(slug);
create index if not exists teams_school_id_idx on teams(school_id);

-- Add new columns to players table for foreign keys
-- Keep old text columns temporarily for migration
alter table players 
  add column if not exists school_id uuid references schools(id) on delete set null,
  add column if not exists team_id uuid references teams(id) on delete set null;

-- Add indexes for foreign keys
create index if not exists players_school_id_idx on players(school_id);
create index if not exists players_team_id_idx on players(team_id);

-- Create function to generate slug from name
create or replace function generate_slug(input_name text)
returns text as $$
begin
  return lower(regexp_replace(input_name, '[^a-z0-9]+', '-', 'g'));
end;
$$ language plpgsql immutable;

