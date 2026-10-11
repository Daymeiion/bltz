// Embedded PostgreSQL only. No SMTP, IMAP, cloud database or live recipients.
// Run: node scripts/verify-preview-invitation-email.mjs <local PGlite module path>
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const modulePath = process.argv[2];
if (!modulePath) throw new Error('Supply the installed local PGlite module path');
const { PGlite } = await import(pathToFileURL(modulePath).href);
const db = new PGlite();
let checks = 0;
const uid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const admin=uid(1), viewer=uid(2), other=uid(3), p=uid(10), privateP=uid(11), contact=uid(20), wrongContact=uid(21);
await db.exec(`
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create schema private;
create table auth.users(id uuid primary key,email text,deleted_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function public.is_internal_admin() returns boolean language sql stable as $$ select auth.uid()='${admin}'::uuid $$;
create function private.has_active_platform_role(p_actor uuid,p_roles text[]) returns boolean language sql stable as $$ select p_actor='${admin}'::uuid $$;
grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
create table public.preview_lockers(id uuid primary key,full_name text,photos jsonb default '[]',videos jsonb default '[]',headshot_url text,hero_video_url text);
create table public.gtm_contacts(id uuid primary key,display_name text,email text,archived boolean default false,player_master_gsis_id text);
create table public.preview_locker_short_links(preview_id uuid primary key references preview_lockers(id),alias text,public_access_enabled boolean);
create table public.preview_locker_viewer_grants(preview_locker_id uuid primary key references preview_lockers(id),viewer_user_id uuid references auth.users(id),assigned_at timestamptz);
create table public.preview_conversion_campaigns(preview_id uuid primary key references preview_lockers(id),contact_id uuid references gtm_contacts(id),is_test boolean,sent_at timestamptz);
create table public.gtm_player_preview_lockers(preview_locker_id uuid references preview_lockers(id),gsis_id text);
create table public.audit_logs(id bigserial primary key,actor_user_id uuid,action text,entity_type text,entity_id text,actor_role_scope text,risk_level text,previous_values jsonb,new_values jsonb,request_metadata jsonb);
create table private.preview_analytics_capture_config(singleton boolean primary key,environment text);
insert into private.preview_analytics_capture_config values(true,'development');
create table public.analytics_delivery_outbox(event_id uuid primary key,environment text,envelope jsonb,accepted_at timestamptz default clock_timestamp());
create function public.accept_analytics_delivery_event(p_event jsonb,p_envelope jsonb) returns jsonb language plpgsql set search_path='' as $$ begin insert into public.analytics_delivery_outbox(event_id,environment,envelope) values((p_envelope->>'event_id')::uuid,p_envelope->>'environment',p_envelope); return jsonb_build_object('duplicate',false); end $$;
`);
const bridge=fs.readFileSync('supabase/migrations/20261009003454_preview_sprint_delivery_bridge.sql','utf8');
await db.exec(bridge.slice(bridge.indexOf('create function private.append_preview_analytics('),bridge.indexOf('create function private.export_preview_conversion_event()')));
await db.exec(fs.readFileSync('supabase/migrations/20261011213800_preview_invitation_email.sql','utf8'));
await db.query('insert into auth.users values($1,$2,null),($3,$4,null),($5,$6,null)',[admin,'admin@example.test',viewer,'athlete@example.test',other,'other@example.test']);
await db.query('insert into preview_lockers(id,full_name) values($1,$2),($3,$4)',[p,'Synthetic Public Athlete',privateP,'Synthetic Private Athlete']);
await db.query('insert into gtm_contacts values($1,$2,$3,false,$4),($5,$6,$7,false,$8)',[contact,'Synthetic Athlete','athlete@example.test','gsis-one',wrongContact,'Wrong Athlete','other@example.test','gsis-two']);
await db.query('insert into preview_locker_short_links values($1,$2,true),($3,$4,false)',[p,'synthetic-public',privateP,'synthetic-private']);
await db.query('insert into preview_locker_viewer_grants values($1,$2,clock_timestamp())',[privateP,viewer]);
await db.query('insert into gtm_player_preview_lockers values($1,$2)',[privateP,'gsis-one']);
async function actor(id,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id??'']);await db.exec(`set role ${role}`);}
async function q(sql,args=[]){return (await db.query(sql,args)).rows[0]?.result;}
async function prepare(preview=p,c=contact,r=crypto.randomUUID(),env='development'){return q('select public.prepare_preview_invitation_email($1,$2,$3,$4) result',[preview,c,r,env]);}
async function begin(id,env='development'){return q('select public.begin_preview_invitation_email($1,$2) result',[id,env]);}
async function settle(id,state='smtp_accepted',code=null,env='development'){return q('select public.settle_preview_invitation_email($1,$2,$3,$4) result',[id,env,state,code]);}
async function dsn(a,receipt,action,status,time,recipient=a.recipient_email,message=a.message_id){return q('select public.record_preview_invitation_dsn($1,$2,$3,$4,$5,$6,$7,$8) result',[a.id,'development',receipt,message,recipient,action,status,time]);}
async function reject(task,pattern){await assert.rejects(task,pattern);checks++;}
function eq(value,expected,label){assert.deepEqual(value,expected,label);checks++;}
async function age(a,seconds=31){await db.exec('reset role');await db.exec('alter table private.preview_invitation_email_attempts disable trigger preview_invitation_email_snapshot');await db.query("update private.preview_invitation_email_attempts set created_at=created_at-($2::text||' seconds')::interval where id=$1",[a.id,seconds]);await db.exec('alter table private.preview_invitation_email_attempts enable trigger preview_invitation_email_snapshot');}
await actor(null,'anon');await reject(prepare(),/permission denied/);
await actor(other);await reject(prepare(),/forbidden/);
await reject(q('select public.preview_invitation_email_report($1,$2) result',[p,'development']),/forbidden/);
await actor(null,'service_role');await reject(prepare(),/permission denied/);
await actor(admin);const request=crypto.randomUUID();const [a,initialReplay]=await Promise.all([prepare(p,contact,request),prepare(p,contact,request)]);
eq(initialReplay.id,a.id,'queued simultaneous same-request prepares preserve one identity');eq(initialReplay.should_send,false);
eq(a.state,'prepared');eq(a.should_send,true);eq(a.message_id,`<bltz-preview-${a.id}@bltz.me>`);
eq((await prepare(p,contact,request)).should_send,false);
await reject(prepare(privateP,contact,request),/request collision/);
await reject(prepare(p,contact),/recent invitation/);
await reject(begin(a.id),/permission denied/);
await reject(settle(a.id),/permission denied/);
await actor(null,'service_role');await reject(begin(a.id,'production'),/unavailable/);
const concurrentBegins=await Promise.all([begin(a.id),begin(a.id)]);eq(concurrentBegins.map(result=>result.should_send),[true,false],'only one queued begin claims SMTP');
await reject(settle(a.id,'send_failed','arbitrary SMTP secret'),/invalid SMTP/);
eq((await settle(a.id)).state,'smtp_accepted');eq((await settle(a.id)).duplicate,true);
eq((await settle(a.id,'send_uncertain','smtp_uncertain')).settled,false);
const now=Date.now();const t=n=>new Date(now+n*1000).toISOString();
await reject(dsn(a,'10:1','failed','4.1.1',t(0)),/invalid DSN/);
await reject(dsn(a,'10:1','delivered','2.0.0',t(0),'spoof@example.test'),/mismatch/);
await reject(dsn(a,'10:1','delivered','2.0.0',t(0),a.recipient_email,'<wrong@bltz.me>'),/mismatch/);
eq((await dsn(a,'10:1','delayed','4.2.0',t(0))).state,'delivery_delayed');
eq((await dsn(a,'10:1','delayed','4.2.0',t(0))).duplicate,true);
await reject(dsn(a,'10:1','delayed','4.3.0',t(0)),/receipt collision/);
eq((await dsn(a,'10:2','delayed','4.2.0',t(3))).state,'delivery_delayed');
eq((await dsn(a,'10:3','delivered','2.0.0',t(2))).state,'delivery_delayed','same-state observations still advance ordering');
eq((await dsn(a,'10:4','delivered','2.0.0',t(4))).state,'delivery_reported');
eq((await dsn(a,'10:44','delayed','4.2.0',t(9))).state,'delivery_reported','delivery report cannot regress to delay');
await actor(admin);let report=await q('select public.preview_invitation_email_report($1,$2) result',[p,'development']);
eq(report.counts.delivery_reported,1);eq(report.total_attempts,1);eq(report.attempts[0].recipient_masked,'a***@example.test');
assert.ok(!JSON.stringify(report).includes(a.recipient_email));checks++;
assert.ok(!JSON.stringify(report).includes(a.message_id));checks++;
assert.ok(!JSON.stringify(report).includes(a.short_alias));checks++;
await actor(null,'service_role');eq((await q('select public.pending_preview_invitation_email_checks($1) result',['development'])).length,1,'delivery reports remain matchable for late bounces');
eq((await dsn(a,'10:5','failed','5.1.1',t(1))).state,'bounced','late-arriving earlier bounce remains terminal');
eq((await dsn(a,'10:6','delivered','2.0.0',t(5))).state,'bounced');
eq((await settle(a.id)).state,'bounced','SMTP replay cannot regress DSN');
eq((await q('select public.pending_preview_invitation_email_checks($1) result',['development'])).length,0);
await actor(admin);await reject(prepare(privateP,wrongContact),/recipient or preview access/);
const b=await prepare(privateP,contact);eq(b.recipient_email,'athlete@example.test');
await db.exec('reset role');await db.query("update preview_locker_viewer_grants set assigned_at=clock_timestamp()-interval '49 hours' where preview_locker_id=$1",[privateP]);
await actor(null,'service_role');await reject(begin(b.id),/recipient or preview access/);
await db.exec('reset role');await db.query('update preview_locker_viewer_grants set assigned_at=clock_timestamp() where preview_locker_id=$1',[privateP]);
await actor(null,'service_role');eq((await begin(b.id)).should_send,true);
eq((await dsn(b,'10:7','delivered','2.0.0',t(6))).state,'delivery_reported','DSN can precede SMTP settlement');
eq((await settle(b.id)).state,'delivery_reported');
await actor(admin);report=await q('select public.preview_invitation_email_report($1,$2) result',[privateP,'development']);assert.ok(report.attempts[0].smtp_accepted_at);checks++;
await actor(null,'service_role');await reject(dsn(b,'10:7','failed','5.1.1',t(6)),/receipt collision/);
await age(a);await actor(admin);const c=await prepare();await actor(null,'service_role');await begin(c.id);eq((await settle(c.id,'send_uncertain','smtp_uncertain')).state,'send_uncertain');eq((await begin(c.id)).should_send,false);
eq((await dsn(c,'10:8','failed','5.1.1',t(7))).state,'bounced','uncertain send can receive a DSN');
await age(c);await actor(admin);const stale=await prepare();await age(stale,3601);await actor(null,'service_role');await reject(begin(stale.id),/expired/);
await age(stale);await actor(admin);const changed=await prepare();await db.exec('reset role');await db.query('update gtm_contacts set email=$2 where id=$1',[contact,'changed@example.test']);await actor(null,'service_role');await reject(begin(changed.id),/recipient or preview access/);
await db.exec('reset role');await db.query('update gtm_contacts set email=$2 where id=$1',[contact,'athlete@example.test']);
await actor(null,'service_role');await begin(changed.id);eq((await settle(changed.id,'send_failed','smtp_rejected')).state,'send_failed');await reject(dsn(changed,'10:9','failed','5.1.1',t(8)),/not submitted/);
for(const role of ['anon','authenticated','service_role']){
  await actor(role==='authenticated'?admin:null,role);
  await reject(db.exec('select * from private.preview_invitation_email_attempts'),/permission denied/);
  await reject(db.exec('select * from private.preview_invitation_email_receipts'),/permission denied/);
}
await actor(admin);await reject(dsn(a,'10:10','delivered','2.0.0',t(9)),/permission denied/);
await actor(null,'service_role');await reject(q('select public.preview_invitation_email_report($1,$2) result',[p,'development']),/permission denied/);
await reject(q('select public.record_preview_analytics_event($1,$2,$3) result',[JSON.stringify({previewId:p,eventId:crypto.randomUUID(),sessionId:crypto.randomUUID(),eventName:'email_bounced'}),null,'development']),/invalid preview input/);
await db.exec('reset role');
await reject(db.exec("update private.preview_invitation_email_attempts set recipient_email='stolen@example.test'"),/snapshot immutable/);
await reject(db.exec("delete from private.preview_invitation_email_receipts"),/append only/);
eq(Number((await db.query('select count(*) n from preview_conversion_campaigns')).rows[0].n),0,'no enrollment or manual sent_at edits');
eq(Number((await db.query('select count(*) n from preview_locker_viewer_grants')).rows[0].n),1,'no viewer created or renewed');
const envelopes=(await db.query('select envelope from analytics_delivery_outbox')).rows.map(r=>r.envelope);
eq(envelopes.length,8,'only actual email state changes export');
for(const e of envelopes){eq(e.actor_kind,'operational');eq(e.measurement_basis,'server_workflow');eq(e.session_id,null);eq(e.audience_eligible,false);eq(Object.keys(e.properties).sort(),['event_kind','preview_id']);}
assert.ok(!JSON.stringify(envelopes).includes('@'));checks++;
assert.ok(!JSON.stringify((await db.query('select * from audit_logs')).rows).includes('@'));checks++;
// Environment mismatch leaves operational state/audit intact but does not export.
await db.query("update private.preview_analytics_capture_config set environment='production'");
await age(changed);await actor(admin);const off=await prepare();await actor(null,'service_role');await begin(off.id);await settle(off.id);
await db.exec('reset role');eq(Number((await db.query('select count(*) n from analytics_delivery_outbox')).rows[0].n),8);
// Latest-20 presentation is separate from exact full-history counts. The
// bounded mailbox selector rotates through every eligible attempt, including
// delivery reports that may receive later bounce evidence.
const beforeTotal=Number((await db.query('select count(*) n from private.preview_invitation_email_attempts where preview_id=$1 and environment=$2',[p,'development'])).rows[0].n);
await db.query(`insert into private.preview_invitation_email_attempts(id,preview_id,contact_id,environment,created_by,request_id,recipient_email,recipient_name,preview_name,short_alias,message_id,state,created_at)
 select ('00000000-0000-4000-8000-'||lpad((100+n)::text,12,'0'))::uuid,$1,$2,'development',$3,gen_random_uuid(),'athlete@example.test','Synthetic Athlete','Synthetic Public Athlete','synthetic-public',
 '<bltz-preview-'||('00000000-0000-4000-8000-'||lpad((100+n)::text,12,'0'))||'@bltz.me>','smtp_accepted',clock_timestamp()-interval '1 minute' from generate_series(1,45) n`,[p,contact,admin]);
