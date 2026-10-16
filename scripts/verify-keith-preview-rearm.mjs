// Disposable embedded PostgreSQL only; no environment files, network, or hosted DB.
// All content below is synthetic. Pinned IDs identify the migration's test target,
// not production data. Visible-browser admission itself is tested elsewhere.
import { PGlite } from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const db = new PGlite();
const target = '556ca192-d9b7-494f-93d6-a498af76ba5a';
const player = 'c5dae871-a277-4256-9a0c-17a40940ad3f';
const admin = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
const otherPlayer = '00000000-0000-4000-8000-000000000003';
const request = 'f5cf7a9d-c2ac-4daa-ab56-10ba8447267f';
const oldStart = '2026-10-13T22:56:51.811674Z';
const oldExpiry = '2026-10-15T22:56:51.811674Z';
const migrationPath = 'supabase/migrations/20261016174524_rearm_keith_preview_after_mobile_qa.sql';
const read = path => fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
const migration = read(migrationPath);
assert.ok(migration.trim(), 'Re-arm migration must be populated');
let checks = 0;
const eq = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const result = async (sql, values = []) => (await db.query(sql, values)).rows[0]?.result;
const owner = async () => {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub','',false)");
};
const runMigration = () => db.exec(migration);
async function rejectsMigration(pattern) {
  try { await assert.rejects(runMigration(), pattern); checks++; }
  finally { await db.exec('rollback'); await owner(); }
}
const link = () => result('select to_jsonb(l) result from preview_locker_short_links l where preview_id=$1', [target]);
const status = () => result('select preview_public_link_status($1) result', [target]);
const snapshot = () => result(`select jsonb_build_object(
  'players',(select coalesce(jsonb_agg(to_jsonb(p) order by id),'[]') from players p),
  'content',(select coalesce(jsonb_agg(to_jsonb(p) order by id),'[]') from preview_lockers p),
  'links',(select coalesce(jsonb_agg(to_jsonb(l) order by preview_id),'[]') from preview_locker_short_links l),
  'audits',(select coalesce(jsonb_agg(to_jsonb(a) order by id),'[]') from audit_logs a)
) result`);
const receipts = () => db.query("select * from audit_logs where action='preview.link_access_rearmed' order by id").then(value => value.rows);
function prefix(source, marker) {
  const at = source.indexOf(marker);
  assert.ok(at > 0, `Released migration boundary missing: ${marker}`);
  return source.slice(0, at).replace(/^begin;\s*/, '');
}
async function seed({ includeTarget = true } = {}) {
  await owner();
  await db.exec('truncate preview_locker_short_links,preview_lockers,players,audit_logs restart identity cascade');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [admin]);
  await db.query('insert into players(id,full_name,synthetic_payload) values($1,$2,$3),($4,$5,$6)',
    [player, 'Synthetic canonical fixture', '{"career":"preserve-target"}', otherPlayer, 'Synthetic other fixture', '{"career":"preserve-other"}']);
  await db.query(`insert into preview_lockers(id,player_id,slug,full_name,bio,photos,videos,revision)
    values($1,$2,$3,$4,$5,$6,$7,7),($8,$9,$10,$11,$12,$13,$14,9)`,
    [target, player, 'keith-rivers-3a92b4f331f083552d05', 'Keith Rivers', 'Synthetic target content',
      '[{"id":"fixture-photo","url":"https://example.test/synthetic-target.jpg"}]', '[{"id":"fixture-film","url":"https://example.test/synthetic-target.mp4"}]',
      other, otherPlayer, 'synthetic-other-preview', 'Synthetic Other Athlete', 'Synthetic other content',
      '[{"id":"other-photo","url":"https://example.test/synthetic-other.jpg"}]', '[]']);
  await db.query('insert into preview_locker_short_links(preview_id,alias,public_access_enabled) values($1,$2,true)', [other, 'synthetic-other-preview']);
  await db.query('update preview_locker_short_links set access_started_at=$2,access_expires_at=$3 where preview_id=$1', [other, oldStart, oldExpiry]);
  if (includeTarget) {
    await db.query('insert into preview_locker_short_links(preview_id,alias,public_access_enabled) values($1,$2,true)', [target, 'keith-rivers']);
    await db.query('update preview_locker_short_links set access_started_at=$2,access_expires_at=$3 where preview_id=$1', [target, oldStart, oldExpiry]);
    await db.query(`insert into audit_logs(actor_user_id,action,entity_type,entity_id,actor_role_scope,risk_level,new_values,request_metadata)
      values(null,'preview.link_access_started','preview_locker',$1,'platform','low',$2,'{"source":"synthetic-prior-admission"}')`,
      [target, JSON.stringify({ access_started_at: oldStart, access_expires_at: oldExpiry })]);
  }
  await db.query(`insert into audit_logs(action,entity_type,entity_id,actor_role_scope,risk_level,new_values)
    values('synthetic.unrelated_history','preview_locker',$1,'platform','low','{"keep":"permanently"}')`, [other]);
  await owner();
}

