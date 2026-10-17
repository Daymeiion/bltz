import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';
const db=new PGlite();
try {
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema private;
 grant usage on schema auth to authenticated;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function public.is_internal_admin() returns boolean language sql stable as $$select auth.uid()='00000000-0000-4000-8000-000000000001'::uuid$$;
 create table public.players(id uuid primary key);
 create table public.player_awards(id uuid primary key default gen_random_uuid(),player_id uuid,name text,year integer,verified boolean default false,updated_at timestamptz default now());
 create table public.preview_lockers(id uuid primary key,player_id uuid,revision integer,merchandise jsonb default '[]',article_edits jsonb default '[]');
 alter table public.preview_lockers enable row level security;grant select,update on public.preview_lockers to authenticated;
 create policy preview_admin_read on public.preview_lockers for select to authenticated using(public.is_internal_admin());
 create policy preview_admin_update on public.preview_lockers for update to authenticated using(public.is_internal_admin()) with check(public.is_internal_admin());
 create table public.audit_logs(action text,entity_type text,entity_id text,actor_user_id uuid,actor_role_scope text,new_values jsonb);
 alter table public.audit_logs enable row level security;grant select on public.audit_logs to authenticated;
 create policy audit_admin_read on public.audit_logs for select to authenticated using(public.is_internal_admin());
 set bltz.test_bulk_isolated='true';`);
 for(const file of ['20260929205021_preview_awards_news_enrichment.sql','20260929214716_preview_enrichment_nonretryable_conflicts.sql','20261017033348_preview_merchandise_review_queue.sql','20261017035825_preview_merchandise_queue_merge.sql','20261017065704_preview_news_review_queue.sql','20261017071708_preview_media_bulk_review.sql','20261017073440_preview_media_restore.sql','20261017075740_preview_media_bulk_restore.sql'])await db.exec(fs.readFileSync('supabase/migrations/'+file,'utf8'));
 await db.exec(fs.readFileSync('supabase/tests/preview_media_bulk_review.sql','utf8'));
 await db.exec(fs.readFileSync('supabase/tests/preview_media_restore.sql','utf8'));
 await db.exec(fs.readFileSync('supabase/tests/preview_media_bulk_restore.sql','utf8'));
 console.log('PASS: atomic bulk restore + restore lifecycle + previous bulk regressions; news + merchandise bulk atomicity, 200-item batches, single-item compatibility, version/revision guards, invalid/duplicate/foreign/empty/oversized batches, persistent aliases, idempotency, audits, RLS, anonymous/non-Admin access and no Locker writes.');
} catch(error) { console.error(JSON.stringify({message:error.message,code:error.code,where:error.where}));process.exitCode=1; }
finally {await db.close();}