await actor(admin);const boundedReport=await q('select public.preview_invitation_email_report($1,$2) result',[p,'development']);
eq(boundedReport.total_attempts,beforeTotal+45);eq(boundedReport.limited,true);eq(boundedReport.attempts.length,20);
eq(Object.values(boundedReport.counts).reduce((sum,n)=>sum+n,0),boundedReport.total_attempts);
await actor(null,'service_role');const scanned=new Set();
for(let pass=0;pass<3;pass++){const slice=await q('select public.pending_preview_invitation_email_checks($1) result',['development']);eq(slice.length,20);for(const row of slice)scanned.add(row.id);}
eq(scanned.size,47,'three 20-row checks fairly cover all 47 eligible attempts');assert.ok(scanned.has(b.id));checks++;
await db.exec('reset role');eq(Number((await db.query('select count(*) n from analytics_delivery_outbox o join private.preview_invitation_email_receipts r on r.id=o.event_id')).rows[0].n),5,'DSN state exports retain receipt UUID identity');
// A different request racing for the same environment/preview/contact cannot
// bypass the 30-second preparation guard. Embedded PG queues connections;
// hosted parallel-session locking remains a separate staging proof.
await actor(admin);const raced=await Promise.allSettled([prepare(p,contact,crypto.randomUUID(),'production'),prepare(p,contact,crypto.randomUUID(),'production')]);
eq(raced.map(row=>row.status).sort(),['fulfilled','rejected']);
await db.close();
console.log(`PASS: ${checks} invitation ledger assertions in embedded PostgreSQL. Synthetic dependency boundary; no live SMTP/IMAP or hosted concurrency proof.`);
