-- Immutable feature input/output runs and a small guarded current pointer.
create table public.intelligence_engine_runs (
  id uuid primary key,
  environment text not null check(environment='development'),
  player_id uuid not null references public.players(id) on delete restrict,
  moment_id uuid references public.moments(id) on delete restrict,
  subject_kind text not null check(subject_kind in ('athlete','moment','asset')),
  subject_key text not null check(length(subject_key)<=160),
  scope_key text not null check(scope_key in ('public_audience','internal_admin')),
  feature_version text not null check(feature_version='engagement-v1'),
  rule_version text not null check(rule_version='measured-v1'),
  as_of timestamptz not null, computed_at timestamptz not null, event_watermark timestamptz not null,
  input_revision integer not null check(input_revision > 0),
  input_snapshot_hash text not null check(input_snapshot_hash ~ '^[a-f0-9]{64}$'),
  input_snapshot jsonb not null check(octet_length(input_snapshot::text)<=4194304),
  features jsonb not null check(octet_length(features::text)<=262144),
  signals jsonb not null check(octet_length(signals::text)<=262144),
  status text not null default 'completed' check(status='completed'),
  created_at timestamptz not null default now(),
  unique(id,environment,subject_key,scope_key,feature_version),
  check((subject_kind='moment')=(moment_id is not null)),
  check(computed_at>=as_of and event_watermark<=computed_at)
);
create table public.intelligence_feature_snapshots (
  environment text not null,subject_key text not null,scope_key text not null,feature_version text not null,
  run_id uuid not null,player_id uuid not null references public.players(id) on delete restrict,
  moment_id uuid references public.moments(id) on delete restrict,
  as_of timestamptz not null,event_watermark timestamptz not null,computed_at timestamptz not null,
  input_revision integer not null check(input_revision > 0),
  revision integer not null default 1 check(revision>0),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  primary key(environment,subject_key,scope_key,feature_version),
  foreign key(run_id,environment,subject_key,scope_key,feature_version) references public.intelligence_engine_runs(id,environment,subject_key,scope_key,feature_version) on delete restrict
);
create index intelligence_feature_snapshots_player on public.intelligence_feature_snapshots(player_id,environment,scope_key);
alter table public.intelligence_engine_runs enable row level security;
alter table public.intelligence_feature_snapshots enable row level security;
revoke all on public.intelligence_engine_runs,public.intelligence_feature_snapshots from public,anon,authenticated,service_role;
grant select,insert on public.intelligence_engine_runs to service_role;
grant select,insert,update on public.intelligence_feature_snapshots to service_role;

-- Enforce the serving-pointer contract even if a future service caller writes
-- the table directly rather than using the promotion RPC.
create function public.guard_intelligence_feature_pointer() returns trigger
language plpgsql security invoker set search_path='' as $$
declare v_run public.intelligence_engine_runs%rowtype;
begin
  select * into strict v_run from public.intelligence_engine_runs where id=new.run_id;
  if row(new.environment,new.subject_key,new.scope_key,new.feature_version,new.player_id,new.moment_id,new.as_of,new.event_watermark,new.computed_at,new.input_revision)
    is distinct from row(v_run.environment,v_run.subject_key,v_run.scope_key,v_run.feature_version,v_run.player_id,v_run.moment_id,v_run.as_of,v_run.event_watermark,v_run.computed_at,v_run.input_revision)
    then raise exception 'feature pointer lineage mismatch';end if;
  if tg_op='UPDATE' then
    if row(new.environment,new.subject_key,new.scope_key,new.feature_version) is distinct from row(old.environment,old.subject_key,old.scope_key,old.feature_version)
      or new.as_of<old.as_of or new.event_watermark<old.event_watermark
      or (new.as_of=old.as_of and new.event_watermark=old.event_watermark and new.input_revision<=old.input_revision)
      then raise exception 'stale feature pointer';end if;
  end if;
  return new;
end $$;
create trigger intelligence_feature_pointer_guard before insert or update on public.intelligence_feature_snapshots
  for each row execute function public.guard_intelligence_feature_pointer();
