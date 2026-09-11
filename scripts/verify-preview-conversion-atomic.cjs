// Rollback-only proof against the isolated full release schema, never a hosted database.
const fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const c=JSON.parse(fs.readFileSync('output/conversion/local-config.json'));
const f=JSON.parse(fs.readFileSync('output/conversion/fixtures.json'));
if(c.API_URL!=='http://127.0.0.1:62321')throw Error('Local conversion fixture required');
const admin=f.users.admin.id,viewer=f.users.athlete.id;
const preview=crypto.randomUUID(),contact=crypto.randomUUID();
const ambiguousActor=crypto.randomUUID(),match1=crypto.randomUUID(),match2=crypto.randomUUID();
const sql=`begin;
select set_config('request.jwt.claim.sub','${admin}',true);
insert into public.gtm_contacts(id,display_name,email,created_by) values('${contact}','Atomic Fixture','atomic@example.test','${admin}');
insert into public.preview_lockers(id,slug,full_name) values('${preview}','atomic-${preview}','Atomic Fixture');
select public.assign_preview_locker_viewer('${preview}','${f.users.athlete.email}');
select set_config('request.jwt.claim.sub','${viewer}',true);
do $$ begin
  assert public.preview_conversion('${preview}','state',gen_random_uuid(),gen_random_uuid(),'{}')->>'available'='false','unenrolled hidden';
end $$;
select set_config('request.jwt.claim.sub','${admin}',true);
select public.preview_conversion('${preview}','enroll',gen_random_uuid(),gen_random_uuid(),jsonb_build_object('contact_id','${contact}','campaign','atomic','source','synthetic','channel','email','relationship','warm'));
create function private.conversion_test_failure() returns trigger language plpgsql as $$ begin
  if new.preview_id='${preview}' and new.kind='accepted' then raise exception 'synthetic event failure' using errcode='23514'; end if;
  return new;
end $$;
create trigger conversion_test_failure before insert on public.preview_conversion_events for each row execute function private.conversion_test_failure();
select set_config('request.jwt.claim.sub','${viewer}',true);
do $$ begin
  begin
    perform public.preview_conversion('${preview}','claim_submit',gen_random_uuid(),gen_random_uuid(),' {"email":"atomic@example.test","consent":true,"dashboard_interest":true}');
    raise exception 'expected rollback';
  exception when check_violation then null; end;
  assert not exists(select 1 from public.preview_conversion_responses where preview_id='${preview}'),'response rollback';
  assert not exists(select 1 from public.preview_conversion_events where preview_id='${preview}'),'event rollback';
end $$;
drop trigger conversion_test_failure on public.preview_conversion_events;
drop function private.conversion_test_failure();
select public.preview_conversion('${preview}','declined',gen_random_uuid(),gen_random_uuid(),'{"reason":""}');
do $$ begin
  assert exists(select 1 from public.preview_conversion_responses where preview_id='${preview}' and state='declined' and not updates_permission),'optional decline persisted';
  assert not exists(select 1 from public.preview_conversion_events where preview_id='${preview}' and kind='accepted'),'decline is not acceptance';
end $$;
select set_config('request.jwt.claim.sub','${admin}',true);
update public.preview_conversion_campaigns set is_test=true where preview_id='${preview}';
select set_config('request.jwt.claim.sub','${viewer}',true);
do $$ begin
  assert public.preview_conversion('${preview}','view',gen_random_uuid(),gen_random_uuid(),'{}')->>'excluded'='true','test exclusion';
  assert not exists(select 1 from public.preview_conversion_events where preview_id='${preview}' and kind='view'),'test no event';
end $$;
-- Ambiguous exact-email matches remain unresolved; reviewed GTM records are untouched.
select set_config('request.jwt.claim.sub','${admin}',true);
insert into auth.users(id,email,email_confirmed_at) values('${ambiguousActor}','ambiguous@example.test',now());
insert into public.gtm_contacts(id,display_name,email,created_by,source,source_record_id) values
 ('${match1}','Reviewed one','ambiguous@example.test','${admin}','reviewed_import','atomic-one'),
 ('${match2}','Reviewed two','ambiguous@example.test','${admin}','reviewed_import','atomic-two');
select set_config('request.jwt.claim.sub','${ambiguousActor}',true);
do $$ declare token uuid; begin
  select referral_token into token from public.preview_conversion_campaigns where preview_id='${f.previews.athlete.id}';
  perform public.preview_conversion(null,'referral_intake',gen_random_uuid(),gen_random_uuid(),jsonb_build_object('token',token,'email','ambiguous@example.test','full_name','Ambiguous Intake','consent',true));
  assert exists(select 1 from public.preview_conversion_referrals where actor_id='${ambiguousActor}' and contact_id is null),'ambiguous match remains unresolved';
  assert (select count(*) from public.gtm_contacts where email='ambiguous@example.test')=2,'no merge or duplicate contact';
  assert (select display_name from public.gtm_contacts where id='${match1}')='Reviewed one','reviewed contact preserved';
end $$;
select set_config('request.jwt.claim.sub','${admin}',true);
do $$ declare intake uuid; begin
  select id into intake from public.preview_conversion_referrals where actor_id='${ambiguousActor}';
  perform public.preview_conversion('${f.previews.athlete.id}','resolve_referral',gen_random_uuid(),gen_random_uuid(),jsonb_build_object('referral_id',intake,'contact_id','${match1}'));
  assert exists(select 1 from public.preview_conversion_referrals where id=intake and contact_id='${match1}'),'explicit reviewed resolution';
  assert (select source_record_id from public.gtm_contacts where id='${match1}')='atomic-one','reviewed source retained';
end $$;
update private.preview_conversion_limits set requests=120,window_at=date_trunc('hour',clock_timestamp()) where actor_id='${viewer}';
select set_config('request.jwt.claim.sub','${viewer}',true);
do $$ begin
  begin
    perform public.preview_conversion('${preview}','state',gen_random_uuid(),gen_random_uuid(),'{}');
    raise exception 'expected request admission denial';
  exception when sqlstate '54000' then null; end;
end $$;
rollback;`;
try{execFileSync('docker',['--context','desktop-linux','exec','-i','supabase_db_bltz-conversion-20260911','psql','-U','postgres','-v','ON_ERROR_STOP=1'],{input:sql,stdio:['pipe','pipe','pipe']});console.log('PASS: full-schema rollback on event failure, unenrolled state, optional decline, acceptance separation, test exclusion, ambiguous matching and reviewed-contact preservation. All fixtures rolled back.');}
catch(e){console.error(e.stderr?.toString()||e.message);process.exit(1);}
