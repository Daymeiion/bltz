// Local release preparation only. This helper does not connect to a database.
// Each complete migration body and its history row share the outer transaction.
export type TransportReleaseMigration = { version: string; name: string; sql: string };
export type TransportReleaseBaseline = {
  count: number;
  latestVersion: string;
  versionsMd5: string;
  systemIdentifier: string;
};

const quoted = (value: string) => `'${value.replaceAll("'", "''")}'`;

export function buildTransportReleasePacket(
  migrations: TransportReleaseMigration[],
  baseline: TransportReleaseBaseline,
): string {
  if (migrations.length !== 3 || !Number.isInteger(baseline.count) || baseline.count < 1
    || !/^\d{14}$/.test(baseline.latestVersion)
    || !/^[a-f0-9]{32}$/.test(baseline.versionsMd5)
    || !/^\d{1,20}$/.test(baseline.systemIdentifier)) throw new Error("Invalid release baseline");
  for (const [index, migration] of migrations.entries()) {
    if (!/^\d{14}$/.test(migration.version) || !/^[a-z_]+$/.test(migration.name)
      || !migration.sql.trim() || (index > 0 && migration.version <= migrations[index - 1].version)
      || /^(?:begin|commit|rollback)\s*;\s*$/im.test(migration.sql)
      || /intelligence_engine_|intelligence_feature_snapshots|intelligence_review_opportunities/.test(migration.sql)) {
      throw new Error("Invalid or unscoped release migration");
    }
  }
  const versions = migrations.map((migration) => quoted(migration.version)).join(",");
  const preflight = `do $preflight$
begin
  if (select system_identifier::text from pg_control_system()) is distinct from ${quoted(baseline.systemIdentifier)} then
    raise exception 'Database identity changed; stop and rerun read-only preflight';
  end if;
  if (select count(*) from supabase_migrations.schema_migrations) <> ${baseline.count}
    or (select max(version) from supabase_migrations.schema_migrations) is distinct from ${quoted(baseline.latestVersion)}
    or (select md5(string_agg(version, ',' order by version)) from supabase_migrations.schema_migrations) is distinct from ${quoted(baseline.versionsMd5)}
    or exists(select 1 from supabase_migrations.schema_migrations where version in (${versions})) then
    raise exception 'Migration history changed; stop and rerun read-only preflight';
  end if;
  if to_regclass('public.analytics_delivery_outbox') is not null
    or to_regclass('public.analytics_delivery_batches') is not null
    or to_regprocedure('public.accept_analytics_delivery_event(jsonb,jsonb)') is not null
    or to_regclass('private.preview_analytics_capture_config') is not null then
    raise exception 'Delivery objects already exist; stop and review their provenance';
  end if;
end $preflight$;`;
  const bodies = migrations.map((migration) => `${migration.sql.trim()}\ninsert into supabase_migrations.schema_migrations(version,name,statements)
values(${quoted(migration.version)},${quoted(migration.name)},array[${quoted(migration.sql)}]);`).join("\n\n");
  return `begin;
set local lock_timeout = '5s';
set local statement_timeout = '45s';
lock table supabase_migrations.schema_migrations in share row exclusive mode;
${preflight}
${bodies}
do $postflight$
begin
  if (select count(*) from supabase_migrations.schema_migrations) <> ${baseline.count + migrations.length}
    or (select count(*) from supabase_migrations.schema_migrations where version in (${versions})) <> 3
    or (select environment from private.preview_analytics_capture_config where singleton) is not null
    or not (select relrowsecurity from pg_class where oid='public.analytics_delivery_outbox'::regclass)
    or not (select relrowsecurity from pg_class where oid='public.analytics_delivery_batches'::regclass)
    or has_table_privilege('anon','public.analytics_delivery_outbox','SELECT')
    or has_function_privilege('authenticated','public.record_preview_analytics_event(jsonb,uuid,text)','EXECUTE') then
    raise exception 'Delivery release postconditions failed';
  end if;
end $postflight$;
commit;
`;
}
