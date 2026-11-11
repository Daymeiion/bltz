begin;

-- public.awards is legacy per-player extraction evidence; do not repurpose it.
create table public.award_catalog (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null, sport text not null, league text, level text,
  award_type text not null, organization text, description text not null default '',
  aliases text[] not null default '{}', canonical_image_url text, image_source_url text,
  image_license text, attribution text,
  asset_status text not null default 'placeholder' check (asset_status in ('placeholder','approved')),
  active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint award_catalog_approved_asset check (asset_status <> 'approved' or
    (canonical_image_url ~ '^https://' and image_source_url ~ '^https://' and
     nullif(btrim(image_license),'') is not null and nullif(btrim(attribution),'') is not null
     and canonical_image_url is not null and image_source_url is not null))
);
alter table public.award_catalog enable row level security;
revoke all on public.award_catalog from public, anon, authenticated;
grant select on public.award_catalog to authenticated;
grant all on public.award_catalog to service_role;
create policy award_catalog_read on public.award_catalog for select to authenticated using (active or public.is_internal_admin());

alter table public.player_awards add column award_id uuid references public.award_catalog(id), add column edition text;
create index player_awards_catalog_idx on public.player_awards(award_id) where award_id is not null;

create table public.preview_award_links (
  id uuid primary key default gen_random_uuid(),
  preview_id uuid not null references public.preview_lockers(id) on delete cascade,
  player_id uuid references public.players(id), award_id uuid references public.award_catalog(id),
  source_revision integer not null check (source_revision > 0), raw_label text not null,
  year text not null default '', edition text not null default '', source_url text, source_type text not null,
  confidence numeric not null check (confidence between 0 and 1), verified boolean not null default false,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(preview_id,source_revision,raw_label,year,edition)
);
create index preview_award_links_player_idx on public.preview_award_links(player_id) where player_id is not null;
create index preview_award_links_catalog_idx on public.preview_award_links(award_id) where award_id is not null;
alter table public.preview_award_links enable row level security;
revoke all on public.preview_award_links from public, anon, authenticated;
grant select on public.preview_award_links to authenticated;
grant all on public.preview_award_links to service_role;
create policy preview_awards_read on public.preview_award_links for select to authenticated
  using (exists(select 1 from public.preview_lockers p where p.id=preview_id and (p.revision=source_revision or public.is_internal_admin())));

