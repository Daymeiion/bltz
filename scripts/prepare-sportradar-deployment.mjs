// Generates a reviewable single-migration packet. Does not connect to a database.
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const output = process.argv[2];
assert.ok(output, 'Provide an explicit output SQL path outside product sources');

const version = '20260910224813';
const migrationPath = `supabase/migrations/${version}_sportradar_player_stats.sql`;
const migration = execFileSync('git', ['show', `HEAD:${migrationPath}`], { encoding: 'utf8' }).replace(/\r\n/g, '\n');
assert.equal(readFileSync(migrationPath, 'utf8').replace(/\r\n/g, '\n'), migration, 'Migration differs from committed payload');
assert.match(migration, /\nbegin;\n/);
assert.match(migration, /commit;\s*$/);
const body = migration.replace(/^begin;\r?\n/m, '').replace(/commit;\s*$/, '');
assert.ok(!body.includes('$sportradar_migration$'));

const migrationHash = createHash('sha256').update(migration).digest('hex');
const sql = `-- Target: BLTZ main Production. No credentials embedded.
-- Migration LF-normalized SHA256: ${migrationHash}
-- Never replay the repository migration chain or modify existing ledger rows.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '45s';
select pg_advisory_xact_lock(hashtextextended('bltz:sportradar:${version}', 0));
lock table supabase_migrations.schema_migrations in share row exclusive mode;
do $preflight$
begin
  if (select count(*) from supabase_migrations.schema_migrations) <> 52
     or (select max(version) from supabase_migrations.schema_migrations) <> '20260909035336'
     or (select md5(string_agg(version, ',' order by version)) from supabase_migrations.schema_migrations) <> '7a8848a56ebdde7a5d33d5615fc1e51c'
  then raise exception 'Production migration history changed; stop and rerun read-only preflight'; end if;
  if exists(select 1 from supabase_migrations.schema_migrations where version='${version}')
     or to_regclass('public.player_external_ids') is not null
     or to_regclass('public.player_stat_ingestions') is not null
     or to_regclass('public.provider_request_logs') is not null
     or to_regprocedure('public.reserve_sportradar_request(uuid,uuid,text,text,integer)') is not null
     or to_regprocedure('public.import_sportradar_stats(uuid,uuid,uuid)') is not null
     or exists(select 1 from information_schema.columns where table_schema='public' and table_name='preview_lockers' and column_name='player_id')
  then raise exception 'Sportradar schema/version already exists; inspect instead of retrying'; end if;
  if to_regclass('public.preview_lockers') is null
     or to_regclass('public.players') is null
     or to_regclass('public.player_season_stats') is null
     or to_regclass('public.audit_logs') is null
     or to_regprocedure('public.is_internal_admin()') is null
     or has_schema_privilege('authenticated','private','USAGE')
  then raise exception 'Authorization prerequisites differ from reviewed baseline'; end if;
end;
$preflight$;

${body}

insert into supabase_migrations.schema_migrations(version, name, statements)
values ('${version}', 'sportradar_player_stats', array[$sportradar_migration$${body}$sportradar_migration$]);
do $postflight$
begin
  if (select count(*) from supabase_migrations.schema_migrations) <> 53
     or (select max(version) from supabase_migrations.schema_migrations) <> '${version}'
     or (select md5(string_agg(version, ',' order by version)) from supabase_migrations.schema_migrations where version<>'${version}') <> '7a8848a56ebdde7a5d33d5615fc1e51c'
  then raise exception 'Ledger append invariant failed'; end if;
  if not (select relrowsecurity from pg_class where oid='public.player_external_ids'::regclass)
     or not (select relrowsecurity from pg_class where oid='public.player_stat_ingestions'::regclass)
     or not (select relrowsecurity from pg_class where oid='public.provider_request_logs'::regclass)
     or has_table_privilege('anon','public.player_external_ids','SELECT')
     or has_table_privilege('authenticated','public.player_external_ids','SELECT')
     or has_table_privilege('anon','public.player_stat_ingestions','SELECT')
     or has_table_privilege('authenticated','public.player_stat_ingestions','SELECT')
     or has_table_privilege('anon','public.provider_request_logs','SELECT')
     or has_table_privilege('authenticated','public.provider_request_logs','SELECT')
     or has_schema_privilege('authenticated','private','USAGE')
  then raise exception 'Sportradar permission invariant failed'; end if;
  if not has_function_privilege('authenticated','public.import_sportradar_stats(uuid,uuid,uuid)','EXECUTE')
     or has_function_privilege('anon','public.import_sportradar_stats(uuid,uuid,uuid)','EXECUTE')
     or has_function_privilege('authenticated','public.reserve_sportradar_request(uuid,uuid,text,text,integer)','EXECUTE')
  then raise exception 'Sportradar function permission invariant failed'; end if;
  if exists(select 1 from public.player_external_ids)
     or exists(select 1 from public.player_stat_ingestions)
     or exists(select 1 from public.provider_request_logs)
  then raise exception 'Unexpected provider records'; end if;
end;
$postflight$;
commit;
select version, name from supabase_migrations.schema_migrations where version='${version}';
`;

writeFileSync(resolve(output), sql);
console.log(`Prepared packet. Migration SHA256 ${migrationHash}; packet SHA256 ${createHash('sha256').update(sql).digest('hex')}. No database connection made.`);
