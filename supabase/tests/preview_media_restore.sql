-- Isolated fixtures only; the harness also executes the existing bulk suite.
do $$ begin if current_setting('bltz.test_bulk_isolated',true) is distinct from 'true' then raise exception 'isolated fixture required';end if;end $$;
reset role;
insert into public.preview_lockers(id,revision,merchandise,article_edits) values('00000000-0000-4000-8000-000000000007',1,'[{"id":"keep-product"}]','[{"id":"keep-article"}]');
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select public.save_preview_enrichment('00000000-0000-4000-8000-000000000007',1,repeat('a',64),'2020-01-01','[]',jsonb_build_array(pg_temp.bulk_article(1),pg_temp.bulk_article(2)),'{}');
select public.save_preview_merchandise_search('00000000-0000-4000-8000-000000000007',1,repeat('a',64),'2020-01-01','{"items":[{"title":"Card","productUrl":"https://amazon.com/dp/B01N26VW34"},{"title":"Jersey","productUrl":"https://shop.example.com/jersey"}],"status":"complete"}');
do $$ declare pid uuid:='00000000-0000-4000-8000-000000000007'; result jsonb; saved jsonb; actual jsonb; n integer; v integer; batch jsonb; audits integer;
begin
 perform public.dismiss_preview_merchandise_result(pid,1,1,'https://amazon.com/dp/B01N26VW34');
 result:=public.save_preview_merchandise_search(pid,1,repeat('a',64),'2020-01-02','{"items":[{"productUrl":"https://www.amazon.com/gp/product/B01N26VW34?ref=alias"}],"status":"complete"}');
 if jsonb_array_length(result->'result'->'items')<>1 or jsonb_array_length(result->'dismissed_items')<>1 or result->'dismissed_items'->0->>'title'<>'Card' then raise exception 'dismissed metadata lost on search';end if;
 result:=public.save_preview_merchandise_search(pid,1,repeat('a',64),'2020-01-03','{"items":[],"status":"complete"}');
 if jsonb_array_length(result->'dismissed_items')<>1 then raise exception 'dismissed archive lost on later search';end if;
 saved:=result;
 begin perform public.restore_preview_merchandise_result(pid,1,4,repeat('a',64),'https://other.example.com/card');raise exception 'foreign restore accepted';exception when sqlstate '22023' then null;end;
 begin perform public.restore_preview_merchandise_result(pid,2,4,repeat('a',64),'https://amazon.com/dp/B01N26VW34');raise exception 'stale revision accepted';exception when sqlstate 'PT409' then null;end;
 begin perform public.restore_preview_merchandise_result(pid,1,3,repeat('a',64),'https://amazon.com/dp/B01N26VW34');raise exception 'stale version accepted';exception when sqlstate 'PT409' then null;end;
 begin perform public.restore_preview_merchandise_result(pid,1,4,repeat('b',64),'https://amazon.com/dp/B01N26VW34');raise exception 'wrong identity accepted';exception when sqlstate 'PT409' then null;end;
 select to_jsonb(q) into actual from public.preview_merchandise_searches q where preview_id=pid;
 if saved<>actual then raise exception 'failed restore mutated merchandise';end if;
 select count(*) into audits from public.audit_logs where action='preview.merchandise_review';
 result:=public.restore_preview_merchandise_result(pid,1,4,repeat('a',64),'https://amazon.com/dp/B01N26VW34');
 if result->>'version'<>'5' or jsonb_array_length(result->'result'->'items')<>2 or jsonb_array_length(result->'dismissed_items')<>0 or jsonb_array_length(result->'dismissed_urls')<>0
  or (select count(*) from public.audit_logs where action='preview.merchandise_review')<>audits+1 then raise exception 'merch restore state/audit incorrect';end if;
 begin perform public.restore_preview_merchandise_result(pid,1,5,repeat('a',64),'https://amazon.com/dp/B01N26VW34');raise exception 'repeat restore duplicated';exception when sqlstate '22023' then null;end;
 result:=public.save_preview_merchandise_search(pid,1,repeat('a',64),'2020-01-04','{"items":[{"productUrl":"https://www.amazon.com/gp/product/B01N26VW34?ref=alias"}],"status":"complete"}');
 if jsonb_array_length(result->'result'->'items')<>2 then raise exception 'restored alias duplicated';end if;
 -- A dismissal that has not yet been compacted by another search can be restored too.
 perform public.dismiss_preview_merchandise_result(pid,1,6,'https://shop.example.com/jersey');
 result:=public.restore_preview_merchandise_result(pid,1,7,repeat('a',64),'https://shop.example.com/jersey');
 if jsonb_array_length(result->'result'->'items')<>2 then raise exception 'immediate merchandise restore failed';end if;

 perform public.dismiss_preview_news_article(pid,1,1,'https://press.example.com/story/1');
 perform public.save_preview_enrichment(pid,1,repeat('a',64),'2020-01-02','[]',jsonb_build_array(pg_temp.bulk_article(1)),'{}');
 begin perform public.restore_preview_news_article(pid,2,3,repeat('a',64),'https://press.example.com/story/1');raise exception 'news stale revision accepted';exception when sqlstate 'PT409' then null;end;
 begin perform public.restore_preview_news_article(pid,1,2,repeat('a',64),'https://press.example.com/story/1');raise exception 'news stale version accepted';exception when sqlstate 'PT409' then null;end;
 begin perform public.restore_preview_news_article(pid,1,3,repeat('b',64),'https://press.example.com/story/1');raise exception 'news wrong identity accepted';exception when sqlstate 'PT409' then null;end;
 begin perform public.restore_preview_news_article(pid,1,3,repeat('a',64),'https://other.example.com/story');raise exception 'foreign news accepted';exception when sqlstate '22023' then null;end;
 select count(*) into audits from public.audit_logs where action='preview.news_review';
 result:=public.restore_preview_news_article(pid,1,3,repeat('a',64),'https://press.example.com/story/1');
 if result->>'version'<>'4' or (select count(*) from public.player_articles where preview_id=pid and status='review')<>2
  or (select count(*) from public.audit_logs where action='preview.news_review')<>audits+1 then raise exception 'news restore state/audit incorrect';end if;
 begin perform public.restore_preview_news_article(pid,1,4,repeat('a',64),'https://press.example.com/story/1');raise exception 'news repeat restore accepted';exception when sqlstate '22023' then null;end;
 perform public.save_preview_enrichment(pid,1,repeat('a',64),'2020-01-03','[]',jsonb_build_array(pg_temp.bulk_article(1)||jsonb_build_object('article_url','https://www.press.example.com/story/1?utm_source=again')),'{}');
 if (select count(*) from public.player_articles where preview_id=pid and status='review')<>2 then raise exception 'restored news alias duplicated';end if;
 begin update public.player_articles set status='accepted' where preview_id=pid and status='review';raise exception 'restore policy permitted publication';exception when sqlstate '42501' then null;end;
 if (select merchandise from public.preview_lockers where id=pid)<>'[{"id":"keep-product"}]'::jsonb or (select article_edits from public.preview_lockers where id=pid)<>'[{"id":"keep-article"}]'::jsonb then raise exception 'restore changed Locker';end if;
 -- Fill pending queues, preserving an archived item, then reject overflow atomically.
 perform public.dismiss_preview_merchandise_result(pid,1,8,'https://amazon.com/dp/B01N26VW34');
 perform public.dismiss_preview_news_article(pid,1,5,'https://press.example.com/story/1');
 for n in 0..16 loop
  batch:=(select jsonb_build_object('status','complete','items',jsonb_agg(jsonb_build_object('productUrl','https://shop.example.com/fill/'||(n*12+i)))) from generate_series(1,case when n=16 then 7 else 12 end)i);
  result:=public.save_preview_merchandise_search(pid,1,repeat('a',64),'2021-01-01'::timestamptz+n*interval '1 day',batch);
  batch:=(select jsonb_agg(pg_temp.bulk_article(3000+n*12+i)) from generate_series(1,case when n=16 then 7 else 12 end)i);
  perform public.save_preview_enrichment(pid,1,repeat('a',64),'2021-01-01'::timestamptz+n*interval '1 day','[]',batch,'{}');
 end loop;
 select to_jsonb(q) into saved from public.preview_merchandise_searches q where preview_id=pid;
 begin perform public.restore_preview_merchandise_result(pid,1,(saved->>'version')::int,repeat('a',64),'https://amazon.com/dp/B01N26VW34');raise exception 'merch capacity ignored';exception when sqlstate 'PT422' then null;end;
 select to_jsonb(q) into actual from public.preview_merchandise_searches q where preview_id=pid;
 if actual<>saved then raise exception 'capacity failure changed merchandise';end if;
 select news_review_version into v from public.preview_enrichments where preview_id=pid;
 begin perform public.restore_preview_news_article(pid,1,v,repeat('a',64),'https://press.example.com/story/1');raise exception 'news capacity ignored';exception when sqlstate 'PT422' then null;end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
do $$ begin
 begin perform public.restore_preview_news_article('00000000-0000-4000-8000-000000000007',1,1,repeat('a',64),'https://press.example.com/story/1');raise exception 'non-admin news restore allowed';exception when sqlstate '42501' then null;end;
 begin perform public.restore_preview_merchandise_result('00000000-0000-4000-8000-000000000007',1,1,repeat('a',64),'https://shop.example.com/card');raise exception 'non-admin merchandise restore allowed';exception when sqlstate '42501' then null;end;
 if exists(select 1 from public.preview_merchandise_searches) or exists(select 1 from public.player_articles where status='rejected') then raise exception 'private archive exposed';end if;
end $$;
reset role;
do $$ begin
 if has_function_privilege('anon','public.restore_preview_news_article(uuid,integer,integer,text,text)','execute')
 or has_function_privilege('anon','public.restore_preview_merchandise_result(uuid,integer,integer,text,text)','execute') then raise exception 'anonymous restore allowed';end if;
end $$;
