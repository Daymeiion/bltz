-- Isolated in-memory fixture only, never application data.
do $$ begin if current_setting('bltz.test_bulk_isolated',true) is distinct from 'true' then raise exception 'isolated fixture required'; end if; end $$;
create function pg_temp.bulk_article(n integer) returns jsonb language sql as $$
 select jsonb_build_object('headline','Player football '||n,'headline_key','press.example.com|player football '||n,'publisher','Press',
 'article_url','https://press.example.com/story/'||n,'canonical_url','https://press.example.com/story/'||n,'summary','Football at Arizona','source_domain','press.example.com',
 'discovery_source','fixture','discovered_at','2020-01-01T00:00:00Z','confidence',0.95,'relevance_score',0.95,'metadata',jsonb_build_object('extraction','NewsArticle'));
$$;
insert into public.preview_lockers(id,revision,merchandise,article_edits) values('00000000-0000-4000-8000-000000000006',1,'[{"id":"curated-merch"}]','[{"id":"curated-news"}]');
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select public.save_preview_enrichment('00000000-0000-4000-8000-000000000006',1,repeat('a',64),'2020-01-01','[]',jsonb_build_array(pg_temp.bulk_article(1),pg_temp.bulk_article(2),pg_temp.bulk_article(3)),'{}');
select public.save_preview_merchandise_search('00000000-0000-4000-8000-000000000006',1,repeat('a',64),'2020-01-01',
 '{"items":[{"productUrl":"https://amazon.com/card/dp/B01N26VW34"},{"productUrl":"https://ebay.com/itm/12345"},{"productUrl":"https://shop.example.com/jersey"}],"status":"complete"}');