try {
  // Only the actual short-link triggers and status/start definitions are needed.
  // The general 48-hour/claims/Storage proof remains in its existing script.
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema private;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function public.is_internal_admin() returns boolean language sql stable as $$select auth.uid()='${admin}'::uuid$$;
    create function private.has_active_platform_role(p_actor uuid,p_roles text[]) returns boolean language sql stable as $$select p_actor='${admin}'::uuid$$;
    grant usage on schema auth to authenticated;
    grant execute on function auth.uid() to authenticated;
    create table public.players(id uuid primary key,full_name text,synthetic_payload jsonb);
    create table public.preview_lockers(
      id uuid primary key,player_id uuid references players(id),slug text not null,full_name text not null,
      bio text,photos jsonb,videos jsonb,revision integer,
      created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp()
    );
    create table public.audit_logs(
      id bigint generated by default as identity primary key,actor_user_id uuid references auth.users(id),
      action text,entity_type text,entity_id text,actor_role_scope text,risk_level text,
      previous_values jsonb,new_values jsonb,request_metadata jsonb,created_at timestamptz default clock_timestamp()
    );
  `);
  await db.query('insert into auth.users(id) values($1)', [admin]);
  await db.exec(read('supabase/migrations/20260928181500_private_preview_short_links.sql'));
  await db.exec(prefix(read('supabase/migrations/20260928195000_preview_link_access.sql'), '-- Visitors who choose'));
  await db.exec(prefix(read('supabase/migrations/20261013161640_preview_manual_link_access_window.sql'), 'create function public.extend_preview_link_access'));
  eq(await result("select current_user='postgres' result"), true, 'disposable migrator matches reviewed role');

  await seed();
  eq((await status()).state, 'expired', 'fixture represents the pinned old expired window');
  const before = await snapshot();
  const oldLink = await link();
  await runMigration();
  const pending = await status();
  eq(pending.state, 'pending', 'approved repair re-arms only to pending');
  eq([pending.access_started_at, pending.access_expires_at, pending.access_extended_at], [null, null, null], 're-arm does not start a replacement window');
  const after = await snapshot();
  eq(after.players, before.players, 'canonical player rows preserved');
  eq(after.content, before.content, 'all preview content and revisions preserved');
  eq(after.links.filter(row => row.preview_id !== target), before.links.filter(row => row.preview_id !== target), 'other locker and clock unchanged');
  eq(after.audits.slice(0, before.audits.length), before.audits, 'entire previous audit history preserved');
  const [receipt] = await receipts();
  eq((await receipts()).length, 1, 'one permanent re-arm receipt');
  eq(receipt.actor_user_id, null, 'migration does not impersonate an Admin');
  eq(receipt.request_metadata.request_id, request, 'fixed repair request identity retained');
  eq(receipt.previous_values, { ...oldLink, state: 'expired' }, 'complete prior window preserved in audit');
  eq(receipt.new_values, { ...await link(), state: 'pending', next_window_hours: 48 }, 'pending replacement policy audited');
  eq(receipt.request_metadata.prior_history_preserved, true, 'receipt explicitly preserves prior history');
  const pendingSnapshot = await snapshot();
  await runMigration();
  eq(await snapshot(), pendingSnapshot, 'migration replay while pending changes nothing');

  await db.exec('set role service_role');
  const first = await result('select start_preview_link_access($1,null) result', [target]);
  const retry = await result('select start_preview_link_access($1,null) result', [target]);
  eq(first.state, 'active', 'next synthetic admission starts the new window');
  eq([retry.access_started_at, retry.access_expires_at], [first.access_started_at, first.access_expires_at], 'admission retry cannot move start or deadline');
  await owner();
  eq(await result("select extract(epoch from(access_expires_at-access_started_at))=172800 result from preview_locker_short_links where preview_id=$1", [target]), true, 'new window is exactly 48 PostgreSQL hours');
  const activeSnapshot = await snapshot();
  await runMigration();
  eq(await snapshot(), activeSnapshot, 'migration replay cannot reset a newly active window');
  eq((await receipts()).length, 1, 'active replay does not duplicate re-arm receipt');
  eq(await result("select count(*)::int result from audit_logs where action='preview.link_access_started' and entity_id=$1", [target]), 2, 'old admission history plus exactly one new admission retained');
  eq((await snapshot()).content, before.content, 'admission also preserves Locker content');

  // Fault injection is confined to this disposable DB: prove update + audit atomicity.
  await seed();
  await db.exec("alter table audit_logs add constraint synthetic_reject_rearm check(action <> 'preview.link_access_rearmed')");
  const failedAuditBefore = await snapshot();
  await rejectsMigration(/synthetic_reject_rearm/);
  eq(await snapshot(), failedAuditBefore, 'failed audit insertion rolls back the window repair');
  await db.exec('alter table audit_logs drop constraint synthetic_reject_rearm');

  for (const [label, sql, values, expected] of [
    ['canonical identity mismatch', 'update preview_lockers set player_id=$2 where id=$1', [target, otherPlayer], /Keith identity changed/],
    ['alias mismatch', 'update preview_locker_short_links set alias=$2 where preview_id=$1', [target, 'synthetic-stale-keith'], /Keith invitation changed/],
    ['unexpired target', "update preview_locker_short_links set access_started_at=clock_timestamp(),access_expires_at=clock_timestamp()+interval '48 hours' where preview_id=$1", [target], /Keith invitation changed/],
  ]) {
    await seed();
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [admin]);
    await db.query(sql, values);
    await owner();
    const guardedBefore = await snapshot();
    await rejectsMigration(expected);
    eq(await snapshot(), guardedBefore, `${label} fails closed without mutations`);
  }

  await seed();
  const wrongRoleBefore = await snapshot();
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [admin]);
  await db.exec('set role authenticated');
  await rejectsMigration(/reviewed migration role/);
  eq(await snapshot(), wrongRoleBefore, 'even an authenticated Admin cannot execute the one-off repair');

  await seed({ includeTarget: false });
  const missingBefore = await snapshot();
  await runMigration();
  eq(await snapshot(), missingBefore, 'missing invitation is a portable no-op');
  eq((await receipts()).length, 0, 'missing target creates no invented repair receipt');
  await db.query('delete from preview_lockers where id=$1', [target]);
  const absentBefore = await snapshot();
  await runMigration();
  eq(await snapshot(), absentBefore, 'entirely absent preview is also a fresh-environment no-op');

  console.log(`PASS: ${checks} disposable PostgreSQL re-arm, immutable-history, next-window, replay, atomicity, and guard assertions. No hosted access or mutations; browser visibility and independent-client races are not exercised.`);
} catch (error) {
  console.error('FAIL:', error.message);
  process.exitCode = 1;
} finally {
  await db.close();
}
