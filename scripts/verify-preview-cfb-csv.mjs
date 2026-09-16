// Isolated PostgreSQL/RLS proof. Never opens a hosted database or imports real data.
import { PGlite } from '../output/sportradar-validation/node_modules/@electric-sql/pglite/dist/index.js';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const db = new PGlite();
const admin = '00000000-0000-4000-8000-000000000001';
const viewer = '00000000-0000-4000-8000-000000000002';
const ordinary = '00000000-0000-4000-8000-000000000003';
const preview = '00000000-0000-4000-8000-000000000004';
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
for (const file of ['20260831161831_private_preview_lockers.sql','20260901184112_private_preview_assigned_viewer.sql']) await db.exec(fs.readFileSync(`supabase/migrations/${file}`,'utf8'));
// Existing career summary field is unrelated to the new private CSV column.
await db.exec(`alter table public.preview_lockers add column career_stats jsonb not null default '[]'; grant select(career_stats),insert(career_stats),update(career_stats) on public.preview_lockers to authenticated;
create function public.preview_conversion(uuid,text,uuid,uuid,jsonb) returns jsonb language sql as $$ select '{}'::jsonb $$;`);
await db.exec(fs.readFileSync('supabase/migrations/20260916193000_private_preview_cfb_csv.sql','utf8'));
const imported = [{category:'defense',sourceUrl:'https://www.sports-reference.com/cfb/players/fixture-1.html',importedAt:'2026-09-16T00:00:00.000Z',seasons:[{year:2007,team:'Fixture',gamesPlayed:12,gamesStarted:null,statistics:{sacks:2.5}}]}];
await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${admin}',false);`);
await db.query('insert into preview_lockers(id,slug,full_name,cfb_stats) values ($1,$2,$3,$4)',[preview,'csv-fixture','CSV Fixture',JSON.stringify(imported)]);
assert.deepEqual((await db.query('select cfb_stats from preview_lockers where id=$1',[preview])).rows[0].cfb_stats,imported);
await db.query('update preview_lockers set cfb_stats=$1 where id=$2 and revision=1',[JSON.stringify(imported),preview]);
assert.equal((await db.query('select revision from preview_lockers where id=$1',[preview])).rows[0].revision,2);
assert.equal((await db.query('update preview_lockers set cfb_stats=$1 where id=$2 and revision=1 returning id',[JSON.stringify(imported),preview])).rows.length,0);
await db.exec('reset role');
assert.equal((await db.query('select count(*)::int n from audit_logs')).rows[0].n,2);
await db.query('insert into preview_locker_viewer_grants(preview_locker_id,viewer_user_id) values ($1,$2)',[preview,viewer]);
await db.exec(`set role anon;`);
await assert.rejects(db.query('select cfb_stats from preview_lockers'),/permission denied/);
await db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub','${ordinary}',false);`);
assert.equal((await db.query('select cfb_stats from preview_lockers')).rows.length,0);
await assert.rejects(db.query('insert into preview_lockers(slug,full_name,cfb_stats) values ($1,$2,$3)',['denied','Denied',JSON.stringify(imported)]));
await db.exec(`select set_config('request.jwt.claim.sub','${viewer}',false);`);
assert.deepEqual((await db.query('select cfb_stats from preview_lockers')).rows[0].cfb_stats,imported);
assert.equal((await db.query("update preview_lockers set cfb_stats='[]' returning id")).rows.length,0);
await db.exec(`select set_config('request.jwt.claim.sub','${admin}',false);`);
await assert.rejects(db.query("update preview_lockers set cfb_stats='{}'"));
// Exercise the real updated atomic wrapper (enrollment itself is outside this test).
const content = { slug:'csv-atomic',full_name:'CSV Atomic',bio:'',schools:[],pro_teams:[],awards:[],career_stats:[],cfb_stats:imported,videos:[],photos:[] };
const atomicId='00000000-0000-4000-8000-000000000005';
await db.query("select preview_conversion_create($1,$2,'{}')",[atomicId,JSON.stringify(content)]);
await db.query("select preview_conversion_create($1,$2,'{}')",[atomicId,JSON.stringify(content)]);
assert.deepEqual((await db.query('select cfb_stats from preview_lockers where id=$1',[atomicId])).rows[0].cfb_stats,imported);
await assert.rejects(db.query("select preview_conversion_create($1,$2,'{}')",[atomicId,JSON.stringify({...content,cfb_stats:[]})]),/preview conflict/);
await db.exec('reset role');
if (process.argv.includes('--generate-types')) {
  const columns = (await db.query("select column_name,data_type,is_nullable,column_default from information_schema.columns where table_schema='public' and table_name='preview_lockers' order by column_name")).rows;
  const fields = mode => columns.map(c => {
    const type = c.data_type==='jsonb'?'Json':['smallint','integer','bigint','numeric'].includes(c.data_type)?'number':c.data_type==='boolean'?'boolean':'string';
    const optional = mode==='Update' || (mode==='Insert' && (c.column_default!==null || c.is_nullable==='YES'));
    return `          ${c.column_name}${optional?'?':''}: ${type}${c.is_nullable==='YES'?' | null':''}`;
  }).join('\n');
  const file='types/preview-lockers.generated.ts'; let text=fs.readFileSync(file,'utf8');
  text=text.replace(/preview_lockers: \{[\s\S]*?\n      preview_locker_viewer_grants:/, `preview_lockers: {\n${['Row','Insert','Update'].map(mode=>`        ${mode}: {\n${fields(mode)}\n        }`).join('\n')}\n        Relationships: []\n      }\n      preview_locker_viewer_grants:`);
  text=text.replace('// Generated from the disposable database by Supabase CLI 2.114.0.', '// Preview table regenerated from isolated PostgreSQL information_schema by scripts/verify-preview-cfb-csv.mjs; remaining declarations retain their Supabase CLI provenance.');
  fs.writeFileSync(file,text);
}
await db.close();
console.log('PASS: private CSV persistence, revision conflicts, audit, anonymous/unassigned denial, assigned read-only access, atomic create/retry, bounded JSON, scoped schema types.');