-- External metadata only; public.articles remains the authored-content model.
-- A reviewed player_id does not make these private-preview suggestions public.
create table public.player_articles (
  id uuid primary key default gen_random_uuid(),
  preview_id uuid not null references public.preview_lockers(id) on delete cascade,
  player_id uuid references public.players(id), identity_key text not null,
  source_revision integer not null check(source_revision > 0),
  headline text not null check(length(headline) between 1 and 300), headline_key text not null,
  publisher text not null, article_url text not null check(article_url ~ '^https://'),
  canonical_url text not null check(canonical_url ~ '^https://'), thumbnail_url text,
  published_at timestamptz, author text, summary text not null default '' check(length(summary)<=500),
  source_domain text not null, discovery_source text not null, discovered_at timestamptz not null,
  relevance_score numeric not null check(relevance_score between 0 and 1),
  confidence numeric not null check(confidence between 0 and 1), featured boolean not null default false,
  status text not null default 'accepted' check(status in ('accepted','rejected','review','inactive')),
  metadata jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index player_articles_active_url on public.player_articles(preview_id,identity_key,canonical_url) where status='accepted';
create unique index player_articles_active_headline on public.player_articles(preview_id,identity_key,headline_key) where status='accepted';
create index player_articles_player_idx on public.player_articles(player_id) where player_id is not null;
create index player_articles_preview_date_idx on public.player_articles(preview_id,identity_key,published_at desc);
alter table public.player_articles enable row level security;
revoke all on public.player_articles from public, anon, authenticated;
grant select on public.player_articles to authenticated;
grant all on public.player_articles to service_role;
create policy preview_articles_read on public.player_articles for select to authenticated
  using (status='accepted' and exists(select 1 from public.preview_lockers p where p.id=preview_id and (p.revision=source_revision or public.is_internal_admin())));

create table public.preview_enrichments (
  preview_id uuid primary key references public.preview_lockers(id) on delete cascade,
  source_revision integer not null, identity_key text not null,
  started_at timestamptz not null, updated_at timestamptz not null default now(),
  report jsonb not null default '{}', request_fingerprint text not null
);
alter table public.preview_enrichments enable row level security;
revoke all on public.preview_enrichments from public, anon, authenticated;
grant select on public.preview_enrichments to authenticated;
grant all on public.preview_enrichments to service_role;
create policy enrichment_admin_read on public.preview_enrichments for select to authenticated using (public.is_internal_admin());

create function public.save_preview_enrichment(p_preview_id uuid, p_revision integer, p_identity_key text,
  p_started_at timestamptz, p_awards jsonb, p_articles jsonb, p_report jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare target public.preview_lockers%rowtype; item jsonb; prior public.preview_enrichments%rowtype;
  fingerprint text; saved_report jsonb; linked integer := 0; retired integer := 0; field text;
begin
  if auth.uid() is null or public.is_internal_admin() is not true then raise exception 'forbidden' using errcode='42501'; end if;
  select * into target from public.preview_lockers where id=p_preview_id for update;
  if not found then raise exception 'preview_not_found' using errcode='P0002'; end if;
  if p_revision is null or target.revision <> p_revision then raise exception 'preview_changed' using errcode='40001'; end if;
  if p_started_at is null or not isfinite(p_started_at) or p_started_at > clock_timestamp()+interval '1 minute'
    or p_identity_key is null or p_identity_key !~ '^[a-f0-9]{64}$'
    or p_report is null or jsonb_typeof(p_report)<>'object' or octet_length(p_report::text)>16000
    or (p_awards is not null and (jsonb_typeof(p_awards)<>'array' or jsonb_array_length(p_awards)>40))
    or (p_articles is not null and (jsonb_typeof(p_articles)<>'array' or jsonb_array_length(p_articles)>12))
    then raise exception 'invalid_enrichment' using errcode='22023'; end if;
  fingerprint := md5(jsonb_build_array(p_revision,p_identity_key,p_awards,p_articles,p_report)::text);
  select * into prior from public.preview_enrichments where preview_id=p_preview_id;
  if prior.started_at = p_started_at and prior.request_fingerprint = fingerprint then return prior.report; end if;
  if prior.started_at >= p_started_at then raise exception 'newer_enrichment_exists' using errcode='40001'; end if;
  -- Latest attempt and last usable news discovery are distinct diagnostics.
  saved_report := (p_report - 'last_news_success') || jsonb_build_object('last_news_success',
    case when p_articles is not null then p_report - 'last_news_success'
      when prior.identity_key=p_identity_key then prior.report->'last_news_success' else null end);
  for item in select value from jsonb_array_elements(coalesce(p_awards,'[]')) loop
    foreach field in array array['raw_label','year','edition','source_type'] loop
      if jsonb_typeof(item->field) is distinct from 'string' then raise exception 'invalid_award_field' using errcode='22023'; end if;
    end loop;
    if jsonb_typeof(item)<>'object' or nullif(btrim(item->>'raw_label'),'') is null
      or length(item->>'raw_label')>200 or length(item->>'year')>20 or length(item->>'edition')>80
      or item->>'source_type' not in ('source_reference','admin_input')
      or jsonb_typeof(item->'metadata') is distinct from 'object' or octet_length((item->'metadata')::text)>4096
      or coalesce((item->>'verified')::boolean,false)
      then raise exception 'invalid_award' using errcode='22023'; end if;
    if item->>'source_url' is not null and (item->>'source_url' !~ '^https://[^/@[:space:]]+([/?#][^[:space:]]*)?$' or length(item->>'source_url')>2048)
      then raise exception 'invalid_award_url' using errcode='22023'; end if;
    insert into public.preview_award_links(preview_id,player_id,award_id,source_revision,raw_label,year,edition,source_url,source_type,confidence,metadata)
    values(p_preview_id,target.player_id,(item->>'award_id')::uuid,p_revision,item->>'raw_label',item->>'year',item->>'edition',item->>'source_url',item->>'source_type',(item->>'confidence')::numeric,item->'metadata')
    on conflict(preview_id,source_revision,raw_label,year,edition) do update set
      award_id=excluded.award_id,player_id=excluded.player_id,source_url=excluded.source_url,source_type=excluded.source_type,
      confidence=excluded.confidence,metadata=excluded.metadata,updated_at=now();
    -- Link only an already-existing achievement for this reviewed Career ID.
    -- Never insert/verify canonical achievements merely from scraped mentions.
    if target.player_id is not null and item->>'award_id' is not null and item->>'year' ~ '^[0-9]{4}$' then
      update public.player_awards set award_id=(item->>'award_id')::uuid,edition=nullif(item->>'edition',''),updated_at=now()
      where player_id=target.player_id and (lower(btrim(name))=lower(btrim(item->>'raw_label'))
        or exists(select 1 from public.award_catalog c where c.id=(item->>'award_id')::uuid
          and (lower(btrim(public.player_awards.name))=lower(c.name)
            or lower(btrim(public.player_awards.name)) in (select lower(alias) from unnest(c.aliases) alias))))
        and year=(item->>'year')::integer and award_id is null;
      linked := linked + found::integer;
    end if;
  end loop;
  if p_articles is not null then
    update public.player_articles set status='inactive',updated_at=now() where preview_id=p_preview_id and status='accepted';
    get diagnostics retired = row_count;
  end if;
  for item in select value from jsonb_array_elements(coalesce(p_articles,'[]')) loop
    if jsonb_typeof(item)<>'object' or jsonb_typeof(item->'metadata') is distinct from 'object'
      or octet_length((item->'metadata')::text)>4096 then raise exception 'invalid_article' using errcode='22023'; end if;
    foreach field in array array['headline','headline_key','publisher','source_domain','discovery_source'] loop
      if jsonb_typeof(item->field) is distinct from 'string' or nullif(btrim(item->>field),'') is null
        or length(item->>field)>(case when field='headline_key' then 600 else 300 end)
        then raise exception 'invalid_article_field' using errcode='22023'; end if;
    end loop;
    if (item->>'author' is not null and (jsonb_typeof(item->'author')<>'string' or length(item->>'author')>300))
      or jsonb_typeof(item->'summary') is distinct from 'string'
      then raise exception 'invalid_article_text' using errcode='22023'; end if;
    foreach field in array array['article_url','canonical_url','thumbnail_url'] loop
      if (field<>'thumbnail_url' and item->>field is null) or (item->>field is not null and
        (item->>field !~ '^https://[^/@[:space:]]+([/?#][^[:space:]]*)?$' or length(item->>field)>2048))
        then raise exception 'invalid_article_url' using errcode='22023'; end if;
    end loop;
    insert into public.player_articles(preview_id,player_id,identity_key,source_revision,headline,headline_key,publisher,article_url,canonical_url,
      thumbnail_url,published_at,author,summary,source_domain,discovery_source,discovered_at,relevance_score,confidence,metadata)
    values(p_preview_id,target.player_id,p_identity_key,p_revision,item->>'headline',item->>'headline_key',item->>'publisher',item->>'article_url',item->>'canonical_url',
      item->>'thumbnail_url',(item->>'published_at')::timestamptz,item->>'author',item->>'summary',item->>'source_domain',item->>'discovery_source',
      (item->>'discovered_at')::timestamptz,(item->>'relevance_score')::numeric,(item->>'confidence')::numeric,item->'metadata')
    on conflict do nothing;
  end loop;
  -- Only a failed/skipped discovery carries the previous active set forward.
  update public.player_articles set source_revision=p_revision,player_id=target.player_id,updated_at=now()
    where p_articles is null and preview_id=p_preview_id and identity_key=p_identity_key and status='accepted';
  insert into public.preview_enrichments(preview_id,source_revision,identity_key,started_at,report,request_fingerprint)
    values(p_preview_id,p_revision,p_identity_key,p_started_at,saved_report,fingerprint)
    on conflict(preview_id) do update set source_revision=excluded.source_revision,identity_key=excluded.identity_key,
      started_at=excluded.started_at,report=excluded.report,request_fingerprint=excluded.request_fingerprint,updated_at=now();
  insert into public.audit_logs(action,entity_type,entity_id,actor_user_id,new_values)
    values('preview.enrichment','preview_locker',p_preview_id::text,auth.uid(),
      jsonb_build_object('revision',p_revision,'report',saved_report,'articles_retired',retired,'existing_player_awards_linked',linked));
  return saved_report;
end $$;
revoke all on function public.save_preview_enrichment(uuid,integer,text,timestamptz,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.save_preview_enrichment(uuid,integer,text,timestamptz,jsonb,jsonb,jsonb) to authenticated;

insert into public.award_catalog(slug,name,sport,league,level,award_type,organization,aliases) values
('super-bowl-champion','Super Bowl Champion','football','NFL','pro','championship','NFL',array['SB champion','Super Bowl winner']),
('super-bowl-mvp','Super Bowl MVP','football','NFL','pro','individual','NFL',array['Super Bowl Most Valuable Player','SB MVP']),
('nfl-mvp','NFL MVP','football','NFL','pro','individual','NFL',array['NFL Most Valuable Player','AP NFL MVP']),
('nfl-offensive-player-of-the-year','Offensive Player of the Year','football','NFL','pro','individual','NFL',array['NFL Offensive Player of the Year','AP NFL Offensive Player of the Year']),
('nfl-defensive-player-of-the-year','Defensive Player of the Year','football','NFL','pro','individual','NFL',array['NFL Defensive Player of the Year','AP NFL Defensive Player of the Year']),
('nfl-offensive-rookie-of-the-year','Offensive Rookie of the Year','football','NFL','pro','individual','NFL',array['NFL Offensive Rookie of the Year']),
('nfl-defensive-rookie-of-the-year','Defensive Rookie of the Year','football','NFL','pro','individual','NFL',array['NFL Defensive Rookie of the Year']),
('first-team-all-pro','First-team All-Pro','football','NFL','pro','selection','NFL',array['First team All Pro','1st team All-Pro']),
('second-team-all-pro','Second-team All-Pro','football','NFL','pro','selection','NFL',array['Second team All Pro','2nd team All-Pro']),
('pro-bowl','Pro Bowl','football','NFL','pro','selection','NFL',array['Pro Bowler','Pro Bowl selection']),
('heisman-trophy','Heisman Trophy','football','NCAA','college','individual','Heisman Trophy Trust',array['Heisman winner','Heisman Trophy winner','Heisman Memorial Trophy']),
('national-champion','National Champion','football','NCAA','college','championship',null,array['National championship','College football national champion','CFP national champion','BCS national champion']),
('conference-champion','Conference Champion','football','NCAA','college','championship',null,array['Conference championship']),
('consensus-all-american','Consensus All-American','football','NCAA','college','selection',null,array['Consensus All American']),
('unanimous-all-american','Unanimous All-American','football','NCAA','college','selection',null,array['Unanimous All American']),
('first-team-all-american','First-team All-American','football','NCAA','college','selection',null,array['First team All American','1st team All-American']),
('conference-player-of-the-year','Conference Player of the Year','football','NCAA','college','individual',null,array[]::text[]),
('maxwell-award','Maxwell Award','football','NCAA','college','individual',null,array['Maxwell Award winner']),
('walter-camp-award','Walter Camp Award','football','NCAA','college','individual',null,array['Walter Camp Player of the Year Award']),
('doak-walker-award','Doak Walker Award','football','NCAA','college','individual',null,array['Doak Walker Award winner']),
('biletnikoff-award','Biletnikoff Award','football','NCAA','college','individual',null,array['Fred Biletnikoff Award']),
('bednarik-award','Bednarik Award','football','NCAA','college','individual',null,array['Chuck Bednarik Award']),
('thorpe-award','Thorpe Award','football','NCAA','college','individual',null,array['Jim Thorpe Award']),
('butkus-award','Butkus Award','football','NCAA','college','individual',null,array['Dick Butkus Award']),
('lombardi-award','Lombardi Award','football','NCAA','college','individual',null,array['Rotary Lombardi Award']),
('outland-trophy','Outland Trophy','football','NCAA','college','individual',null,array['Outland Trophy winner']);

comment on table public.award_catalog is 'Reusable award definitions and explicitly approved shared trophy imagery. No images seeded.';
comment on table public.preview_award_links is 'Private unverified award evidence. Normalization confidence is not achievement verification.';
comment on table public.player_articles is 'Private preview publisher metadata. No article bodies or downloaded images. No public promotion.';

create function private.audit_award_catalog_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
  new.updated_at := now();
  insert into public.audit_logs(action,entity_type,entity_id,actor_user_id,new_values)
    values('award_catalog.'||lower(tg_op),'award_catalog',new.id::text,auth.uid(),
      jsonb_build_object('slug',new.slug,'asset_status',new.asset_status,'image_source_url',new.image_source_url,
        'image_license',new.image_license,'attribution',new.attribution,'canonical_image_url',new.canonical_image_url,'active',new.active));
  return new;
end $$;
revoke all on function private.audit_award_catalog_change() from public,anon,authenticated;
create trigger audit_award_catalog_change before insert or update on public.award_catalog
  for each row execute function private.audit_award_catalog_change();
commit;
