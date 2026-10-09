-- Read-only metadata only. Run deliberately against the intended database.
-- No player, contact, inquiry, event, email, token or media data is selected.
-- This does not apply the NON-ACTIVE candidate migrations in this directory.
-- supabase/migrations remains the only authoritative active migration directory.
begin read only;
set local statement_timeout = '10s';
set local lock_timeout = '5s';
select jsonb_build_object(
  'system_identifier', (select system_identifier::text from pg_control_system()),
  'migration_count', (select count(*) from supabase_migrations.schema_migrations),
  'latest_version', (select max(version) from supabase_migrations.schema_migrations),
  'ordered_versions_md5', (select md5(string_agg(version, ',' order by version)) from supabase_migrations.schema_migrations),
  'complete_history', (select jsonb_agg(jsonb_build_object('version', version, 'name', name) order by version) from supabase_migrations.schema_migrations),
  'original_and_candidate_versions_present', (
    select jsonb_object_agg(requested_version, exists(
      select 1 from supabase_migrations.schema_migrations where version = requested_version
    )) from unnest(array[
      '20261005183837', '20261005231340', '20261006040117',
      '20261009003442', '20261009003448', '20261009003454'
    ]) requested_version
  ),
  'relations_present', (
    select jsonb_object_agg(relation, to_regclass(relation) is not null)
    from unnest(array[
      'public.analytics_events',
      'public.analytics_delivery_outbox',
      'public.analytics_delivery_batches',
      'public.preview_lockers',
      'public.preview_locker_short_links',
      'public.preview_locker_viewer_grants',
      'public.preview_conversion_campaigns',
      'public.preview_conversion_events',
      'public.preview_link_inquiries',
      'private.preview_analytics_capture_config'
    ]) relation
  ),
  'functions_present', (
    select jsonb_object_agg(signature, to_regprocedure(signature) is not null)
    from unnest(array[
      'private.has_active_platform_role(uuid,text[])',
      'public.accept_analytics_delivery_event(jsonb,jsonb)',
      'public.get_analytics_delivery_batch(uuid,text)',
      'public.lease_analytics_delivery_batch(text,integer,integer,uuid,integer)',
      'public.acquire_analytics_delivery_batch(uuid,text,uuid,integer)',
      'public.record_preview_analytics_event(jsonb,uuid,text)',
      'public.save_preview_link_inquiry(uuid,text,text,uuid,uuid,text)',
      'public.configure_preview_analytics_capture(text)'
    ]) signature
  )
) as transport_release_preflight;
commit;
