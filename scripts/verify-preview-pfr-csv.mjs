// Disposable PostgreSQL proof. No hosted connections or real athlete data.
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const db = new PGlite();
const admin = '00000000-0000-4000-8000-000000000001';
const viewer = '00000000-0000-4000-8000-000000000002';
const ordinary = '00000000-0000-4000-8000-000000000003';
const preview = '00000000-0000-4000-8000-000000000004';
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema private;
    create table auth.users(id uuid primary key,email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated;
    create function public.is_internal_admin() returns boolean language sql stable as $$ select auth.uid()='${admin}'::uuid $$;
    create table public.audit_logs(id bigserial primary key,actor_user_id uuid,action text,entity_type text,entity_id text,actor_role_scope text,risk_level text,previous_values jsonb,new_values jsonb,request_metadata jsonb);
    insert into auth.users values ('${admin}','admin@example.test'),('${viewer}','viewer@example.test'),('${ordinary}','ordinary@example.test');
  `);
  const apply = async name => db.exec(fs.readFileSync(`supabase/migrations/${name}`, 'utf8'));
  await apply('20260831161831_private_preview_lockers.sql');
  await apply('20260901184112_private_preview_assigned_viewer.sql');
  // Unchanged career-stat constraint and conversion internals are out of scope.
  await db.exec(`alter table public.preview_lockers add column career_stats jsonb not null default '[]';
    grant select(career_stats),insert(career_stats),update(career_stats) on public.preview_lockers to authenticated;
    create function public.preview_conversion(uuid,text,uuid,uuid,jsonb) returns jsonb language sql as $$ select '{}'::jsonb $$;`);
  for (const name of ['20260914213500_preview_award_sources.sql', '20260915003000_preview_award_descriptions.sql', '20260916193000_private_preview_cfb_csv.sql', '20260922190000_preview_awards_social.sql', '20260929120000_preview_photo_room_banner.sql', '20260929195816_preview_photo_room_banner_upload.sql', '20261011170240_preview_pfr_csv.sql']) await apply(name);
  const imported = [{ category: 'defense', sourceUrl: 'https://www.pro-football-reference.com/players/F/FixtPl00.htm', importedAt: '2026-10-11T00:00:00.000Z', seasons: [{ year: 2024, team: 'AAA', gamesPlayed: 17, gamesStarted: null, statistics: { sacks: 2.5 } }], careerTotals: { seasonCount: 1, gamesPlayed: 17, gamesStarted: null, statistics: { sacks: 2.5, passesDefended: 4 } } }];
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${admin}',false);`);
  await db.query('insert into preview_lockers(id,slug,full_name,pfr_stats) values ($1,$2,$3,$4)', [preview, 'pfr-fixture', 'PFR Fixture', JSON.stringify(imported)]);
  assert.deepEqual((await db.query('select pfr_stats from preview_lockers where id=$1', [preview])).rows[0].pfr_stats, imported);
  await db.query('update preview_lockers set pfr_stats=$1 where id=$2 and revision=1', [JSON.stringify(imported), preview]);
  assert.equal((await db.query('select revision from preview_lockers where id=$1', [preview])).rows[0].revision, 2);
  assert.equal((await db.query('update preview_lockers set pfr_stats=$1 where id=$2 and revision=1 returning id', [JSON.stringify(imported), preview])).rows.length, 0);
  await db.exec('reset role');
  assert.equal((await db.query('select count(*)::int n from audit_logs')).rows[0].n, 2);
  await db.query('insert into preview_locker_viewer_grants(preview_locker_id,viewer_user_id) values ($1,$2)', [preview, viewer]);
  await db.exec('set role anon');
  await assert.rejects(db.query('select pfr_stats from preview_lockers'), /permission denied/);
  await db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub','${ordinary}',false);`);
  assert.equal((await db.query('select pfr_stats from preview_lockers')).rows.length, 0);
  await assert.rejects(db.query('insert into preview_lockers(slug,full_name,pfr_stats) values ($1,$2,$3)', ['denied', 'Denied', JSON.stringify(imported)]));
  await db.exec(`select set_config('request.jwt.claim.sub','${viewer}',false);`);
  assert.deepEqual((await db.query('select pfr_stats from preview_lockers')).rows[0].pfr_stats, imported);
  assert.equal((await db.query("update preview_lockers set pfr_stats='[]' returning id")).rows.length, 0);
  await assert.rejects(db.query("select preview_conversion_create($1,'{}','{}')", [preview]), /forbidden/);
  await db.exec(`select set_config('request.jwt.claim.sub','${admin}',false);`);
  await assert.rejects(db.query("update preview_lockers set pfr_stats='{}'"));
  await assert.rejects(db.query('update preview_lockers set pfr_stats=$1', [JSON.stringify(Array(8).fill(imported[0]))]));
  await assert.rejects(db.query('update preview_lockers set pfr_stats=$1', [JSON.stringify([{ payload: 'x'.repeat(100001) }])]));
  const content = { slug: 'pfr-atomic', full_name: 'PFR Atomic', bio: '', schools: [], pro_teams: [], awards: [], social: [], career_stats: [], cfb_stats: [], pfr_stats: imported, videos: [], photos: [], photo_room_banner_url: null, photo_room_banner_link: null, photo_room_banner_storage_path: null };
  const atomicId = '00000000-0000-4000-8000-000000000005';
  await db.query("select preview_conversion_create($1,$2,'{}')", [atomicId, JSON.stringify(content)]);
  await db.query("select preview_conversion_create($1,$2,'{}')", [atomicId, JSON.stringify(content)]);
  assert.deepEqual((await db.query('select pfr_stats from preview_lockers where id=$1', [atomicId])).rows[0].pfr_stats, imported);
  await assert.rejects(db.query("select preview_conversion_create($1,$2,'{}')", [atomicId, JSON.stringify({ ...content, pfr_stats: [] })]), /preview conflict/);
  await db.exec('reset role');
  const definition = (await db.query("select pg_get_functiondef('public.preview_conversion_create(uuid,jsonb,jsonb)'::regprocedure) definition")).rows[0].definition;
  assert.ok(definition.includes('r.social') && definition.includes('r.photo_room_banner_storage_path'));
  if (process.argv.includes('--generate-types')) {
    const columns = (await db.query("select column_name,data_type,is_nullable,column_default from information_schema.columns where table_schema='public' and table_name='preview_lockers' order by column_name")).rows;
    const fields = mode => columns.map(column => {
      const type = column.data_type === 'jsonb' ? 'Json' : ['smallint', 'integer', 'bigint', 'numeric'].includes(column.data_type) ? 'number' : column.data_type === 'boolean' ? 'boolean' : 'string';
      const optional = mode === 'Update' || (mode === 'Insert' && (column.column_default !== null || column.is_nullable === 'YES'));
      return `          ${column.column_name}${optional ? '?' : ''}: ${type}${column.is_nullable === 'YES' ? ' | null' : ''}`;
    }).join('\n');
    const file = 'types/preview-lockers.generated.ts';
    const original = fs.readFileSync(file, 'utf8');
    const replacement = `preview_lockers: {\n${['Row', 'Insert', 'Update'].map(mode => `        ${mode}: {\n${fields(mode)}\n        }`).join('\n')}\n        Relationships: []\n      }`;
    const generated = original.replace(/preview_lockers: \{[\s\S]*?Relationships: \[\]\s*\}/, replacement)
      .replace(/^\/\/ Preview table regenerated[^\n]*/, '// Preview table regenerated from isolated PostgreSQL information_schema by scripts/verify-preview-pfr-csv.mjs; remaining declarations retain their Supabase CLI provenance.');
    assert.notEqual(original, generated);
    fs.writeFileSync(file, generated);
  }
  console.log('PASS: NFL CSV persistence, audit, revision conflicts, anonymous/unassigned denial, assigned read-only access, bounded JSON, atomic enrollment/retry, prior field preservation.');
} finally { await db.close(); }
