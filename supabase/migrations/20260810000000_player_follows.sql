-- User-owned follow relationships for public Player Lockers.

create table if not exists public.player_follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, player_id)
);

create index if not exists player_follows_player_created_idx
  on public.player_follows (player_id, created_at desc);

alter table public.player_follows enable row level security;

drop policy if exists "Users can read their follows" on public.player_follows;
create policy "Users can read their follows"
  on public.player_follows for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their follows" on public.player_follows;
create policy "Users can create their follows"
  on public.player_follows for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their follows" on public.player_follows;
create policy "Users can delete their follows"
  on public.player_follows for delete
  using (auth.uid() = user_id);
