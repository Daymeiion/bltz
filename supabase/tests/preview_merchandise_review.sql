-- Run only in the isolated preview-merchandise fixture harness, never production.
do $$ begin if current_setting('bltz.test_queue_isolated',true) is distinct from 'true' then raise exception 'isolated fixture required'; end if; end $$;
insert into public.preview_lockers(id,revision,merchandise) values('00000000-0000-4000-8000-000000000001',1,'[]');
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
select public.save_preview_merchandise_search('00000000-0000-4000-8000-000000000001',1,repeat('a',64),'2020-01-01',
  '{"items":[{"productUrl":"https://shop.example.com/products/card"}],"status":"complete","candidates":1,"rejected":0,"errors":[]}');
select public.dismiss_preview_merchandise_result('00000000-0000-4000-8000-000000000001',1,1,'https://shop.example.com/products/card');
do $$ begin
 if not exists(select 1 from public.preview_merchandise_searches where version=2 and cardinality(dismissed_urls)=1)
   or (select merchandise from public.preview_lockers limit 1)<>'[]'::jsonb then raise exception 'review/Locker separation failed'; end if;
 begin perform public.dismiss_preview_merchandise_result('00000000-0000-4000-8000-000000000001',1,1,'https://shop.example.com/products/card'); raise exception 'stale version allowed'; exception when sqlstate 'PT409' then null; end;
 begin perform public.dismiss_preview_merchandise_result('00000000-0000-4000-8000-000000000001',1,2,'https://shop.example.com/products/other'); raise exception 'unknown URL allowed'; exception when sqlstate '22023' then null; end;
 begin perform public.save_preview_merchandise_search('00000000-0000-4000-8000-000000000001',2,repeat('a',64),'2021-01-01','{"items":[],"status":"complete"}'); raise exception 'stale preview allowed'; exception when sqlstate 'PT409' then null; end;
 begin perform public.save_preview_merchandise_search('00000000-0000-4000-8000-000000000001',1,repeat('a',64),'2019-01-01','{"items":[],"status":"complete"}'); raise exception 'old search allowed'; exception when sqlstate 'PT409' then null; end;
 begin perform public.save_preview_merchandise_search('00000000-0000-4000-8000-000000000001',1,repeat('a',64),'2021-01-01','{"items":[],"status":"partial"}'); raise exception 'empty failure erased queue'; exception when sqlstate '22023' then null; end;
end $$;
select public.save_preview_merchandise_search('00000000-0000-4000-8000-000000000001',1,repeat('a',64),'2021-01-01',
  '{"items":[{"productUrl":"https://shop.example.com/products/card"}],"status":"complete"}');
do $$ begin if not exists(select 1 from public.preview_merchandise_searches where version=3 and cardinality(dismissed_urls)=1) then raise exception 'dismissal lost on refresh'; end if; end $$;
select public.save_preview_merchandise_search('00000000-0000-4000-8000-000000000001',1,repeat('b',64),'2022-01-01',
  '{"items":[{"productUrl":"https://shop.example.com/products/card"}],"status":"complete"}');
do $$ begin if not exists(select 1 from public.preview_merchandise_searches where version=4 and cardinality(dismissed_urls)=0) then raise exception 'identity reset failed'; end if; end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
do $$ begin
 if exists(select 1 from public.preview_merchandise_searches) then raise exception 'non-Admin read allowed'; end if;
 begin perform public.dismiss_preview_merchandise_result('00000000-0000-4000-8000-000000000001',1,4,'https://shop.example.com/products/card'); raise exception 'non-Admin dismissal allowed'; exception when insufficient_privilege then null; end;
 begin perform public.save_preview_merchandise_search('00000000-0000-4000-8000-000000000001',1,repeat('a',64),'2023-01-01','{"items":[],"status":"complete"}'); raise exception 'non-Admin save allowed'; exception when insufficient_privilege then null; end;
 begin insert into public.preview_merchandise_searches(preview_id,source_revision,identity_key,result,searched_at) values('00000000-0000-4000-8000-000000000001',1,repeat('a',64),'{"items":[]}',now()); raise exception 'non-Admin insert allowed'; exception when insufficient_privilege then null; end;
 update public.preview_merchandise_searches set result='{"items":[]}'; if found then raise exception 'non-Admin update allowed'; end if;
end $$;
set role anon;
do $$ begin
 begin perform 1 from public.preview_merchandise_searches; raise exception 'anonymous read allowed'; exception when insufficient_privilege then null; end;
 begin perform public.dismiss_preview_merchandise_result('00000000-0000-4000-8000-000000000001',1,4,'https://shop.example.com/products/card'); raise exception 'anonymous RPC allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
 if (select count(*) from public.audit_logs)<>4 then raise exception 'audit count incorrect'; end if;
 if not(select relrowsecurity from pg_class where oid='public.preview_merchandise_searches'::regclass) then raise exception 'RLS missing'; end if;
 if has_table_privilege('authenticated','public.preview_merchandise_searches','DELETE') then raise exception 'delete granted'; end if;
end $$;
