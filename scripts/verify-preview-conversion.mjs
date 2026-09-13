// Real embedded PostgreSQL, synthetic dependency boundary. Never connects to a hosted DB.
// Pass an installed @electric-sql/pglite module file URL as the sole argument.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const modulePath=process.argv[2];
if(!modulePath)throw new Error('Supply a local PGlite module path');
const {PGlite}=await import(pathToFileURL(modulePath).href);
const db=new PGlite(); let checks=0;
const uid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const admin=uid(1),athlete=uid(2),other=uid(3),referred=uid(4),preview=uid(10),contact=uid(20);
await db.exec(`
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create schema private;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,deleted_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function public.is_internal_admin() returns boolean language sql stable as $$ select auth.uid()='${admin}'::uuid $$;
grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
create table public.preview_lockers(id uuid primary key,full_name text);
alter table public.preview_lockers enable row level security;
grant select on public.preview_lockers to authenticated;
create table public.gtm_contacts(id uuid primary key default gen_random_uuid(),display_name text,email text,contact_type text,source text,source_record_id text,created_by uuid references auth.users(id),do_not_automate boolean, next_action text,archived boolean default false,player_master_gsis_id text);
create table public.gtm_player_preview_lockers(preview_locker_id uuid references public.preview_lockers(id),gsis_id text,completed_revision int);
create table public.audit_logs(id bigserial primary key,actor_user_id uuid,action text,entity_type text,entity_id text,actor_role_scope text,risk_level text,previous_values jsonb,new_values jsonb,request_metadata jsonb);
`);
// Reuse the actual released assignment/revocation helper and its RLS policy.
await db.exec(fs.readFileSync('supabase/migrations/20260901184112_private_preview_assigned_viewer.sql','utf8'));
await db.exec(fs.readFileSync('supabase/migrations/20260911185101_preview_conversion_sprint.sql','utf8'));
for(const [id,email] of [[admin,'admin@example.test'],[athlete,'athlete@example.test'],[other,'other@example.test'],[referred,'referral@example.test']])await db.query('insert into auth.users values($1,$2,now(),null)',[id,email]);
await db.query('insert into preview_lockers values($1,$2)',[preview,'Synthetic Athlete']);
await db.query('insert into gtm_contacts(id,display_name,email) values($1,$2,$3)',[contact,'Synthetic Athlete','athlete@example.test']);
async function actor(id,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id??'']);await db.exec(`set role ${role}`);}
async function rpc(action,data={},p=preview,request=crypto.randomUUID(),session=uid(99)){
  return (await db.query('select public.preview_conversion($1,$2,$3,$4,$5) result',[p,action,request,session,JSON.stringify(data)])).rows[0].result;
}
async function equal(sql,expected,label){await db.exec('reset role');assert.equal((await db.query(sql)).rows[0].n,expected,label);checks++;}
async function rejects(task,pattern){await assert.rejects(task,pattern);checks++;}
await actor(admin);
await rpc('enroll',{contact_id:contact,campaign:'sprint90',source:'alumni',channel:'email',relationship:'warm'});
await rejects(rpc('sent'),/assign viewer first/);
await db.query('select public.assign_preview_locker_viewer($1,$2)',[preview,'athlete@example.test']);
await rpc('sent');await rpc('sent');
await equal("select count(*)::int n from preview_conversion_events where kind='sent'",1,'sent idempotency');
await actor(null,'anon');await rejects(rpc('view'),/permission denied/);
await actor(other);await rejects(rpc('view'),/forbidden/);
await equal('select count(*)::int n from preview_conversion_events',1,'unauthorized writes absent');
await actor(admin);assert.equal((await rpc('view')).excluded,true);checks++;
await actor(athlete);
assert.equal((await db.query('select * from preview_conversion_responses')).rows.length,0);checks++;
await rejects(db.exec("insert into public.preview_conversion_events(preview_id,session_id,request_id,kind) values ('"+preview+"','"+uid(91)+"','"+uid(92)+"','view')"),/permission denied/);
await rpc('view');await rpc('view');await rpc('photos_view');await rpc('film_view');await rpc('claim_click');
await equal("select count(*)::int n from preview_conversion_events where kind='view'",1,'visible session deduplication');
await actor(athlete);await rejects(rpc('claim_submit',{email:'athlete@example.test',consent:false}),/consent/);
await rejects(rpc('view',{utm:{email:'private@example.test'}}),/attribution/);
await rejects(rpc('booking_confirmed'),/forbidden/);
await rpc('claim_submit',{email:'athlete@example.test',consent:true,dashboard_interest:true});
await rpc('claim_submit',{email:'athlete@example.test',consent:true,dashboard_interest:false});
await equal('select count(*)::int n from preview_conversion_responses',1,'one response');
await equal("select count(*)::int n from preview_conversion_events where kind in ('accepted','claim_submit','dashboard_interest')",3,'atomic acceptance and intent');
await equal('select count(*)::int n from preview_conversion_responses where dashboard_interest',1,'retry retains dashboard intent');
await actor(athlete);await rejects(rpc('declined',{reason:'changed'}),/already recorded/);
await rpc('booking_click');await equal("select count(*)::int n from preview_conversion_events where kind='booking_confirmed'",0,'click is not booking');
await actor(admin);await rpc('booking_confirmed');await rpc('walkthrough_completed');
await actor(athlete);const token=(await rpc('referral_created')).token;await rpc('referral_copied');
await rpc('referral_intake',{token,email:'athlete@example.test',full_name:'Self Athlete',consent:true},null);
await equal('select count(*)::int n from preview_conversion_referrals',0,'self referral exclusion');
await actor(referred);await rejects(rpc('referral_intake',{token,email:'spoof@example.test',full_name:'Teammate',consent:true},null),/confirmed account/);
await rpc('referral_intake',{token,email:'referral@example.test',full_name:'Synthetic Teammate',consent:true},null);
await rpc('referral_intake',{token,email:'referral@example.test',full_name:'Renamed Retry',consent:true},null);
await equal('select count(*)::int n from preview_conversion_referrals',1,'duplicate intake');
await equal('select count(*)::int n from gtm_contacts',2,'one new contact');
await db.exec('reset role');const intake=(await db.query('select * from preview_conversion_referrals')).rows[0];
assert.equal(intake.full_name,'Synthetic Teammate');checks++;
await actor(admin);await db.exec('reset role');
await db.query('insert into preview_lockers values($1,$2)',[intake.reserved_preview_id,'Prepared Teammate']);
await equal('select count(*)::int n from preview_conversion_referrals where preview_id=reserved_preview_id',1,'reserved ID consumed');
await equal("select count(*)::int n from preview_conversion_campaigns where channel='referral'",1,'prepared contact attribution');
await actor(admin);await db.query('select public.assign_preview_locker_viewer($1,$2)',[intake.reserved_preview_id,'referral@example.test']);
await actor(referred);await rpc('claim_submit',{email:'referral@example.test',consent:true},intake.reserved_preview_id);
await equal("select count(*)::int n from preview_conversion_events where kind='referred_claimed'",1,'referral claim chain');
await actor(admin);await db.query('select public.revoke_preview_locker_viewer($1)',[preview]);
await actor(athlete);await rejects(rpc('view'),/forbidden/);
assert.equal((await db.query('select * from preview_lockers where id=$1',[preview])).rows.length,0);checks++;
await actor(other);await rejects(rpc('referral_intake',{token,email:'other@example.test',full_name:'Other Athlete',consent:true},null),/unavailable/);
await db.exec('reset role');await rejects(db.exec("update preview_conversion_events set kind='declined'"),/append only/);
await equal('select count(*)::int n from gtm_player_preview_lockers',0,'canonical prospect links untouched');
await actor(admin);assert.equal((await db.query('select * from preview_conversion_responses')).rows.length,2);checks++;
await db.close();console.log(`PASS: ${checks} embedded PostgreSQL assertions. Dependency/auth boundary is synthetic; this does not prove hosted Supabase or concurrent connections.`);
