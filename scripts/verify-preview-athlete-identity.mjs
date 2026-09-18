import { PGlite } from '../output/sportradar-validation/node_modules/@electric-sql/pglite/dist/index.js';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const db = new PGlite();
const admin='00000000-0000-4000-8000-000000000001';
const preview='00000000-0000-4000-8000-000000000002';
const other='00000000-0000-4000-8000-000000000003';
await db.exec(`create role anon; create role authenticated; create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function public.is_internal_admin() returns boolean language sql stable as $$ select auth.uid()='${admin}'::uuid $$;
create table public.preview_lockers(id uuid primary key,player_id uuid,updated_at timestamptz);
create table public.gtm_player_preview_lockers(preview_locker_id uuid primary key,gsis_id text);
create table public.audit_logs(action text,entity_type text,entity_id text,actor_user_id uuid,new_values jsonb);`);
const baseline=fs.readFileSync('supabase/migrations/20260701000000_production_schema_baseline.sql','utf8');
for(const name of ['nfl_players','players']) {
  const start=baseline.indexOf(`CREATE TABLE IF NOT EXISTS "public"."${name}" (`);
  await db.exec(baseline.slice(start,baseline.indexOf('\n);',start)+3));
}
await db.exec(fs.readFileSync('supabase/migrations/20260918193313_preview_athlete_identity_review.sql','utf8'));
await db.exec(`insert into nfl_players(gsis_id,display_name) values ('GSIS','Fixture Athlete');
insert into preview_lockers(id) values ('${preview}');
insert into gtm_player_preview_lockers values ('${preview}','GSIS');`);
await db.exec('set role anon');
await assert.rejects(db.query('select review_preview_athlete_identity($1,$2,null)',[preview,'GSIS']),/permission denied/);
await db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub','${other}',false)`);
await assert.rejects(db.query('select review_preview_athlete_identity($1,$2,null)',[preview,'GSIS']),/forbidden/);
await db.exec(`select set_config('request.jwt.claim.sub','${admin}',false)`);
await assert.rejects(db.query('select review_preview_athlete_identity($1,$2,null)',[preview,'STALE']),/preview_identity_changed/);
const player=(await db.query('select review_preview_athlete_identity($1,$2,null) id',[preview,'GSIS'])).rows[0].id;
assert.equal((await db.query('select review_preview_athlete_identity($1,$2,null) id',[preview,'GSIS'])).rows[0].id,player);
await db.exec('reset role');
const row=(await db.query('select * from players')).rows[0];
assert.equal(row.is_public,false);assert.equal(row.visibility,false);assert.equal(row.is_verified,false);assert.equal(row.user_id,null);
assert.equal((await db.query('select count(*)::int n from players')).rows[0].n,1);
assert.equal((await db.query('select player_id from preview_lockers')).rows[0].player_id,player);
assert.equal((await db.query('select count(*)::int n from audit_logs')).rows[0].n,2);
await db.exec(`insert into players(id,slug,name,full_name) values ('${other}','existing','Existing Athlete','Existing Athlete');
insert into nfl_players(gsis_id,display_name) values ('SECOND','Existing Athlete');
insert into preview_lockers(id) values ('${other}');insert into gtm_player_preview_lockers values ('${other}','SECOND');
set role authenticated;`);
await assert.rejects(db.query('select review_preview_athlete_identity($1,$2,null)',[other,'SECOND']),/existing_athlete_requires_review/);
assert.equal((await db.query('select review_preview_athlete_identity($1,$2,$3) id',[other,'SECOND',other])).rows[0].id,other);
await assert.rejects(db.query('select review_preview_athlete_identity($1,$2,$3)',[preview,'GSIS',other]),/athlete_identity_conflict/);
await db.exec('reset role');
// Generate only this new RPC declaration from the applied PostgreSQL signature.
if(process.argv.includes('--generate-types')) {
 const {rows:[fn]}=await db.query(`select proargnames,proargtypes::regtype[]::text args,prorettype::regtype::text result,pronargdefaults from pg_proc where proname='review_preview_athlete_identity'`);
 assert.deepEqual(fn.proargnames,['p_preview_id','p_gsis_id','p_existing_player_id']);assert.equal(fn.result,'uuid');assert.equal(fn.pronargdefaults,1);
 const p='types/database.generated.ts';let text=fs.readFileSync(p,'utf8');
 const declaration='      review_preview_athlete_identity: {\n        Args: { p_preview_id: string; p_gsis_id: string; p_existing_player_id?: string | null }\n        Returns: string\n      }\n';
 if(!text.includes('      review_preview_athlete_identity:'))text=text.replace('    Functions: {','    Functions: {\n'+declaration);
 fs.writeFileSync(p,text);
}
await db.close();
console.log('PASS: private identity creation, reviewed existing identity linking, idempotency, audit, stale reference, conflict rollback, anonymous and non-admin denial.');
