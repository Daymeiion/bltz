-- Reuses the isolated 200-dismissal fixture created by the bulk review suite.
do $$ begin if current_setting('bltz.test_bulk_isolated',true) is distinct from 'true' then raise exception 'isolated fixture required';end if;end $$;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
do $$ declare pid uuid:='00000000-0000-4000-8000-000000000006'; nv integer; mv integer; n integer; audits integer;
 news_urls text[]; merch_urls text[]; invalid text[]; result jsonb; before_state jsonb; after_state jsonb;
begin
 select news_review_version into nv from public.preview_enrichments where preview_id=pid;
 news_urls:=array(select article_url from public.player_articles where preview_id=pid and identity_key=repeat('b',64) and status='rejected' order by article_url);
 if cardinality(news_urls)<>200 then raise exception '200-news fixture missing';end if;
 result:=public.save_preview_merchandise_search(pid,1,repeat('b',64),'2022-01-01','{"status":"complete","items":[]}');
 mv:=(result->>'version')::int;merch_urls:=array(select jsonb_array_elements_text(result->'dismissed_urls'));
 if cardinality(merch_urls)<>200 or jsonb_array_length(result->'dismissed_items')<>200 then raise exception '200-listing archive missing';end if;
 select jsonb_build_object('news',(select jsonb_agg(to_jsonb(a) order by id) from public.player_articles a where preview_id=pid),
  'state',(select to_jsonb(e) from public.preview_enrichments e where preview_id=pid),'merch',(select to_jsonb(m) from public.preview_merchandise_searches m where preview_id=pid),
  'audits',(select count(*) from public.audit_logs)) into before_state;
 for n in 1..5 loop
  invalid:=case n when 1 then null when 2 then '{}'::text[] when 3 then array[news_urls[1],news_urls[1]] when 4 then array[null]::text[] else array(select 'https://press.example.com/'||i from generate_series(1,201)i) end;
  begin perform public.restore_preview_news_articles(pid,1,nv,repeat('b',64),invalid);raise exception 'invalid news batch accepted';exception when sqlstate '22023' then null;end;
  begin perform public.restore_preview_merchandise_results(pid,1,mv,repeat('b',64),invalid);raise exception 'invalid listing batch accepted';exception when sqlstate '22023' then null;end;
 end loop;
 begin perform public.restore_preview_news_articles(pid,1,nv,repeat('b',64),array[news_urls[1],'https://foreign.example.com/story']);raise exception 'foreign news partially restored';exception when sqlstate '22023' then null;end;
 begin perform public.restore_preview_news_articles(pid,1,nv,repeat('b',64),array[news_urls[1],'https://press.example.com/story/3']);raise exception 'accepted news restored';exception when sqlstate '22023' then null;end;
 begin perform public.restore_preview_merchandise_results(pid,1,mv,repeat('b',64),array[merch_urls[1],'https://foreign.example.com/product']);raise exception 'foreign product partially restored';exception when sqlstate '22023' then null;end;
 begin perform public.restore_preview_news_articles(pid,2,nv,repeat('b',64),news_urls);raise exception 'news stale revision accepted';exception when sqlstate 'PT409' then null;end;
 begin perform public.restore_preview_merchandise_results(pid,2,mv,repeat('b',64),merch_urls);raise exception 'merch stale revision accepted';exception when sqlstate 'PT409' then null;end;
 begin perform public.restore_preview_news_articles(pid,1,nv-1,repeat('b',64),news_urls);raise exception 'news stale version accepted';exception when sqlstate 'PT409' then null;end;
 begin perform public.restore_preview_merchandise_results(pid,1,mv-1,repeat('b',64),merch_urls);raise exception 'merch stale version accepted';exception when sqlstate 'PT409' then null;end;
 begin perform public.restore_preview_news_articles(pid,1,nv,repeat('a',64),news_urls);raise exception 'news wrong identity accepted';exception when sqlstate 'PT409' then null;end;
 begin perform public.restore_preview_merchandise_results(pid,1,mv,repeat('a',64),merch_urls);raise exception 'merch wrong identity accepted';exception when sqlstate 'PT409' then null;end;
 begin perform public.restore_preview_news_articles('00000000-0000-4000-8000-000000000009',1,nv,repeat('b',64),news_urls);raise exception 'missing preview accepted';exception when sqlstate 'P0002' then null;end;
 select jsonb_build_object('news',(select jsonb_agg(to_jsonb(a) order by id) from public.player_articles a where preview_id=pid),
  'state',(select to_jsonb(e) from public.preview_enrichments e where preview_id=pid),'merch',(select to_jsonb(m) from public.preview_merchandise_searches m where preview_id=pid),
  'audits',(select count(*) from public.audit_logs)) into after_state;
 if before_state<>after_state then raise exception 'invalid batch changed data/audits';end if;
 select count(*) into audits from public.audit_logs where action='preview.news_review';
 result:=public.restore_preview_news_articles(pid,1,nv,repeat('b',64),news_urls);
 if (result->>'version')::int<>nv+1 or (select count(*) from public.player_articles where preview_id=pid and identity_key=repeat('b',64) and status='review')<>200
  or (select count(*) from public.audit_logs where action='preview.news_review')<>audits+200 then raise exception '200-news restore version/count/audit failed';end if;
 nv:=nv+1;
 select count(*) into audits from public.audit_logs where action='preview.merchandise_review';
 result:=public.restore_preview_merchandise_results(pid,1,mv,repeat('b',64),merch_urls);
 if (result->>'version')::int<>mv+1 or jsonb_array_length(result->'result'->'items')<>200 or jsonb_array_length(result->'dismissed_items')<>0
  or jsonb_array_length(result->'dismissed_urls')<>0 or jsonb_array_length(result->'dismissed_keys')<>0
  or (select count(*) from public.audit_logs where action='preview.merchandise_review')<>audits+1 then raise exception '200-listing restore version/count/audit failed';end if;
 mv:=mv+1;
 begin perform public.restore_preview_news_articles(pid,1,nv,repeat('b',64),news_urls);raise exception 'news repeat duplicated';exception when sqlstate '22023' then null;end;
 begin perform public.restore_preview_merchandise_results(pid,1,mv,repeat('b',64),merch_urls);raise exception 'merch repeat duplicated';exception when sqlstate '22023' then null;end;
 -- Aliases of restored records merge into the same pending records at capacity.
 perform public.save_preview_enrichment(pid,1,repeat('b',64),'2022-01-02','[]',jsonb_build_array(pg_temp.bulk_article(1001)||jsonb_build_object('article_url','https://www.press.example.com/story/1001?utm_source=alias')),'{}');
 result:=public.save_preview_merchandise_search(pid,1,repeat('b',64),'2022-01-02','{"status":"complete","items":[{"productUrl":"https://www.shop.example.com/1?utm_source=alias"}]}');
 mv:=(result->>'version')::int;
 if jsonb_array_length(result->'result'->'items')<>200 or (select count(*) from public.player_articles where preview_id=pid and identity_key=repeat('b',64) and status='review')<>200 then raise exception 'restored aliases duplicated';end if;
 select news_review_version into nv from public.preview_enrichments where preview_id=pid;
 perform public.dismiss_preview_news_articles(pid,1,nv,news_urls[1:2]);
 perform public.dismiss_preview_merchandise_results(pid,1,mv,merch_urls[1:2]);
 perform public.save_preview_enrichment(pid,1,repeat('b',64),'2022-01-03','[]',jsonb_build_array(pg_temp.bulk_article(9000)),'{}');
 result:=public.save_preview_merchandise_search(pid,1,repeat('b',64),'2022-01-03','{"status":"complete","items":[{"productUrl":"https://shop.example.com/new-card"}]}');
 mv:=(result->>'version')::int;
 select news_review_version into nv from public.preview_enrichments where preview_id=pid;
 begin perform public.restore_preview_news_articles(pid,1,nv,repeat('b',64),news_urls[1:2]);raise exception 'news overflow partially restored';exception when sqlstate 'PT422' then null;end;
 begin perform public.restore_preview_merchandise_results(pid,1,mv,repeat('b',64),merch_urls[1:2]);raise exception 'merch overflow partially restored';exception when sqlstate 'PT422' then null;end;
 if (select count(*) from public.player_articles where preview_id=pid and identity_key=repeat('b',64) and status='rejected')<>2
  or (select cardinality(dismissed_urls) from public.preview_merchandise_searches where preview_id=pid)<>2 then raise exception 'overflow changed dismissed items';end if;
 -- Existing single wrappers still restore exactly one, leaving the other dismissed.
 perform public.restore_preview_news_article(pid,1,nv,repeat('b',64),news_urls[1]);
 result:=public.restore_preview_merchandise_result(pid,1,mv,repeat('b',64),merch_urls[1]);
 if jsonb_array_length(result->'result'->'items')<>200 or jsonb_array_length(result->'dismissed_items')<>1
  or (select count(*) from public.player_articles where preview_id=pid and identity_key=repeat('b',64) and status='review')<>200 then raise exception 'single compatibility failed';end if;
 if (select merchandise from public.preview_lockers where id=pid)<>'[{"id":"curated-merch"}]'::jsonb
  or (select article_edits from public.preview_lockers where id=pid)<>'[{"id":"curated-news"}]'::jsonb
  or not exists(select 1 from public.player_articles where preview_id=pid and article_url='https://press.example.com/story/3' and status='accepted') then raise exception 'bulk restore changed Locker/published article';end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
do $$ begin
 begin perform public.restore_preview_news_articles('00000000-0000-4000-8000-000000000006',1,1,repeat('b',64),array['https://press.example.com/story/1001']);raise exception 'non-Admin news bulk allowed';exception when sqlstate '42501' then null;end;
 begin perform public.restore_preview_merchandise_results('00000000-0000-4000-8000-000000000006',1,1,repeat('b',64),array['https://shop.example.com/1']);raise exception 'non-Admin merch bulk allowed';exception when sqlstate '42501' then null;end;
end $$;
reset role;
do $$ begin
 if has_function_privilege('anon','public.restore_preview_news_articles(uuid,integer,integer,text,text[])','execute')
  or has_function_privilege('anon','public.restore_preview_merchandise_results(uuid,integer,integer,text,text[])','execute')
  or exists(select 1 from pg_proc where oid in ('public.restore_preview_news_articles(uuid,integer,integer,text,text[])'::regprocedure,'public.restore_preview_merchandise_results(uuid,integer,integer,text,text[])'::regprocedure) and prosecdef) then raise exception 'bulk restore security regression';end if;
end $$;
