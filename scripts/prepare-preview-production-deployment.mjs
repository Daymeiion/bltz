// Generates one guarded, atomic production packet from the committed migrations.
// This script does not connect to a database.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";

const output = process.argv[2];
assert.ok(output, "Provide an explicit output SQL path outside product sources");

const baseline = {
  count: 52,
  latest: "20260909035336",
  fingerprint: "7a8848a56ebdde7a5d33d5615fc1e51c",
};
const migrations = [
  ["20260910224813", "sportradar_player_stats"],
  ["20260911185101", "preview_conversion_sprint"],
  ["20260911210051", "simplify_gtm_contact_pipeline"],
  ["20260911223514", "create_and_enroll_private_preview"],
].map(([version, name]) => {
  const path = `supabase/migrations/${version}_${name}.sql`;
  const committed = execFileSync("git", ["show", `HEAD:${path}`], { encoding: "utf8" }).replace(/\r\n/g, "\n");
  const working = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  assert.equal(working, committed, `${path} differs from the committed payload`);
  const transactionWrapped = /^begin;\n/m.test(committed);
  assert.equal(transactionWrapped, /commit;\s*$/.test(committed), `${path} has an incomplete transaction wrapper`);
  const body = transactionWrapped
    ? committed.replace(/^begin;\n/m, "").replace(/commit;\s*$/, "")
    : committed;
  const tag = `$migration_${version}$`;
  assert.ok(!body.includes(tag));
  return { version, name, body, hash: createHash("sha256").update(committed).digest("hex"), tag };
});

const versions = migrations.map(({ version }) => `'${version}'`).join(",");
const bodies = migrations.map(({ body }) => body).join("\n");
const ledgerRows = migrations.map(({ version, name, body, tag }) =>
  `('${version}','${name}',array[${tag}${body}${tag}])`,
).join(",\n");
const hashLines = migrations.map(({ version, hash }) => `-- ${version} SHA256: ${hash}`).join("\n");

const sql = `-- Target: BLTZ main Production. No credentials embedded.
-- Apply only after the exact read-only baseline below is observed.
${hashLines}
begin;
set local lock_timeout = '5s';
set local statement_timeout = '90s';
select pg_advisory_xact_lock(hashtextextended('bltz:preview-production:20260912',0));
lock table supabase_migrations.schema_migrations in share row exclusive mode;
do $preflight$
begin
  if (select count(*) from supabase_migrations.schema_migrations) <> ${baseline.count}
     or (select max(version) from supabase_migrations.schema_migrations) <> '${baseline.latest}'
     or (select md5(string_agg(version,',' order by version)) from supabase_migrations.schema_migrations) <> '${baseline.fingerprint}'
  then raise exception 'Production migration history changed; stop and rerun read-only preflight'; end if;
  if exists(select 1 from supabase_migrations.schema_migrations where version in (${versions}))
     or to_regclass('public.player_external_ids') is not null
     or to_regclass('public.preview_conversion_campaigns') is not null
     or to_regprocedure('public.import_sportradar_stats(uuid,uuid,uuid)') is not null
     or to_regprocedure('public.preview_conversion_create(uuid,jsonb,jsonb)') is not null
  then raise exception 'Release schema/version already exists; inspect instead of retrying'; end if;
  if to_regclass('public.preview_lockers') is null
     or to_regclass('public.players') is null
     or to_regclass('public.player_season_stats') is null
     or to_regclass('public.audit_logs') is null
     or to_regclass('public.gtm_contacts') is null
     or to_regclass('public.gtm_player_prospects') is null
     or to_regclass('public.gtm_player_preview_lockers') is null
     or to_regprocedure('public.is_internal_admin()') is null
     or has_schema_privilege('authenticated','private','USAGE')
  then raise exception 'Production prerequisites differ from the reviewed baseline'; end if;
end;
$preflight$;

${bodies}

insert into supabase_migrations.schema_migrations(version,name,statements)
values
${ledgerRows};

do $postflight$
begin
  if (select count(*) from supabase_migrations.schema_migrations) <> ${baseline.count + migrations.length}
     or (select max(version) from supabase_migrations.schema_migrations) <> '${migrations.at(-1).version}'
     or (select md5(string_agg(version,',' order by version)) from supabase_migrations.schema_migrations where version not in (${versions})) <> '${baseline.fingerprint}'
  then raise exception 'Migration ledger invariant failed'; end if;
  if not (select relrowsecurity from pg_class where oid='public.player_external_ids'::regclass)
     or not (select relrowsecurity from pg_class where oid='public.player_stat_ingestions'::regclass)
     or not (select relrowsecurity from pg_class where oid='public.provider_request_logs'::regclass)
     or not (select relrowsecurity from pg_class where oid='public.preview_conversion_campaigns'::regclass)
     or not (select relrowsecurity from pg_class where oid='public.preview_conversion_responses'::regclass)
     or not (select relrowsecurity from pg_class where oid='public.preview_conversion_events'::regclass)
     or not (select relrowsecurity from pg_class where oid='public.preview_conversion_referrals'::regclass)
     or has_table_privilege('anon','public.preview_conversion_events','SELECT')
     or has_table_privilege('authenticated','public.player_external_ids','SELECT')
     or has_table_privilege('authenticated','public.player_stat_ingestions','SELECT')
     or has_table_privilege('authenticated','public.provider_request_logs','SELECT')
     or has_schema_privilege('authenticated','private','USAGE')
  then raise exception 'Release permission invariant failed'; end if;
  if not has_function_privilege('authenticated','public.import_sportradar_stats(uuid,uuid,uuid)','EXECUTE')
     or has_function_privilege('anon','public.import_sportradar_stats(uuid,uuid,uuid)','EXECUTE')
     or not has_function_privilege('authenticated','public.preview_conversion(uuid,text,uuid,uuid,jsonb)','EXECUTE')
     or has_function_privilege('anon','public.preview_conversion(uuid,text,uuid,uuid,jsonb)','EXECUTE')
     or not has_function_privilege('authenticated','public.preview_conversion_create(uuid,jsonb,jsonb)','EXECUTE')
     or has_function_privilege('anon','public.preview_conversion_create(uuid,jsonb,jsonb)','EXECUTE')
  then raise exception 'Release function permission invariant failed'; end if;
  if exists(select 1 from public.player_external_ids)
     or exists(select 1 from public.player_stat_ingestions)
     or exists(select 1 from public.provider_request_logs)
     or exists(select 1 from public.preview_conversion_campaigns)
     or exists(select 1 from public.preview_conversion_responses)
     or exists(select 1 from public.preview_conversion_events)
     or exists(select 1 from public.preview_conversion_referrals)
  then raise exception 'Unexpected release records'; end if;
end;
$postflight$;
commit;
select version,name from supabase_migrations.schema_migrations where version in (${versions}) order by version;
`;

writeFileSync(resolve(output), sql);
console.log(JSON.stringify({
  migrations: migrations.map(({ version, hash }) => ({ version, hash })),
  packetHash: createHash("sha256").update(sql).digest("hex"),
  output: resolve(output),
}));
