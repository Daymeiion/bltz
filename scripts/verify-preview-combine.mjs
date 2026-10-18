// Disposable PostgreSQL only. No hosted connection, athlete data or network.
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const db = new PGlite();
const admin='00000000-0000-4000-8000-000000000001', viewer='00000000-0000-4000-8000-000000000002', other='00000000-0000-4000-8000-000000000003', id='00000000-0000-4000-8000-000000000004';
const results=[{id:'combine-2008',eventType:'combine',year:2008,timing:'official',sourceUrl:'https://league.example.com/combine/fixture',measurements:[{metric:'forty',value:4.55,sourceUrl:null},{metric:'bench',value:0,sourceUrl:'https://school.example.com/testing'}]}];
try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema private; create table auth.users(id uuid primary key,email text);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to authenticated;
    create function public.is_internal_admin() returns boolean language sql stable as $$select auth.uid()='${admin}'::uuid$$;
    create table public.audit_logs(id bigserial primary key,actor_user_id uuid,action text,entity_type text,entity_id text,actor_role_scope text,risk_level text,previous_values jsonb,new_values jsonb,request_metadata jsonb);
    insert into auth.users values('${admin}','admin@example.test'),('${viewer}','viewer@example.test'),('${other}','other@example.test');`);
  const apply=async name=>db.exec(fs.readFileSync(`supabase/migrations/${name}`,'utf8'));
  await apply('20260831161831_private_preview_lockers.sql');
  await apply('20260901184112_private_preview_assigned_viewer.sql');
  await db.exec(`alter table public.preview_lockers add column career_stats jsonb not null default '[]';
    grant select(career_stats),insert(career_stats),update(career_stats) on public.preview_lockers to authenticated;
    create function public.preview_conversion(uuid,text,uuid,uuid,jsonb) returns jsonb language sql as $$select '{}'::jsonb$$;`);
  for(const name of ['20260914213500_preview_award_sources.sql','20260915003000_preview_award_descriptions.sql','20260916193000_private_preview_cfb_csv.sql','20260922190000_preview_awards_social.sql','20260929120000_preview_photo_room_banner.sql','20260929195816_preview_photo_room_banner_upload.sql','20261011170240_preview_pfr_csv.sql']) await apply(name);
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${admin}',false)`);
  await db.query('insert into preview_lockers(id,slug,full_name) values($1,$2,$3)',[id,'combine-fixture','Combine Fixture']);
  await db.exec('reset role');
  await apply('20261018230222_preview_combine_results.sql');
  assert.deepEqual((await db.query('select combine_results from preview_lockers where id=$1',[id])).rows[0].combine_results,[]);
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${admin}',false)`);
  await db.query('update preview_lockers set combine_results=$1 where id=$2 and revision=1',[JSON.stringify(results),id]);
  assert.deepEqual((await db.query('select combine_results from preview_lockers where id=$1',[id])).rows[0].combine_results,results);
  assert.equal((await db.query("update preview_lockers set combine_results='[]' where id=$1 and revision=1 returning id",[id])).rows.length,0);
  const event=results[0], entry=event.measurements[0];
  const invalid=[{},Array(11).fill(event),[event,event],[{...event,eventType:'camp'}],[{...event,year:2008.5}],
    [{...event,sourceUrl:'javascript:alert(1)'}],[{...event,sourceUrl:null,measurements:[entry]}],
    [{...event,measurements:[entry,entry]}],[{...event,measurements:[{...entry,value:-1}]}],
    [{...event,measurements:[{metric:'bench',value:0.5,sourceUrl:null}]}],[{...event,measurements:[{...entry,metric:'invented'}]}],
    [{...event,measurements:[{...entry,sourceUrl:'https://user:pass@example.com/test'}]}]];
  for(const item of invalid) await assert.rejects(db.query('update preview_lockers set combine_results=$1 where id=$2',[JSON.stringify(item),id]));
  await db.exec('reset role');
  const audit=(await db.query('select previous_values,new_values from audit_logs order by id desc limit 1')).rows[0];
  assert.deepEqual(audit.previous_values.combine_results,[]); assert.deepEqual(audit.new_values.combine_results,results);
  await db.query('insert into preview_locker_viewer_grants(preview_locker_id,viewer_user_id) values($1,$2)',[id,viewer]);
  await db.exec('set role anon'); await assert.rejects(db.query('select combine_results from preview_lockers'),/permission denied/);
  await db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub','${other}',false)`);
  assert.equal((await db.query('select combine_results from preview_lockers')).rows.length,0);
  await assert.rejects(db.query('insert into preview_lockers(slug,full_name,combine_results) values($1,$2,$3)',['denied','Denied',JSON.stringify(results)]));
  await db.exec(`select set_config('request.jwt.claim.sub','${viewer}',false)`);
  assert.deepEqual((await db.query('select combine_results from preview_lockers')).rows[0].combine_results,results);
  assert.equal((await db.query("update preview_lockers set combine_results='[]' returning id")).rows.length,0);
  await db.exec(`select set_config('request.jwt.claim.sub','${admin}',false)`);
  const content={slug:'atomic-combine',full_name:'Atomic Combine',bio:'',schools:[],pro_teams:[],awards:[],social:[],career_stats:[],cfb_stats:[],pfr_stats:[],combine_results:results,videos:[],photos:[]};
  const atomic='00000000-0000-4000-8000-000000000005';
  await db.query("select preview_conversion_create($1,$2,'{}')",[atomic,JSON.stringify(content)]);
  await db.query("select preview_conversion_create($1,$2,'{}')",[atomic,JSON.stringify(content)]);
  assert.deepEqual((await db.query('select combine_results from preview_lockers where id=$1',[atomic])).rows[0].combine_results,results);
  await assert.rejects(db.query("select preview_conversion_create($1,$2,'{}')",[atomic,JSON.stringify({...content,combine_results:[]})]),/preview conflict/);
  await db.exec('reset role');
  assert.equal((await db.query("select has_function_privilege('anon','private.preview_combine_valid(jsonb)','execute') allowed")).rows[0].allowed,false);
  assert.equal((await db.query("select has_function_privilege('authenticated','private.preview_combine_valid(jsonb)','execute') allowed")).rows[0].allowed,true);
  if(process.argv.includes('--generate-types')) {
    const column=(await db.query("select data_type,is_nullable,column_default from information_schema.columns where table_schema='public' and table_name='preview_lockers' and column_name='combine_results'")).rows[0];
    assert.equal(column.data_type,'jsonb'); assert.equal(column.is_nullable,'NO'); assert.ok(column.column_default);
    const file='types/preview-lockers.generated.ts'; let source=fs.readFileSync(file,'utf8');
    source=source.replace(/preview_lockers: \{[\s\S]*?Relationships: \[\]\s*\}/, block=>block.replace(/          combine_results\??: Json\r?\n/g,'').replace(/(          cfb_stats(\?)?: Json\r?\n)/g, (line,_all,optional)=>`${line}          combine_results${optional??''}: Json\n`));
    if(!source.includes('// combine_results regenerated')) source='// combine_results regenerated from isolated PostgreSQL information_schema by scripts/verify-preview-combine.mjs.\n'+source;
    fs.writeFileSync(file,source);
  }
  console.log('PASS: combine persistence, legacy defaults, audit, revision conflicts, RLS denial/read-only grants, validation, atomic enrollment/retry.');
} finally { await db.close(); }
