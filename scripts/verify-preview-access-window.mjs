// Disposable embedded PostgreSQL only. Synthetic fixtures; never a hosted DB.
// PGlite serializes simultaneous promises: this verifies retry serialization,
// not separate-client lock contention. The SQL row locks also need staging QA.
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const db = new PGlite();
const uid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const admin = uid(1), viewer = uid(2), other = uid(3), preview = uid(10), contact = uid(20), wrong = uid(21);
const read = p => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const apply = name => db.exec(read(`supabase/migrations/${name}`));
let checks = 0;
const eq = (value, expected, label) => { assert.deepEqual(value, expected, label); checks++; };
const denied = async (task, pattern) => { await assert.rejects(task, pattern); checks++; };
async function actor(id, role = 'authenticated') {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id ?? '']);
  await db.exec(`set role ${role}`);
}
const q = async (sql, args = []) => (await db.query(sql, args)).rows[0]?.result;
const status = () => q('select preview_public_link_status($1) result', [preview]);
const start = (p = preview, a = null) => q('select start_preview_link_access($1,$2) result', [p, a]);
const extend = (request = crypto.randomUUID(), reason = 'Personal request for more review time') => q('select extend_preview_link_access($1,$2,$3) result', [preview, reason, request]);
const conversion = (action, data = {}, p = preview) => q('select preview_conversion($1,$2,$3,$4,$5) result', [p, action, crypto.randomUUID(), uid(90), JSON.stringify(data)]);
const inquiry = email => q('select save_preview_link_inquiry($1,$2,$3,$4,$5,$6) result', [preview, email, 'More career context', uid(90), null, 'development']);
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema private; create schema storage;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,deleted_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function public.is_internal_admin() returns boolean language sql stable as $$select auth.uid()='${admin}'::uuid$$;
    create function private.has_active_platform_role(p_actor uuid,p_roles text[]) returns boolean language sql stable as $$select p_actor='${admin}'::uuid$$;
    grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
    create table public.audit_logs(id bigserial primary key,actor_user_id uuid,action text,entity_type text,entity_id text,actor_role_scope text,risk_level text,previous_values jsonb,new_values jsonb,request_metadata jsonb);
    create table public.gtm_contacts(id uuid primary key default gen_random_uuid(),display_name text,email text,contact_type text,source text,source_record_id text,created_by uuid,do_not_automate boolean,next_action text,archived boolean default false,player_master_gsis_id text);
    create table public.gtm_player_preview_lockers(preview_locker_id uuid,gsis_id text,completed_revision int);
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security; grant select,insert on storage.objects to authenticated;
    grant usage on schema storage to authenticated;
    create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array(regexp_replace($1,'/[^/]+$',''),'/')$$;
    create table public.analytics_delivery_outbox(event_id uuid primary key,environment text,envelope jsonb,accepted_at timestamptz default clock_timestamp());
    create function public.accept_analytics_delivery_event(p_event jsonb,p_envelope jsonb) returns jsonb language plpgsql as $$begin insert into public.analytics_delivery_outbox(event_id,environment,envelope) values((p_envelope->>'event_id')::uuid,p_envelope->>'environment',p_envelope) on conflict do nothing; return jsonb_build_object('duplicate',false); end$$;
  `);
  for (const name of ['20260831161831_private_preview_lockers.sql','20260901184112_private_preview_assigned_viewer.sql','20260908213000_private_preview_media_and_stats.sql','20260911185101_preview_conversion_sprint.sql','20260914184728_preview_claim_requests_and_expiry.sql','20260914213500_preview_award_sources.sql','20260915003000_preview_award_descriptions.sql']) await apply(name);
  // Only the exact released preview validator portion; canonical Locker hero
  // architecture is outside this disposable preview dependency boundary.
  const hero = read('supabase/migrations/20260915010000_locker_hero_devices.sql');
  await db.exec(hero.slice(hero.indexOf('create or replace function private.preview_items_valid'), hero.indexOf('alter table public.player_lockers')));
  for (const name of ['20260922140000_preview_video_categories.sql','20260922160000_preview_photo_placement.sql','20260928181500_private_preview_short_links.sql','20260928195000_preview_link_access.sql','20261009003454_preview_sprint_delivery_bridge.sql','20261009022458_preview_claim_browser_session.sql']) await apply(name);
  const awards = read('supabase/migrations/20260922190000_preview_awards_social.sql');
  await db.exec(awards.slice(awards.indexOf('do $migration$'), awards.indexOf('create or replace function private.preview_social_valid')));
  const oldValidator = await q("select pg_get_functiondef('private.preview_items_valid(text,jsonb)'::regprocedure) result");
  await db.query('insert into auth.users values($1,$2,now(),null),($3,$4,now(),null),($5,$6,now(),null)', [admin,'admin@example.test',viewer,'viewer@example.test',other,'other@example.test']);
  await actor(admin);
  await db.query('insert into preview_lockers(id,slug,full_name) values($1,$2,$3)', [preview,'synthetic-window','Synthetic Athlete']);
  await db.exec('reset role');
  await db.query('insert into gtm_contacts(id,display_name,email) values($1,$2,null),($3,$4,null)', [contact,'Intended Contact',wrong,'Wrong Contact']);
  await actor(admin);
  await db.query('insert into preview_locker_short_links(preview_id,alias,public_access_enabled) values($1,$2,true)', [preview,'synthetic-window']);
  await db.exec('reset role');
  await apply('20261013161640_preview_manual_link_access_window.sql');
  const newValidator = await q("select pg_get_functiondef('private.preview_items_valid(text,jsonb)'::regprocedure) result");
  eq(newValidator.replace('max_items := 32;', 'max_items := 12;'), oldValidator, 'only approved team cap changed');
  await actor(null,'service_role');
  eq((await status()).state,'pending','existing public link adopted as pending');
  eq((await status()).access_started_at,null,'creation and inspection do not start access');
  eq((await start(preview,admin)).excluded,true,'verified Admin never starts window');
  await denied(inquiry('pending@example.test'),/preview unavailable/);
  await actor(null,'anon'); await denied(start(),/permission denied/); await denied(extend(),/permission denied/);
  await actor(other); await denied(start(),/permission denied/); await denied(extend(),/forbidden/);
  eq((await db.query('select * from preview_link_inquiries')).rows.length,0,'nonadmin RLS hides inquiries');
  await actor(admin); await denied(extend(),/started published link/);
  await denied(db.query('update preview_locker_short_links set access_expires_at=clock_timestamp() where preview_id=$1',[preview]),/permission denied/);
  await conversion('enroll',{contact_id:contact,campaign:'manual',channel:'instagram',source:'alumni',relationship:'warm'});
  const sentAt = new Date(Date.now()-60_000).toISOString();
  await conversion('sent',{channel:'facebook',sent_at:sentAt});
  eq((await conversion('sent',{channel:'facebook',sent_at:sentAt})).duplicate,true,'exact sent replay');
  await denied(conversion('sent',{channel:'sms',sent_at:sentAt}),/immutable/);
  await db.exec('reset role');
  eq((await db.query('select channel,sent_channel from preview_conversion_campaigns')).rows[0],{channel:'instagram',sent_channel:'facebook'},'actual channel separate from enrollment');
  await actor(null,'service_role'); eq((await status()).state,'pending','enrollment and sent marking do not start access');
  const starts = await Promise.all([start(),start(),start()]);
  eq(new Set(starts.map(s=>s.access_started_at)).size,1,'queued first-start contenders share one clock');
  eq(new Date(starts[0].access_expires_at)-new Date(starts[0].access_started_at),48*3600_000,'exact initial duration');
  eq((await start()).access_expires_at,starts[0].access_expires_at,'reload cannot renew');
  await db.exec('reset role'); eq((await db.query("select count(*)::int n from audit_logs where action='preview.link_access_started'")).rows[0].n,1,'one activation audit');
  await actor(admin); await db.query('update preview_locker_short_links set alias=$2,public_access_enabled=false where preview_id=$1',[preview,'renamed-window']);
  await db.query('update preview_locker_short_links set public_access_enabled=true where preview_id=$1',[preview]);
  await actor(null,'service_role'); eq((await status()).access_expires_at,starts[0].access_expires_at,'alias and republish preserve clock');
  eq(await inquiry('submitted@example.test'),{saved:true},'public unverified inquiry persists');
  await db.exec('reset role'); eq((await db.query('select email from gtm_contacts where id=$1',[contact])).rows[0].email,null,'inquiry never auto-copies contact email');
  eq((await db.query('select count(*)::int n from preview_conversion_responses')).rows[0].n,0,'no fabricated athlete response');
  const inquiryId=(await db.query('select id from preview_link_inquiries')).rows[0].id;
  await actor(other); await denied(q('select accept_preview_inquiry_email($1,$2,$3) result',[inquiryId,contact,'Reviewed personal follow-up request']),/forbidden/);
  await actor(admin); await denied(q('select accept_preview_inquiry_email($1,$2,$3) result',[inquiryId,wrong,'Reviewed personal follow-up request']),/enrollment mismatch/);
  eq(await q('select accept_preview_inquiry_email($1,$2,$3) result',[inquiryId,contact,'Reviewed personal follow-up request']),{saved:true},'explicit enrolled contact review');
  await conversion('booking_confirmed'); await conversion('walkthrough_completed');
  const request=crypto.randomUUID();const extension=await extend(request);eq(extension.access_started_at,starts[0].access_started_at,'extension retains original start');
  eq(new Date(extension.access_expires_at)-new Date(starts[0].access_expires_at),48*3600_000,'active extension adds 48h');
  eq((await extend(request)).duplicate,true,'extension request replay does not add time');
  await denied(extend(request,'Different personal request reason'),/collision/);
  // Synthetic clock travel only: owner writes model elapsed time, never API.
  await db.exec('reset role'); await db.query("update preview_locker_short_links set access_started_at=clock_timestamp()-interval '49 hours',access_expires_at=clock_timestamp()-interval '1 hour',access_extended_at=null where preview_id=$1",[preview]);
  await actor(null,'service_role'); eq((await status()).state,'expired');await denied(start(),/expired/);await denied(inquiry('late@example.test'),/preview unavailable/);
  await denied(q('select record_preview_analytics_event($1,$2,$3) result',[JSON.stringify({previewId:preview,eventId:crypto.randomUUID(),sessionId:uid(90),eventName:'locker_view'}),null,'development']),/preview unavailable/);
  await actor(admin); await db.query('select assign_preview_locker_viewer($1,$2)',[preview,'viewer@example.test']);
  await actor(viewer); eq((await db.query('select id from preview_lockers where id=$1',[preview])).rows.length,0,'expired public link cannot bypass through restricted grant');
  eq(await q('select preview_media_ttl($1) result',[preview]),0,'expired signing TTL');
  await actor(admin);const renewal=await extend();eq(renewal.state,'active','explicit expired extension renews');
  assert.ok(new Date(renewal.access_expires_at)-Date.now()<=48*3600_000);checks++;
  await actor(viewer);eq((await db.query('select id from preview_lockers where id=$1',[preview])).rows.length,1,'renewed window enables current grant');
  await db.exec('reset role');
  const storedPath=preview+'/photos/'+uid(80)+'.jpg';
  await db.query("insert into storage.objects(bucket_id,name) values('preview-locker-photos',$1)",[storedPath]);
  await actor(viewer);eq((await db.query("select name from storage.objects where bucket_id='preview-locker-photos'")).rows.length,0,'active viewer cannot directly mint arbitrary Storage signing lifetime');
  await actor(admin);eq((await db.query("select name from storage.objects where bucket_id='preview-locker-photos'")).rows.length,1,'Admin preview Storage inspection retained');
  const teams=n=>JSON.stringify(Array.from({length:n},(_,i)=>({label:'Team '+i,color:'#ffbb00',logo:null})));
  await db.exec('reset role');for(const n of [12,13,32])eq(await q("select private.preview_items_valid('team',$1) result",[teams(n)]),true,'valid cap '+n);
  eq(await q("select private.preview_items_valid('team',$1) result",[teams(33)]),false,'33 remains denied');
  await actor(admin);
  await db.query('update preview_lockers set schools=$2 where id=$1',[preview,teams(32)]);
  eq((await db.query('select jsonb_array_length(schools)::int result from preview_lockers where id=$1',[preview])).rows[0].result,32,'32 affiliations persist');
  await denied(db.query('update preview_lockers set schools=$2 where id=$1',[preview,teams(33)]),/check constraint/);
  if (process.argv.includes('--generate-types')) {
    await db.exec('reset role');
    for (const [table,file] of [['preview_locker_short_links','types/preview-lockers.generated.ts'],['preview_link_inquiries','types/preview-lockers.generated.ts'],['preview_conversion_campaigns','types/preview-conversion.generated.ts']]) {
      const columns=(await db.query("select column_name,data_type,is_nullable,column_default from information_schema.columns where table_schema='public' and table_name=$1 order by column_name",[table])).rows;
      const fields=mode=>columns.map(c=>`          ${c.column_name}${mode==='Update'||(mode==='Insert'&&(c.column_default!==null||c.is_nullable==='YES'))?'?':''}: ${c.data_type==='boolean'?'boolean':c.data_type==='jsonb'?'Json':'string'}${c.is_nullable==='YES'?' | null':''}`).join('\n');
      const original=fs.readFileSync(file,'utf8');
      const replacement=`${table}: {\n${['Row','Insert','Update'].map(mode=>`        ${mode}: {\n${fields(mode)}\n        }`).join('\n')}\n        Relationships:`;
      const expression=new RegExp(table+': \\{[\\s\\S]*?Relationships:');
      fs.writeFileSync(file,original.replace(expression,()=>replacement));
    }
    let generated=fs.readFileSync('types/preview-lockers.generated.ts','utf8');
    generated=generated.replace(/^      (?:preview_public_link_status|start_preview_link_access|extend_preview_link_access|accept_preview_inquiry_email):[^\n]*\n/gm,'');
    generated=generated.replace('    Functions: {','    Functions: {\n      preview_public_link_status: { Args: { p_preview: string }; Returns: Json }\n      start_preview_link_access: { Args: { p_preview: string; p_actor?: string | null }; Returns: Json }\n      extend_preview_link_access: { Args: { p_preview: string; p_reason: string; p_request?: string }; Returns: Json }\n      accept_preview_inquiry_email: { Args: { p_inquiry: string; p_contact: string; p_reason: string }; Returns: Json }');
    fs.writeFileSync('types/preview-lockers.generated.ts',generated);
  }
  console.log(`PASS: ${checks} disposable PostgreSQL access-window, permission, inquiry, audit, cap and retry assertions. PGlite queued concurrency only; no hosted mutations.`);
} catch (error) { console.error('FAIL:', error.message, error.query ?? ''); process.exitCode = 1; }
finally { await db.close(); }
