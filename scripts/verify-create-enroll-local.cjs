const fs=require('fs'),{execFileSync}=require('child_process');
const f=JSON.parse(fs.readFileSync('output/conversion/fixtures.json'));
const body={slug:'atomic-enrollment-proof',full_name:'Atomic Enrollment Proof',bio:'',schools:[],pro_teams:[],awards:[],career_stats:[],videos:[],photos:[]};
for(const k of ['position','level','school','hometown','jersey','height_in','weight_lbs','games_played','headshot_url','hero_video_url','athlete_quote','athlete_quote_author'])body[k]=null;
const sql=`begin;
select set_config('request.jwt.claim.sub','${f.users.admin.id}',true);
set local role authenticated;
do $$ declare contact uuid:=gen_random_uuid(); preview uuid:=gen_random_uuid(); failed uuid:=gen_random_uuid(); content jsonb:='${JSON.stringify(body)}'; enrollment jsonb; a jsonb; b jsonb; begin
insert into public.gtm_contacts(id,display_name,created_by) values(contact,'Atomic enrollment proof',auth.uid());
enrollment:=jsonb_build_object('contact_id',contact,'campaign','proof','source','manual','channel','email','relationship','warm','is_test',true);
a:=public.preview_conversion_create(preview,content,enrollment);
b:=public.preview_conversion_create(preview,content,enrollment);
if a<>b or (select count(*) from public.preview_conversion_campaigns where preview_id=preview)<>1 then raise exception 'retry mismatch'; end if;
begin perform public.preview_conversion_create(failed,content||'{"slug":"atomic-enrollment-conflict"}',enrollment); raise exception 'duplicate contact allowed'; exception when unique_violation then null; end;
if exists(select 1 from public.preview_lockers where id=failed) then raise exception 'partial preview retained'; end if;

end $$;
reset role;
do $$ begin if not exists(select 1 from public.audit_logs where entity_id in(select id::text from public.preview_lockers where slug='atomic-enrollment-proof') and action='preview.conversion.enrolled') then raise exception 'audit missing';end if;end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','${f.users.outsider.id}',true);
do $$ begin begin perform public.preview_conversion_create(gen_random_uuid(),'{}','{}');raise exception 'unauthorized allowed';exception when insufficient_privilege then null;end;end $$;
rollback;`;
try{console.log(execFileSync('docker',['--context','desktop-linux','exec','-i','supabase_db_bltz-conversion-20260911','psql','-U','postgres','-v','ON_ERROR_STOP=1'],{input:sql,encoding:'utf8',stdio:['pipe','pipe','pipe']}));console.log('PASS: atomic create/enroll, idempotent retry, contact conflict rollback, audit and non-admin rejection.');}catch(e){console.error(e.stderr?.toString()||e.message);process.exit(1)}
