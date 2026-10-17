-- Isolated PGlite fixture only. Never run against application data.
do $$ begin if current_setting('bltz.test_queue_isolated',true) is distinct from 'true' then raise exception 'isolated fixture required'; end if; end $$;
insert into public.preview_lockers(id,revision,merchandise) values('00000000-0000-4000-8000-000000000004',1,'[]');
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
do $$
declare pid uuid:='00000000-0000-4000-8000-000000000004'; saved jsonb; batch jsonb; before_row jsonb; n integer; idx integer; stamp timestamptz:='2020-01-01';
begin
 saved:=public.save_preview_merchandise_search(pid,1,repeat('c',64),stamp,'{"items":[{"productUrl":"https://www.amazon.com/old-title/dp/B01N26VW34?utm_source=first","title":"Original"},{"productUrl":"https://shop.example.com/old"}],"status":"complete"}');
 saved:=public.save_preview_merchandise_search(pid,1,repeat('c',64),stamp+interval '1 day','{"items":[{"productUrl":"https://amazon.com/gp/product/B01N26VW34?ref=search","title":"Replacement"},{"productUrl":"https://shop.example.com/new"}],"status":"complete"}');
 if jsonb_array_length(saved->'result'->'items')<>3 or saved->'result'->'items'->0->>'title'<>'Original' then raise exception 'append/dedupe/original metadata failed'; end if;
 saved:=public.dismiss_preview_merchandise_result(pid,1,(saved->>'version')::integer,'https://www.amazon.com/old-title/dp/B01N26VW34?utm_source=first');
 saved:=public.save_preview_merchandise_search(pid,1,repeat('c',64),stamp+interval '2 days','{"items":[],"status":"complete"}');
 if jsonb_array_length(saved->'result'->'items')<>2 then raise exception 'empty search removed pending results'; end if;
 saved:=public.save_preview_merchandise_search(pid,1,repeat('c',64),stamp+interval '3 days','{"items":[{"productUrl":"https://amazon.com/fresh-title/dp/B01N26VW34"}],"status":"complete"}');
 if jsonb_array_length(saved->'result'->'items')<>2 then raise exception 'dismissed alias resurrected'; end if;
 -- A new canonical bridge must consolidate both older groups and preserve the oldest metadata.
 saved:=public.save_preview_merchandise_search(pid,1,repeat('c',64),stamp+interval '4 days','{"items":[{"productUrl":"https://shop.example.com/old","canonicalUrl":"https://shop.example.com/new"}],"status":"complete"}');
 if jsonb_array_length(saved->'result'->'items')<>1 or saved->'result'->'items'->0->>'productUrl'<>'https://shop.example.com/old' then raise exception 'canonical bridge failed'; end if;
 saved:=public.save_preview_merchandise_search(pid,1,repeat('c',64),stamp+interval '5 days','{"items":[{"productUrl":"https://shop.example.com/new?utm_source=again#fragment"}],"status":"complete"}');
 if jsonb_array_length(saved->'result'->'items')<>1 then raise exception 'saved canonical alias lost'; end if;
 -- URL variants merge, meaningful query values and different sellers remain distinct.
 saved:=public.save_preview_merchandise_search(pid,1,repeat('d',64),stamp+interval '6 days','{"items":[{"productUrl":"https://www.shop.example.com/card/?b=2&a=1&utm_source=x#fragment"},{"productUrl":"https://shop.example.com/card?a=1&b=2"},{"productUrl":"https://shop.example.com/card?a=1&b=3"},{"productUrl":"https://other.example.com/card?a=1&b=2","canonicalUrl":"https://shop.example.com/card?a=1&b=2"},{"productUrl":"https://ebay.com/itm/old-title/12345"},{"productUrl":"https://www.ebay.com/itm/12345?hash=x"},{"productUrl":"https://ebay.com/itm/12346"},{"productUrl":"https://nflauction.nfl.com/first/isynmv1/aucd/5491501"},{"productUrl":"https://nflauction.nfl.com/second/isynmv1/aucd/5491501"},{"productUrl":"https://sportsmemorabilia.com/a/p-4580493739672+z-9"},{"productUrl":"https://www.sportsmemorabilia.com/b/p-4580493739672+z-8"}],"status":"complete"}');
 if jsonb_array_length(saved->'result'->'items')<>7 then raise exception 'URL/product ID dedupe failed: %',saved->'result'->'items'; end if;
 -- Accumulated queue may exceed the per-search limit; no overflow may evict prior pending work.
 for n in 0..16 loop
   batch:=(select jsonb_build_object('status','complete','items',jsonb_agg(jsonb_build_object('productUrl','https://shop.example.com/product/'||(n*12+i)))) from generate_series(1,case when n=16 then 8 else 12 end) i);
   saved:=public.save_preview_merchandise_search(pid,1,repeat('e',64),stamp+interval '7 days'+n*interval '1 day',batch);
 end loop;
 if jsonb_array_length(saved->'result'->'items')<>200 then raise exception 'accumulation above twelve failed'; end if;
 before_row:=saved;
 begin
   perform public.save_preview_merchandise_search(pid,1,repeat('e',64),stamp+interval '30 days','{"items":[{"productUrl":"https://shop.example.com/overflow"}],"status":"complete"}');
   raise exception 'overflow accepted';
 exception when sqlstate 'PT422' then null; end;
 select to_jsonb(q) into saved from public.preview_merchandise_searches q where preview_id=pid;
 if saved<>before_row then raise exception 'overflow changed pending queue'; end if;
 saved:=public.dismiss_preview_merchandise_result(pid,1,(saved->>'version')::integer,'https://shop.example.com/product/1');
 saved:=public.save_preview_merchandise_search(pid,1,repeat('e',64),stamp+interval '30 days','{"items":[{"productUrl":"https://shop.example.com/overflow"}],"status":"complete"}');
 if jsonb_array_length(saved->'result'->'items')<>200 then raise exception 'dismissal did not free pending capacity'; end if;
 if (select merchandise from public.preview_lockers where id=pid)<>'[]'::jsonb then raise exception 'search wrote Locker'; end if;
end $$;
reset role;
do $$ begin
 if has_function_privilege('anon','public.preview_merchandise_listing_keys(jsonb)','EXECUTE') then raise exception 'anonymous helper access'; end if;
end $$;
