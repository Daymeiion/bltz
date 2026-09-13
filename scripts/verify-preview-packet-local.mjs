// Exact wrapper/DDL proof on a dedicated disposable container. No hosted access.
// Requires the 27 released migrations, with NO preview migration yet applied.
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const directory = 'C:/tmp/bltz-preview-packet-20260831';
const container = 'supabase_db_bltz-preview-packet-20260831';
const packetPath = process.argv[2]; assert.ok(packetPath, 'Provide the reviewed packet SQL file');
const args = ['--context','desktop-linux','exec','-i',container,'psql','-X','-U','postgres','-d','postgres','-qAt','-v','ON_ERROR_STOP=1'];
const sql = query => execFileSync('docker', args, { input: query, encoding: 'utf8', stdio: ['pipe','pipe','pipe'] }).trim();
const proof = []; const check = (name, ok) => { assert.ok(ok, name); proof.push(name); console.log(`PASS ${name}`); };
assert.equal(sql('select count(*) from supabase_migrations.schema_migrations'), '27', 'Dedicated verifier must be fresh; never reset existing fixtures');
assert.equal(sql("select to_regclass('public.preview_lockers') is null"), 't');
// These 20 inert local-only entries model a longer remote history, not schema.
sql(`begin; insert into supabase_migrations.schema_migrations(version,name,statements)
select '19000101'||lpad(n::text,6,'0'),'synthetic_packet_history',array['-- local wrapper QA only'] from generate_series(1,20) n; commit;`);
const fingerprintQuery = "select md5(string_agg(version, ',' order by version)) from supabase_migrations.schema_migrations";
const fingerprint = sql(fingerprintQuery); assert.match(fingerprint,/^[a-f0-9]{32}$/);
const raw = readFileSync(packetPath,'utf8');
check('packet bounds lock and statement waits', raw.includes("set local lock_timeout = '5s';") && raw.includes("set local statement_timeout = '45s';"));
// ONLY baseline fingerprint changes. Count47/latestversion and full DDL stay exact.
const packet = raw.replaceAll('736e33d43006e7f9cd7d11bad3d98742',fingerprint);
check('only fingerprint substituted for synthetic history', packet.replaceAll(fingerprint,'736e33d43006e7f9cd7d11bad3d98742') === raw);
const preCommit = '\ncommit;\nselect version'; assert.equal(packet.split(preCommit).length,2);
const failing = packet.replace(preCommit,'\nselect 1 / 0; -- deliberate local-only pre-commit failure\ncommit;\nselect version');
const failure = spawnSync('docker',args,{input:failing,encoding:'utf8'});
check('deliberate pre-commit failure reached', failure.status !== 0 && failure.stderr.includes('division by zero'));
check('failed packet leaves47ledger rows', sql('select count(*) from supabase_migrations.schema_migrations') === '47');
check('failed packet preserves all old versions', sql(fingerprintQuery) === fingerprint);
check('failed packet rolls back public and private tables', sql("select to_regclass('public.preview_lockers') is null and to_regclass('private.preview_discovery_limits') is null") === 't');
check('failed packet rolls back all new functions', sql("select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.proname in ('preview_url_valid','preview_items_valid','preview_stamp','audit_preview_change','admit_preview_discovery')") === '0');
sql(packet);
check('successful packet appends47to48atomically', sql('select count(*) from supabase_migrations.schema_migrations') === '48');
check('exact new version recorded once', sql("select count(*) from supabase_migrations.schema_migrations where version='20260831161831' and name='private_preview_lockers' and cardinality(statements)=1") === '1');
check('all47oldversions unchanged', sql(fingerprintQuery + " where version<>'20260831161831'") === fingerprint);
check('new schema is empty and protected', sql("select (select count(*) from public.preview_lockers)=0 and (select relrowsecurity from pg_class where oid='public.preview_lockers'::regclass) and not has_any_column_privilege('anon','public.preview_lockers','SELECT') and not has_schema_privilege('authenticated','private','USAGE')") === 't');
const after = sql(fingerprintQuery);
const retry = spawnSync('docker',args,{input:packet,encoding:'utf8'});
check('retry refuses changed history before mutation', retry.status !== 0 && retry.stderr.includes('Production migration history changed'));
check('retry retains48ledger rows unchanged', sql('select count(*) from supabase_migrations.schema_migrations') === '48' && sql(fingerprintQuery) === after);
check('retry retains schema with no inserted preview data', sql('select count(*) from public.preview_lockers') === '0');
writeFileSync(`${directory}/packet-proof.json`, JSON.stringify({ assertions: proof, packetSha256: createHash('sha256').update(raw).digest('hex'), syntheticBaselineFingerprint: fingerprint, substitution: 'Only ordered-version fingerprint; complete migration body and47to48guards unchanged', productionApplied:false },null,2));
console.log(`PRIVATE_PREVIEW_PACKET_PROOF ${proof.length} assertions; local schema retained; no hosted connection`);
