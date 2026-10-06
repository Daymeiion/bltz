import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import assert from 'node:assert/strict';

// Isolated Postgres engine; no credentials, network, production data or Docker.
const db = new PGlite();
const admin='00000000-0000-4000-8000-000000000001';
const viewer='00000000-0000-4000-8000-000000000002';
const stranger='00000000-0000-4000-8000-000000000003';
const preview='00000000-0000-4000-8000-000000000004';
const player='00000000-0000-4000-8000-000000000005';
await db.exec(`create role anon; create role authenticated; create role service_role;
create schema auth;
create schema private;
grant usage on schema auth to authenticated;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function public.is_internal_admin() returns boolean language sql stable as $$ select auth.uid()='${admin}'::uuid $$;
create table public.players(id uuid primary key);
create table public.preview_lockers(id uuid primary key,player_id uuid references players(id),revision integer not null,viewer_id uuid,expires_at timestamptz);
alter table public.preview_lockers enable row level security;
grant select on public.preview_lockers to authenticated;
create policy preview_read on public.preview_lockers for select to authenticated using(public.is_internal_admin() or (viewer_id=auth.uid() and expires_at>now()));
create table public.audit_logs(action text,entity_type text,entity_id text,actor_user_id uuid,new_values jsonb);`);
const baseline=fs.readFileSync('supabase/migrations/20260701000000_production_schema_baseline.sql','utf8');
const start=baseline.indexOf('CREATE TABLE IF NOT EXISTS "public"."player_awards" (');
await db.exec(baseline.slice(start,baseline.indexOf('\n);',start)+3));
await db.exec('alter table public.player_awards add primary key(id); alter table public.player_awards add constraint player_awards_player_id_fkey foreign key(player_id) references public.players(id)');
const migration='supabase/migrations/20260929205021_preview_awards_news_enrichment.sql';
await db.exec(fs.readFileSync(migration,'utf8'));
await db.exec(fs.readFileSync('supabase/migrations/20260929214716_preview_enrichment_nonretryable_conflicts.sql','utf8'));
await db.exec(`insert into players values('${player}');
insert into preview_lockers values('${preview}','${player}',1,'${viewer}',now()+interval '1 day');
insert into player_awards(player_id,name,description,category,year,organization,significance)
values('${player}','Heisman winner','Existing achievement','sports',2001,'College','national');`);
const catalog=(await db.query(`select * from award_catalog where slug='heisman-trophy'`)).rows[0];
assert.equal((await db.query('select count(*)::int n from award_catalog')).rows[0].n,26);
const award={award_id:catalog.id,raw_label:'Heisman winner',year:'2001',edition:'',source_url:'https://example.com/award',source_type:'source_reference',confidence:1,metadata:{mapping:'alias'}};
const unknown={...award,award_id:null,raw_label:'Team award',metadata:{mapping:'unmapped'}};
const article={headline:'Athlete at Cal',headline_key:'example.com|athlete at cal',publisher:'Example',article_url:'https://example.com/story',canonical_url:'https://example.com/story',thumbnail_url:null,published_at:null,author:null,summary:'Football news',source_domain:'example.com',discovery_source:'fixture',discovered_at:new Date().toISOString(),relevance_score:0.9,confidence:0.9,metadata:{extraction:'NewsArticle'}};
let tick=Date.now()-60000;
const advance=()=>{args[3]=new Date(++tick).toISOString();};
const args=[preview,1,'a'.repeat(64),new Date(tick).toISOString(),JSON.stringify([award,unknown]),JSON.stringify([article]),JSON.stringify({status:'complete',articles_accepted:1})];
const save=()=>db.query('select save_preview_enrichment($1,$2,$3,$4,$5,$6,$7)',args);
await db.exec('set role anon');
await assert.rejects(save,/permission denied/);
await assert.rejects(db.query('select * from player_articles'),/permission denied/);
await db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub','${stranger}',false)`);
await assert.rejects(save,/forbidden/);
assert.equal((await db.query('select * from preview_award_links')).rows.length,0);
await db.exec(`select set_config('request.jwt.claim.sub','${admin}',false)`);
await save(); await save();
assert.equal((await db.query('select * from preview_award_links')).rows.length,2);
assert.equal((await db.query('select * from player_articles')).rows.length,1);
await db.exec('reset role');
const linked=(await db.query('select * from player_awards')).rows[0];
assert.equal(linked.award_id,catalog.id); assert.equal(linked.verified,false);
assert.equal((await db.query('select count(*)::int n from player_awards')).rows[0].n,1);
assert.equal((await db.query('select count(*)::int n from audit_logs')).rows[0].n,1); // exact retry is a no-op
assert.equal((await db.query('select player_id from preview_award_links limit 1')).rows[0].player_id,player);
await assert.rejects(db.exec(`update award_catalog set asset_status='approved',canonical_image_url='https://example.com/trophy' where id='${catalog.id}'`),/award_catalog_approved_asset/);
await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${viewer}',false)`);
assert.equal((await db.query('select * from player_articles')).rows.length,1);
assert.equal((await db.query('select * from preview_award_links')).rows.length,2);
assert.equal((await db.query('select * from preview_enrichments')).rows.length,0);
await db.exec(`reset role; update preview_lockers set revision=2; set role authenticated;`);
assert.equal((await db.query('select * from player_articles')).rows.length,0);
assert.equal((await db.query('select * from preview_award_links')).rows.length,0);
await db.exec(`reset role; update preview_lockers set revision=1; set role authenticated;`);
await assert.rejects(save,/forbidden/);
await assert.rejects(db.exec(`update player_articles set headline='changed'`),/permission denied/);
await db.exec(`reset role; update preview_lockers set expires_at=now()-interval '1 second'; set role authenticated;`);
assert.equal((await db.query('select * from player_articles')).rows.length,0);
assert.equal((await db.query('select * from preview_award_links')).rows.length,0);
await db.exec(`select set_config('request.jwt.claim.sub','${admin}',false)`);
args[1]=2; await assert.rejects(save,{code:'PT409',message:'preview_changed'}); args[1]=1;
args[3]='2000-01-01T00:00:00Z'; await assert.rejects(save,/newer_enrichment_exists/);
advance(); args[4]=null; args[5]=null; args[6]=JSON.stringify({status:'unavailable',articles_accepted:0,errors:['search_failed']}); await save();
assert.equal((await db.query('select * from player_articles')).rows.length,1); // failed refresh retains prior data
let report=(await db.query('select report from preview_enrichments')).rows[0].report;
assert.equal(report.status,'unavailable'); assert.equal(report.last_news_success.articles_accepted,1);
args[5]='[]'; await assert.rejects(save,/newer_enrichment_exists/); // same millisecond, different payload
advance(); args[5]=JSON.stringify([article,{...article,canonical_url:'https://example.com/alternate'}]); args[6]=JSON.stringify({status:'complete',articles_accepted:1}); await save();
assert.equal((await db.query('select * from player_articles')).rows.length,1); // headline constraint
advance();
args[4]=JSON.stringify([{...award,award_id:stranger}]);
await assert.rejects(save,/foreign key/);
args[4]=null;
for (const bad of [
  {...article,thumbnail_url:'javascript:alert(1)'}, {...article,article_url:'http://example.com/story'},
  {...article,canonical_url:'https://user:password@example.com/story'}, {...article,publisher:'x'.repeat(301)},
  {...article,headline:42}, {...article,author:'x'.repeat(301)}, {...article,metadata:{body:'x'.repeat(5000)}},
]) {
  args[5]=JSON.stringify([bad]); await assert.rejects(save,/invalid_article/);
}
for (const bad of [{...award,source_url:'data:text/html,hi'}, {...award,raw_label:'x'.repeat(201)}, {...award,verified:true}, {...award,metadata:[]}]) {
  args[4]=JSON.stringify([bad]); args[5]=null; await assert.rejects(save,/invalid_award/);
}
assert.equal((await db.query('select * from player_articles')).rows.length,1); // failed transaction didn't retire active set
args[4]=null;
const second={...article,headline:'Second story',headline_key:'example.com|second story',canonical_url:'https://example.com/second',article_url:'https://example.com/second'};
args[5]=JSON.stringify([article,second]); await save();
assert.equal((await db.query('select * from player_articles')).rows.length,2);
advance(); args[5]=JSON.stringify([second]); await save();
assert.deepEqual((await db.query('select headline from player_articles')).rows.map(r=>r.headline),['Second story']);
advance(); args[5]='[]'; args[6]=JSON.stringify({status:'complete',articles_accepted:0}); await save();
assert.equal((await db.query('select * from player_articles')).rows.length,0);
report=(await db.query('select report from preview_enrichments')).rows[0].report;
assert.equal(report.last_news_success.articles_accepted,0);
advance(); args[5]=null; args[6]=JSON.stringify({status:'unavailable'}); await save();
assert.equal((await db.query('select * from player_articles')).rows.length,0);
await db.exec('reset role');
assert.equal((await db.query('select count(*)::int n from preview_award_links')).rows[0].n,2);
assert.ok((await db.query("select count(*)::int n from player_articles where status='inactive'")).rows[0].n>=4);
assert.ok((await db.query("select count(*)::int n from audit_logs where (new_values->>'articles_retired')::int>0")).rows[0].n>=3);
// A skipped refresh on a new revision keeps the last successful matching set.
await db.exec(`update preview_lockers set revision=2,expires_at=now()+interval '1 day'; set role authenticated;`);
advance(); args[1]=2; args[5]=JSON.stringify([second]); args[6]=JSON.stringify({status:'complete',articles_accepted:1}); await save();
await db.exec('reset role; update preview_lockers set revision=3; set role authenticated;');
advance(); args[1]=3; args[5]=null; args[6]=JSON.stringify({status:'complete',news_status:'skipped'}); await save();
await db.exec(`select set_config('request.jwt.claim.sub','${viewer}',false)`);
assert.equal((await db.query('select * from player_articles')).rows.length,1);
assert.equal((await db.query('select source_revision from player_articles')).rows[0].source_revision,3);
await db.exec(`select set_config('request.jwt.claim.sub','${admin}',false)`);
advance(); args[2]='b'.repeat(64); args[6]=JSON.stringify({status:'unavailable'}); await save();
assert.equal((await db.query('select report from preview_enrichments')).rows[0].report.last_news_success,null);
await db.exec('reset role');

