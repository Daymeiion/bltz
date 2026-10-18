begin;

alter table public.award_image_assets add column original_filename text
 check(original_filename is null or (length(btrim(original_filename)) between 1 and 255 and original_filename !~ '[[:cntrl:]/\\]'));
grant insert(original_filename),update(original_filename) on public.award_image_assets to authenticated;

create or replace function private.audit_award_image_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.is_internal_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 if tg_op='UPDATE' then
  if old.original_filename is not null and new.original_filename is distinct from old.original_filename then raise exception 'original_filename_immutable' using errcode='22023'; end if;
  new.id:=old.id; new.created_by:=old.created_by; new.created_at:=old.created_at; new.revision:=old.revision+1;
 else new.revision:=1; end if;
 new.updated_at:=clock_timestamp();
 insert into public.audit_logs(action,entity_type,entity_id,actor_user_id,previous_values,new_values)
 values('award_image.'||lower(tg_op),'award_image',new.id::text,auth.uid(),case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
 return new;
end; $$;
revoke all on function private.audit_award_image_change() from public,anon,authenticated,service_role;

-- One transaction, with caller permissions and the existing audit triggers.
create function public.approve_award_image_matches(p_matches jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare item jsonb; candidate record; asset record; award record; saved integer:=0; unchanged integer:=0;
begin
 if auth.uid() is null or not public.is_internal_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 if jsonb_typeof(p_matches) is distinct from 'array' then raise exception 'invalid_matches' using errcode='22023'; end if;
 if jsonb_array_length(p_matches) not between 1 and 100 or octet_length(p_matches::text)>65536 then raise exception 'invalid_matches' using errcode='22023'; end if;
 for item in select value from jsonb_array_elements(p_matches) loop
  if jsonb_typeof(item) is distinct from 'object' then raise exception 'invalid_matches' using errcode='22023'; end if;
  if not item ?& array['award_id','image_asset_id','award_updated_at','image_revision']
   or exists(select 1 from jsonb_object_keys(item) k where k not in ('award_id','image_asset_id','award_updated_at','image_revision'))
   or jsonb_typeof(item->'award_id') is distinct from 'string'
   or jsonb_typeof(item->'image_asset_id') is distinct from 'string'
   or jsonb_typeof(item->'award_updated_at') is distinct from 'string'
   or jsonb_typeof(item->'image_revision') is distinct from 'number'
   or item->>'image_revision' !~ '^[1-9][0-9]{0,9}$'
  then raise exception 'invalid_matches' using errcode='22023'; end if;
 end loop;
 if (select count(*)<>count(distinct x.award_id) from jsonb_to_recordset(p_matches) x(award_id uuid)) then raise exception 'duplicate_award_match' using errcode='22023'; end if;

 -- All batches lock images first, then awards, in UUID order.
 perform a.id from public.award_image_assets a where a.id in (select x.image_asset_id from jsonb_to_recordset(p_matches) x(image_asset_id uuid)) order by a.id for share;
 perform a.id from public.award_catalog a where a.id in (select x.award_id from jsonb_to_recordset(p_matches) x(award_id uuid)) order by a.id for update;
 for candidate in select * from jsonb_to_recordset(p_matches) x(award_id uuid,image_asset_id uuid,award_updated_at timestamptz,image_revision integer) order by award_id loop
  select a.active,a.revision into asset from public.award_image_assets a where a.id=candidate.image_asset_id;
  if not found then raise exception 'invalid_award_image_reference' using errcode='22023'; end if;
  if not asset.active or asset.revision<>candidate.image_revision then raise exception 'award_image_changed' using errcode='PT409'; end if;
  select a.active,a.image_asset_id,a.updated_at into award from public.award_catalog a where a.id=candidate.award_id;
  if not found then raise exception 'invalid_award_reference' using errcode='22023'; end if;
  if not award.active then raise exception 'award_mapping_changed' using errcode='PT409'; end if;
  if award.image_asset_id=candidate.image_asset_id then unchanged:=unchanged+1; continue; end if;
  if award.updated_at<>candidate.award_updated_at then raise exception 'award_mapping_changed' using errcode='PT409'; end if;
  update public.award_catalog set image_asset_id=candidate.image_asset_id where id=candidate.award_id;
  saved:=saved+1;
 end loop;
 return jsonb_build_object('saved',saved,'unchanged',unchanged);
end; $$;
revoke all on function public.approve_award_image_matches(jsonb) from public,anon,authenticated,service_role;
grant execute on function public.approve_award_image_matches(jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
