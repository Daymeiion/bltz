const fs=require('fs');const {execFileSync}=require('child_process');
const fixture=JSON.parse(fs.readFileSync('output/conversion/fixtures.json'));
const migration=fs.readFileSync('supabase/migrations/20260911210051_simplify_gtm_contact_pipeline.sql','utf8');
const sql=`begin;
select set_config('request.jwt.claim.sub','${fixture.users.admin.id}',true);
alter table public.gtm_contacts drop constraint gtm_contacts_pipeline_stage_check;
insert into public.gtm_contacts(display_name,pipeline_stage,source,next_action_at,created_by,next_action,source_record_id) select 'Pipeline proof '||stage,stage,'pipeline-proof',now()-interval '1 day',auth.uid(),'Follow up',stage from unnest(array['identified','connected','engaged','discovery','demo_candidate','pilot_candidate','active_pilot','converted','nurture','not_now']) stage;
alter table public.gtm_contacts add constraint gtm_contacts_pipeline_stage_check check (pipeline_stage in ('identified','connected','engaged','discovery','demo_candidate','pilot_candidate','active_pilot','converted','nurture','not_now')) not valid;
insert into public.gtm_contacts(display_name,created_by,contact_type,relationship_strength,bltz_relevance,buying_authority,network_leverage,timing_score,classification_status,priority_score_explanation,manual_field_locks)
select 'Score proof '||reviewed,auth.uid(),'enterprise',2,3,3,3,2,'auto_classified','{"inferredFields":["relationshipStrength"]}'::jsonb,case when reviewed then array['relationship_strength'] else '{}'::text[] end from unnest(array[true,false]) reviewed;
${migration}
do $$ declare metrics jsonb; begin
if (select count(*) from public.gtm_contacts where source='pipeline-proof' and pipeline_stage='in_conversation') <> 5 then raise exception 'conversation mapping'; end if;
if (select count(*) from public.gtm_contacts where source='pipeline-proof' and pipeline_stage='follow_up_later') <> 2 then raise exception 'follow-up mapping'; end if;
if not exists(select 1 from public.audit_logs a join public.gtm_contacts c on a.entity_id=c.id::text where c.source='pipeline-proof' and a.previous_values->>'pipeline_stage'='converted' and a.new_values->>'pipeline_stage'='closed') then raise exception 'audit missing'; end if;
if exists(select 1 from public.gtm_contacts where display_name='Score proof false' and (relationship_strength is not null or priority_score is not null)) then raise exception 'inferred score not cleared'; end if;
if not exists(select 1 from public.gtm_contacts where display_name='Score proof true' and relationship_strength=2 and priority_score is not null) then raise exception 'reviewed score lost'; end if;
metrics:=public.get_gtm_metrics_v1();
if (metrics->'stageCounts'->>'in_conversation')::int <> (select count(*) from public.gtm_contacts where not archived and pipeline_stage='in_conversation') then raise exception 'metric mismatch'; end if;
if metrics ? 'conversions' or metrics ? 'demoCandidates' then raise exception 'old outcomes retained'; end if;
if (metrics->>'contactsNeedingFollowUp')::int <> (select count(*) from public.gtm_contacts where not archived and pipeline_stage<>'closed' and next_action_at<=now()) then raise exception 'closed follow-up mismatch'; end if;
begin update public.gtm_contacts set pipeline_stage='converted' where source='pipeline-proof'; raise exception 'obsolete stage allowed'; exception when check_violation then null; end;
end $$;
set local role authenticated;
select public.get_gtm_metrics_v1()->'stageCounts' as admin_stage_counts;
select set_config('request.jwt.claim.sub','${fixture.users.outsider.id}',true);
do $$ begin begin perform public.get_gtm_metrics_v1(); raise exception 'non-admin allowed'; exception when insufficient_privilege then null; end; end $$;
rollback;`;
try {const out=execFileSync('docker',['--context','desktop-linux','exec','-i','supabase_db_bltz-conversion-20260911','psql','-U','postgres','-v','ON_ERROR_STOP=1'],{input:sql,encoding:'utf8',stdio:['pipe','pipe','pipe']});console.log(out);console.log('PASS: mapping, preserved audit, metrics, closed follow-up exclusion, obsolete-stage rejection, Admin and non-Admin authorization. All proof rows rolled back.');}catch(e){console.error(e.stderr?.toString()||e.message);process.exit(1);}