if(process.argv.includes('--generate-types') || process.argv.includes('--check-types')) {
  const tables=['award_catalog','preview_award_links','player_articles','preview_enrichments','player_awards'];
  const typeFor=(type)=>type==='jsonb'?'Json':type==='boolean'?'boolean':['integer','numeric','bigint'].includes(type)?'number':type==='ARRAY'?'string[]':'string';
  let output="// Generated from the applied preview-enrichment migration by scripts/verify-preview-enrichment.mjs.\nimport type { Json } from './database.generated';\nexport type EnrichmentDatabase = { public: { Tables: {\n";
  for(const table of tables) {
    const cols=(await db.query(`select column_name,data_type,is_nullable,column_default from information_schema.columns where table_schema='public' and table_name=$1 order by ordinal_position`,[table])).rows;
    const fields=(mode)=>cols.map(c=>`      ${c.column_name}${mode==='Update'||(mode==='Insert'&&(c.column_default!==null||c.is_nullable==='YES'))?'?':''}: ${typeFor(c.data_type)}${c.is_nullable==='YES'?' | null':''}`).join('\n');
    const relationships=(await db.query(`select c.conname as "foreignKeyName", exists(select 1 from pg_constraint u where u.conrelid=c.conrelid and u.contype in ('u','p') and u.conkey=c.conkey) as "isOneToOne", r.relname as "referencedRelation",
      (select json_agg(a.attname order by u.ord) from unnest(c.conkey) with ordinality u(num,ord) join pg_attribute a on a.attrelid=c.conrelid and a.attnum=u.num) as columns,
      (select json_agg(a.attname order by u.ord) from unnest(c.confkey) with ordinality u(num,ord) join pg_attribute a on a.attrelid=c.confrelid and a.attnum=u.num) as "referencedColumns"
      from pg_constraint c join pg_class r on r.oid=c.confrelid where c.contype='f' and c.conrelid=('public.'||$1)::regclass`,[table])).rows;
    output+=`  ${table}: {\n    Row: {\n${fields('Row')}\n    }\n    Insert: {\n${fields('Insert')}\n    }\n    Update: {\n${fields('Update')}\n    }\n    Relationships: ${JSON.stringify(relationships,null,2)}\n  }\n`;
  }
  const fn=(await db.query(`select proargnames,proargtypes::regtype[]::text types,prorettype::regtype::text result from pg_proc where proname='save_preview_enrichment'`)).rows[0];
  assert.equal(fn.result,'jsonb');
  const argsTypes=fn.types.replace(/^[^{]*\{|\}$/g,'').split(',');
  const argsFields=fn.proargnames.map((name,i)=>`${name}: ${argsTypes[i]==='jsonb'?'Json':argsTypes[i]==='integer'?'number':'string'}`).join('; ');
  output+=`}; Views: Record<string, never>; Functions: { save_preview_enrichment: { Args: { ${argsFields} }; Returns: Json } }; Enums: Record<string, never>; CompositeTypes: Record<string, never> } };\n`;
  if (process.argv.includes('--generate-types')) fs.writeFileSync('types/enrichment.generated.ts',output);
  else assert.equal(fs.readFileSync('types/enrichment.generated.ts','utf8').replace(/\r\n/g,'\n'), output, 'Enrichment types differ from the isolated applied schema');
}
await db.close();
console.log('PASS: migration, 26 catalog seeds, player linking without new achievements, unknown evidence, idempotency, canonical/headline dedupe, audit, rollback, failure preservation, stale writes, image approval constraints, admin/viewer/stranger/anonymous/expired access; scoped types generated when requested.');
