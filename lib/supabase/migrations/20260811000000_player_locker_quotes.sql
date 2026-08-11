-- Athlete-managed quote shown on the public Player Locker.

alter table public.player_lockers
  add column if not exists quote_text text,
  add column if not exists quote_author text;

alter table public.player_lockers enable row level security;

drop policy if exists "Athletes can insert their locker quote" on public.player_lockers;
create policy "Athletes can insert their locker quote"
  on public.player_lockers for insert
  with check (
    exists (
      select 1
      from public.players
      where players.id = player_lockers.player_id
        and players.user_id = auth.uid()
    )
  );
drop policy if exists "Athletes can update their locker quote" on public.player_lockers;
create policy "Athletes can update their locker quote"
  on public.player_lockers for update
  using (
    exists (
      select 1
      from public.players
      where players.id = player_lockers.player_id
        and players.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.players
      where players.id = player_lockers.player_id
        and players.user_id = auth.uid()
    )
  );