reset role;
-- Simulate a pre-existing published article: dismissing a queue batch cannot touch it.
update public.player_articles set status='accepted' where article_url='https://press.example.com/story/3';
set role authenticated;
do $$ declare pid uuid:='00000000-0000-4000-8000-000000000006'; snapshot jsonb; actual jsonb; count_before integer; result jsonb; urls text[]; n integer; batch jsonb;
begin
 select to_jsonb(q) into snapshot from public.preview_merchandise_searches q where preview_id=pid;
 begin perform public.dismiss_preview_merchandise_results(pid,1,1,array['https://amazon.com/card/dp/B01N26VW34','https://other.example.com/not-in-this-preview']);raise exception 'partial invalid merchandise batch accepted';exception when sqlstate '22023' then null;end;
 select to_jsonb(q) into actual from public.preview_merchandise_searches q where preview_id=pid;
 if actual<>snapshot then raise exception 'invalid merchandise batch mutated queue';end if;
 begin perform public.dismiss_preview_news_articles(pid,1,1,array['https://press.example.com/story/1','https://press.example.com/story/3']);raise exception 'published news accepted in dismissal';exception when sqlstate '22023' then null;end;
 if (select count(*) from public.player_articles where preview_id=pid and status='review')<>2 then raise exception 'invalid news batch partially dismissed';end if;
 begin perform public.dismiss_preview_news_articles(pid,1,1,array['https://press.example.com/story/1','https://other.example.com/not-in-this-preview']);raise exception 'foreign article accepted';exception when sqlstate '22023' then null;end;
 foreach urls slice 1 in array array[array['https://press.example.com/story/1','https://press.example.com/story/1'],array['https://press.example.com/story/1',null]] loop
  begin perform public.dismiss_preview_news_articles(pid,1,1,urls);raise exception 'invalid news array accepted';exception when sqlstate '22023' then null;end;
  begin perform public.dismiss_preview_merchandise_results(pid,1,1,urls);raise exception 'invalid merchandise array accepted';exception when sqlstate '22023' then null;end;
 end loop;
 begin perform public.dismiss_preview_news_articles(pid,1,1,'{}');raise exception 'empty news batch accepted';exception when sqlstate '22023' then null;end;
 begin perform public.dismiss_preview_merchandise_results(pid,1,1,'{}');raise exception 'empty merchandise batch accepted';exception when sqlstate '22023' then null;end;
 urls:=array(select 'https://press.example.com/'||i from generate_series(1,201)i);
 begin perform public.dismiss_preview_news_articles(pid,1,1,urls);raise exception 'oversized news batch accepted';exception when sqlstate '22023' then null;end;
 begin perform public.dismiss_preview_merchandise_results(pid,1,1,urls);raise exception 'oversized merchandise batch accepted';exception when sqlstate '22023' then null;end;
 begin perform public.dismiss_preview_news_articles(pid,2,1,array['https://press.example.com/story/1']);raise exception 'stale news revision accepted';exception when sqlstate 'PT409' then null;end;
 begin perform public.dismiss_preview_merchandise_results(pid,2,1,array['https://amazon.com/card/dp/B01N26VW34']);raise exception 'stale merchandise revision accepted';exception when sqlstate 'PT409' then null;end;
 select count(*) into count_before from public.audit_logs where action='preview.news_review';
 result:=public.dismiss_preview_news_articles(pid,1,1,array['https://press.example.com/story/1','https://press.example.com/story/2']);
 if result->>'version'<>'2' or (select count(*) from public.player_articles where preview_id=pid and status='rejected')<>2
  or (select count(*) from public.audit_logs where action='preview.news_review')<>count_before+2 then raise exception 'news bulk version/audit/dismissal incorrect';end if;
 if (select count(*) from public.player_articles where preview_id=pid and status='accepted')<>1 then raise exception 'bulk changed published news';end if;
 select count(*) into count_before from public.audit_logs where action='preview.merchandise_review';
 result:=public.dismiss_preview_merchandise_results(pid,1,1,array['https://amazon.com/card/dp/B01N26VW34','https://ebay.com/itm/12345']);
 if result->>'version'<>'2' or jsonb_array_length(result->'dismissed_urls')<>2
  or (select count(*) from public.audit_logs where action='preview.merchandise_review')<>count_before+1 then raise exception 'merchandise bulk version/audit/dismissal incorrect';end if;
 begin perform public.dismiss_preview_news_articles(pid,1,1,array['https://press.example.com/story/1']);raise exception 'stale news version accepted';exception when sqlstate 'PT409' then null;end;
 begin perform public.dismiss_preview_merchandise_results(pid,1,1,array['https://shop.example.com/jersey']);raise exception 'stale merchandise version accepted';exception when sqlstate 'PT409' then null;end;
 -- Existing single-item APIs share the same atomic implementation and preserve idempotency.
 if public.dismiss_preview_news_article(pid,1,2,'https://press.example.com/story/1')->>'version'<>'2'
  or public.dismiss_preview_merchandise_result(pid,1,2,'https://amazon.com/card/dp/B01N26VW34')->>'version'<>'2' then raise exception 'single-item idempotency changed';end if;
 perform public.save_preview_enrichment(pid,1,repeat('a',64),'2020-01-02','[]',jsonb_build_array(pg_temp.bulk_article(1)||jsonb_build_object('article_url','https://www.press.example.com/story/1?utm_source=again'),pg_temp.bulk_article(2)),'{}');
 if exists(select 1 from public.player_articles where preview_id=pid and status='review') then raise exception 'bulk-dismissed news resurrected';end if;
 perform public.save_preview_enrichment(pid,1,repeat('a',64),'2020-01-03','[]',jsonb_build_array(pg_temp.bulk_article(4)),'{}');
 result:=public.dismiss_preview_news_article(pid,1,4,'https://press.example.com/story/4');
 if result->>'version'<>'5'
   or exists(select 1 from public.player_articles where preview_id=pid and status='review') then raise exception 'single news dismissal broken';end if;
 result:=public.save_preview_merchandise_search(pid,1,repeat('a',64),'2020-01-02',
  '{"items":[{"productUrl":"https://www.amazon.com/gp/product/B01N26VW34?ref=again"},{"productUrl":"https://www.ebay.com/itm/card/12345"}],"status":"complete"}');
 if jsonb_array_length(result->'result'->'items')<>1 then raise exception 'bulk-dismissed product aliases resurrected';end if;
 result:=public.dismiss_preview_merchandise_result(pid,1,3,'https://shop.example.com/jersey');
 if result->>'version'<>'4' then raise exception 'single merchandise dismissal broken';end if;
 if (select merchandise from public.preview_lockers where id=pid)<>'[{"id":"curated-merch"}]'::jsonb
  or (select article_edits from public.preview_lockers where id=pid)<>'[{"id":"curated-news"}]'::jsonb then raise exception 'bulk mutated Locker';end if;
 -- A maximum-size batch is one version transition, not 200 serial RPC calls.
 for n in 0..16 loop
  batch:=(select jsonb_agg(pg_temp.bulk_article(1000+n*12+i)) from generate_series(1,case when n=16 then 8 else 12 end)i);
  perform public.save_preview_enrichment(pid,1,repeat('b',64),'2021-01-01'::timestamptz+n*interval '1 day','[]',batch,'{}');
  batch:=(select jsonb_build_object('status','complete','items',jsonb_agg(jsonb_build_object('productUrl','https://shop.example.com/'||(n*12+i)))) from generate_series(1,case when n=16 then 8 else 12 end)i);
  perform public.save_preview_merchandise_search(pid,1,repeat('b',64),'2021-01-01'::timestamptz+n*interval '1 day',batch);
 end loop;
 select news_review_version into n from public.preview_enrichments where preview_id=pid;
 urls:=array(select article_url from public.player_articles where preview_id=pid and identity_key=repeat('b',64) and status='review');
 result:=public.dismiss_preview_news_articles(pid,1,n,urls);
 if (result->>'version')::integer<>n+1 or exists(select 1 from public.player_articles where preview_id=pid and identity_key=repeat('b',64) and status='review') then raise exception '200-news batch failed';end if;
 select version into n from public.preview_merchandise_searches where preview_id=pid;
 urls:=array(select i->>'productUrl' from public.preview_merchandise_searches q cross join lateral jsonb_array_elements(q.result->'items') i where q.preview_id=pid);
 result:=public.dismiss_preview_merchandise_results(pid,1,n,urls);
 if (result->>'version')::integer<>n+1 or jsonb_array_length(result->'dismissed_urls')<>200 then raise exception '200-merchandise batch failed';end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
do $$ begin
 begin perform public.dismiss_preview_news_articles('00000000-0000-4000-8000-000000000006',1,1,array['https://press.example.com/story/1']);raise exception 'non-Admin news dismissal';exception when insufficient_privilege then null;end;
 begin perform public.dismiss_preview_merchandise_results('00000000-0000-4000-8000-000000000006',1,1,array['https://shop.example.com/jersey']);raise exception 'non-Admin product dismissal';exception when insufficient_privilege then null;end;
 if exists(select 1 from public.player_articles) or exists(select 1 from public.preview_merchandise_searches) then raise exception 'non-Admin review read';end if;
end $$;
reset role;
do $$ begin
 if exists(select 1 from pg_proc where oid in ('public.dismiss_preview_news_articles(uuid,integer,integer,text[])'::regprocedure,'public.dismiss_preview_merchandise_results(uuid,integer,integer,text[])'::regprocedure) and prosecdef)
  or has_function_privilege('anon','public.dismiss_preview_news_articles(uuid,integer,integer,text[])','EXECUTE')
  or has_function_privilege('anon','public.dismiss_preview_merchandise_results(uuid,integer,integer,text[])','EXECUTE') then raise exception 'bulk function privilege regression';end if;
end $$;
