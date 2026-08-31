// Generates a reviewable single-migration packet. Does NOT connect to any DB.
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const output = process.argv[2]; assert.ok(output, 'Provide an explicit output SQL path outside product sources');
const migrationPath = 'supabase/migrations/20260831161831_private_preview_lockers.sql';
const migration = execFileSync('git', ['show', `HEAD:${migrationPath}`], { encoding: 'utf8' }).replace(/\r\n/g, '\n');
assert.equal(readFileSync(migrationPath, 'utf8').replace(/\r\n/g, '\n'), migration, 'Migration differs from committed payload');
assert.match(migration, /\nbegin;\n/); assert.match(migration, /commit;\s*$/);
const body = migration.replace(/^begin;\r?\n/m, '').replace(/commit;\s*$/, '');
assert.ok(!body.includes('$preview_migration$'));
const hash = createHash('sha256').update(migration).digest('hex');
const sql = `-- REVIEW ONLY until coordinator approves this exact packet.
-- Target: BLTZ main Production, verified in dashboard; no credentials embedded.
-- Migration LF-normalized SHA256: ${hash}
-- Never run repository-wide migration replay or modify existing ledger rows.
begin;
select pg_advisory_xact_lock(hashtextextended('bltz:preview:20260831161831',0));
lock table supabase_migrations.schema_migrations in share row exclusive mode;
do $preflight$
begin
  if (select count(*) from supabase_migrations.schema_migrations) <> 47
     or (select max(version) from supabase_migrations.schema_migrations) <> '20260828233000'
     or (select md5(string_agg(version, ',' order by version)) from supabase_migrations.schema_migrations) <> '736e33d43006e7f9cd7d11bad3d98742'
  then raise exception 'Production migration history changed; rerun read-only preflight'; end if;
  if exists(select 1 from supabase_migrations.schema_migrations where version='20260831161831')
     or to_regclass('public.preview_lockers') is not null
     or to_regclass('private.preview_discovery_limits') is not null
     or to_regprocedure('public.admit_preview_discovery()') is not null
  then raise exception 'Preview schema/version already exists; inspect instead of retrying'; end if;
  if to_regprocedure('public.is_internal_admin()') is null or to_regclass('public.audit_logs') is null
     or has_schema_privilege('authenticated','private','USAGE')
  then raise exception 'Authorization prerequisites differ from reviewed baseline'; end if;
end;
$preflight$;

${body}

-- Append this new version only, atomically with its DDL. Not history repair.
insert into supabase_migrations.schema_migrations(version, name, statements)
values ('20260831161831', 'private_preview_lockers', array[$preview_migration$${body}$preview_migration$]);
do $postflight$
begin
  if (select count(*) from supabase_migrations.schema_migrations) <> 48
     or (select md5(string_agg(version, ',' order by version)) from supabase_migrations.schema_migrations where version<>'20260831161831') <> '736e33d43006e7f9cd7d11bad3d98742'
  then raise exception 'Ledger append invariant failed'; end if;
  if not (select relrowsecurity from pg_class where oid='public.preview_lockers'::regclass)
     or has_any_column_privilege('anon','public.preview_lockers','SELECT')
     or has_table_privilege('authenticated','public.preview_lockers','DELETE')
     or has_schema_privilege('authenticated','private','USAGE')
  then raise exception 'Preview permission invariant failed'; end if;
  if exists(select 1 from public.preview_lockers) then raise exception 'Unexpected preview records'; end if;
end;
$postflight$;
commit;
select version, name from supabase_migrations.schema_migrations where version='20260831161831';
`;
writeFileSync(resolve(output), sql);
console.log(`Prepared review packet. Migration SHA256 ${hash}; packet SHA256 ${createHash('sha256').update(sql).digest('hex')}. No database connection made.`);