revoke all on function public.guard_intelligence_feature_pointer() from public,anon,authenticated;
grant execute on function public.guard_intelligence_feature_pointer() to service_role;

create function public.store_intelligence_feature_run(p_run jsonb) returns boolean
language plpgsql security invoker set search_path='' as $$
declare v_run public.intelligence_engine_runs%rowtype;
begin
  insert into public.intelligence_engine_runs(id,environment,player_id,moment_id,subject_kind,subject_key,scope_key,feature_version,rule_version,
    as_of,computed_at,event_watermark,input_revision,input_snapshot_hash,input_snapshot,features,signals)
  values((p_run->>'id')::uuid,p_run->>'environment',(p_run->>'player_id')::uuid,(p_run->>'moment_id')::uuid,p_run->>'subject_kind',p_run->>'subject_key',p_run->>'scope_key',p_run->>'feature_version',p_run->>'rule_version',
    (p_run->>'as_of')::timestamptz,(p_run->>'computed_at')::timestamptz,(p_run->>'event_watermark')::timestamptz,(p_run->>'input_revision')::integer,p_run->>'input_snapshot_hash',p_run->'input_snapshot',p_run->'features',p_run->'signals')
    on conflict(id) do nothing;
  select * into strict v_run from public.intelligence_engine_runs where id=(p_run->>'id')::uuid;
  if v_run.input_snapshot_hash is distinct from p_run->>'input_snapshot_hash' or v_run.features is distinct from p_run->'features'
    or v_run.signals is distinct from p_run->'signals' or v_run.input_snapshot is distinct from p_run->'input_snapshot'
    or v_run.environment is distinct from p_run->>'environment' or v_run.player_id is distinct from (p_run->>'player_id')::uuid
    or v_run.moment_id is distinct from (p_run->>'moment_id')::uuid or v_run.subject_kind is distinct from p_run->>'subject_kind'
    or v_run.subject_key is distinct from p_run->>'subject_key' or v_run.scope_key is distinct from p_run->>'scope_key'
    or v_run.feature_version is distinct from p_run->>'feature_version' or v_run.rule_version is distinct from p_run->>'rule_version'
    or v_run.as_of is distinct from (p_run->>'as_of')::timestamptz or v_run.computed_at is distinct from (p_run->>'computed_at')::timestamptz
    or v_run.event_watermark is distinct from (p_run->>'event_watermark')::timestamptz
    or v_run.input_revision is distinct from (p_run->>'input_revision')::integer then raise exception 'run identity collision';end if;
  insert into public.intelligence_feature_snapshots(environment,subject_key,scope_key,feature_version,run_id,player_id,moment_id,as_of,event_watermark,computed_at,input_revision)
  values(v_run.environment,v_run.subject_key,v_run.scope_key,v_run.feature_version,v_run.id,v_run.player_id,v_run.moment_id,v_run.as_of,v_run.event_watermark,v_run.computed_at,v_run.input_revision)
  on conflict(environment,subject_key,scope_key,feature_version) do update set run_id=excluded.run_id,player_id=excluded.player_id,moment_id=excluded.moment_id,
    as_of=excluded.as_of,event_watermark=excluded.event_watermark,computed_at=excluded.computed_at,input_revision=excluded.input_revision,
    revision=public.intelligence_feature_snapshots.revision+1,updated_at=clock_timestamp()
  where excluded.as_of>=public.intelligence_feature_snapshots.as_of
    and coalesce(excluded.event_watermark,'-infinity'::timestamptz)>=coalesce(public.intelligence_feature_snapshots.event_watermark,'-infinity'::timestamptz)
    and (excluded.as_of>public.intelligence_feature_snapshots.as_of
      or excluded.event_watermark>public.intelligence_feature_snapshots.event_watermark
      or excluded.input_revision>public.intelligence_feature_snapshots.input_revision);
  return found;
end $$;
revoke all on function public.store_intelligence_feature_run(jsonb) from public,anon,authenticated;
grant execute on function public.store_intelligence_feature_run(jsonb) to service_role;
