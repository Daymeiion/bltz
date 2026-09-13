-- READ ONLY. Confirm the dashboard is BLTZ main Production before running.
select current_database(), current_user,
  to_regclass('public.preview_lockers') as preview_table,
  to_regclass('private.preview_discovery_limits') as discovery_limits,
  to_regprocedure('public.admit_preview_discovery()') as admission,
  to_regprocedure('public.is_internal_admin()') as admin_guard,
  to_regclass('public.audit_logs') as audit_table,
  has_schema_privilege('authenticated','private','USAGE') as private_usage;
select count(*) as migration_count, max(version) as latest_version,
  md5(string_agg(version, ',' order by version)) as version_fingerprint
from supabase_migrations.schema_migrations;
select version, name from supabase_migrations.schema_migrations where version='20260831161831';
select column_name, data_type, is_nullable from information_schema.columns
where table_schema='supabase_migrations' and table_name='schema_migrations' order by ordinal_position;
select column_name, data_type from information_schema.columns
where table_schema='public' and table_name='audit_logs' order by ordinal_position;
select count(*) as canonical_players from public.players;
