-- Read-only scoped catalog. No table rows, function bodies, private or engine metadata.
begin read only;
set local statement_timeout = '10s';
set local lock_timeout = '5s';
with wanted_tables(name) as (values
  ('analytics_delivery_batches'), ('analytics_delivery_outbox'), ('preview_link_inquiries')
), wanted_functions(signature) as (values
  ('public.accept_analytics_delivery_event(jsonb,jsonb)'),
  ('public.get_analytics_delivery_batch(uuid,text)'),
  ('public.lease_analytics_delivery_batch(text,integer,integer,uuid,integer)'),
  ('public.mark_analytics_delivery_published(uuid,uuid,text)'),
  ('public.release_analytics_delivery_publish(uuid,uuid,text)'),
  ('public.acquire_analytics_delivery_batch(uuid,text,uuid,integer)'),
  ('public.settle_analytics_delivery_batch(uuid,uuid,text,text)'),
  ('public.configure_preview_analytics_capture(text)'),
  ('public.record_preview_analytics_event(jsonb,uuid,text)'),
  ('public.save_preview_link_inquiry(uuid,text,text,uuid,uuid,text)')
)
select jsonb_build_object(
  'snapshot_kind', 'bltz_preview_delivery_catalog_v1',
  'project_ref', 'yevihzsgqagvuulymqum',
  'read_only', true,
  'captured_at', clock_timestamp(),
  'system_identifier', (select system_identifier::text from pg_control_system()),
  'release_versions', (select jsonb_agg(version order by version)
    from supabase_migrations.schema_migrations
    where version in ('20261009003442','20261009003448','20261009003454','20261009022458')),
  'tables', (select jsonb_agg(jsonb_build_object(
    'schema', 'public', 'name', w.name, 'present', c.oid is not null, 'rls', c.relrowsecurity,
    'columns', (select coalesce(jsonb_agg(jsonb_build_object(
      'name', a.attname, 'ordinal', a.attnum, 'type', format_type(a.atttypid,a.atttypmod),
      'type_schema', tn.nspname, 'nullable', not a.attnotnull,
      'has_default', a.atthasdef, 'identity', a.attidentity, 'generated', a.attgenerated
    ) order by a.attnum), '[]'::jsonb)
      from pg_attribute a join pg_type t on t.oid=a.atttypid join pg_namespace tn on tn.oid=t.typnamespace
      where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
    'relationships', (select coalesce(jsonb_agg(jsonb_build_object(
      'foreign_key_name', fk.conname,
      'columns', (select jsonb_agg(a.attname order by k.ordinal)
        from unnest(fk.conkey) with ordinality k(number,ordinal)
        join pg_attribute a on a.attrelid=fk.conrelid and a.attnum=k.number),
      'referenced_schema', rn.nspname, 'referenced_relation', rc.relname,
      'referenced_columns', (select jsonb_agg(a.attname order by k.ordinal)
        from unnest(fk.confkey) with ordinality k(number,ordinal)
        join pg_attribute a on a.attrelid=fk.confrelid and a.attnum=k.number),
      'is_one_to_one', exists(select 1 from pg_constraint u where u.conrelid=fk.conrelid
        and u.contype in ('p','u') and u.conkey @> fk.conkey and u.conkey <@ fk.conkey)
    ) order by fk.conname), '[]'::jsonb)
      from pg_constraint fk join pg_class rc on rc.oid=fk.confrelid join pg_namespace rn on rn.oid=rc.relnamespace
      where fk.conrelid=c.oid and fk.contype='f')
  ) order by w.name) from wanted_tables w left join pg_class c on c.oid=to_regclass('public.'||w.name)),
  'functions', (select jsonb_agg(jsonb_build_object(
    'signature', w.signature, 'name', p.proname, 'present', p.oid is not null,
    'kind', p.prokind, 'returns_set', p.proretset, 'argument_modes', p.proargmodes,
    'return_type', format_type(p.prorettype,null), 'argument_count', p.pronargs,
    'default_count', p.pronargdefaults,
    'arguments', (select coalesce(jsonb_agg(jsonb_build_object(
      'name', p.proargnames[a.ordinal::integer], 'ordinal', a.ordinal, 'type', format_type(a.type_oid,null),
      'optional', a.ordinal>p.pronargs-p.pronargdefaults
    ) order by a.ordinal), '[]'::jsonb)
      from unnest(p.proargtypes::oid[]) with ordinality a(type_oid,ordinal))
  ) order by w.signature) from wanted_functions w left join pg_proc p on p.oid=to_regprocedure(w.signature))
) as preview_delivery_catalog;
commit;
