// Local-only synthetic RLS/audit proof. Refuses non-loopback Supabase URLs.
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const apiUrl = process.env.PREVIEW_VIEWER_API_URL;
const publishableKey = process.env.PREVIEW_VIEWER_PUBLISHABLE_KEY;
const secretKey = process.env.PREVIEW_VIEWER_SECRET_KEY;
const project = process.env.PREVIEW_VIEWER_PROJECT;
assert.match(apiUrl ?? '', /^http:\/\/127\.0\.0\.1:\d+$/);
assert.match(project ?? '', /^bltz-preview-viewer-[a-z0-9-]+$/);
assert.ok(publishableKey && secretKey);

const sql = query => execFileSync('docker', ['exec', '-i', `supabase_db_${project}`, 'psql', '-X', '-U', 'postgres', '-d', 'postgres', '-qAt', '-v', 'ON_ERROR_STOP=1'], { input: /;\s*$/.test(query) ? query : `${query};`, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
const proof = [];
const check = (name, condition) => { assert.ok(condition, name); proof.push(name); console.log(`PASS ${name}`); };
const adminApi = createClient(apiUrl, secretKey, { auth: { persistSession: false } });

const users = {};
for (const role of ['staff', 'viewerA', 'viewerB', 'other', 'legacy']) {
  const email = `preview-${role.toLowerCase()}-${randomUUID()}@bltz.invalid`;
  const password = `LocalQA-${randomUUID()}!`;
  const created = await adminApi.auth.admin.createUser({ email, password, email_confirm: true });
  assert.ifError(created.error);
  users[role] = { id: created.data.user.id, email, password };
}

sql(`insert into public.platform_role_assignments(user_id,role,assignment_reason)
values ('${users.staff.id}','super_admin','synthetic private-preview viewer proof');
update public.profiles set role='admin' where id='${users.legacy.id}';`);

const clients = {};
for (const [role, fixture] of Object.entries(users)) {
  const client = createClient(apiUrl, publishableKey, { auth: { persistSession: false } });
  const session = await client.auth.signInWithPassword({ email: fixture.email, password: fixture.password });
  assert.ifError(session.error); clients[role] = client;
}
const anon = createClient(apiUrl, publishableKey, { auth: { persistSession: false } });
const baseline = sql("select jsonb_build_array((select count(*) from players),(select count(*) from player_lockers),(select count(*) from claim_tokens),(select count(*) from onboarding_pipeline_runs))");

check('fresh replay includes exactly 29 migrations', Number(sql('select count(*) from supabase_migrations.schema_migrations')) === 29);
check('viewer grant RLS enabled', sql("select relrowsecurity from pg_class where oid='public.preview_locker_viewer_grants'::regclass") === 't');
check('one-grant primary key is preview id', sql("select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.preview_locker_viewer_grants'::regclass and contype='p'") === 'PRIMARY KEY (preview_locker_id)');
check('grant table has no browser privileges', sql("select not has_any_column_privilege('anon','public.preview_locker_viewer_grants','SELECT') and not has_any_column_privilege('authenticated','public.preview_locker_viewer_grants','SELECT')") === 't');
check('private schema remains hidden', sql("select not has_schema_privilege('authenticated','private','USAGE')") === 't');
check('OID-bound private helper is executable but not directly addressable', sql("select has_function_privilege('authenticated','private.can_view_preview_locker(uuid)','EXECUTE') and not has_schema_privilege('authenticated','private','USAGE')") === 't');
check('public mutation wrappers exclude anon', sql("select not has_function_privilege('anon','public.assign_preview_locker_viewer(uuid,text)','EXECUTE') and has_function_privilege('authenticated','public.assign_preview_locker_viewer(uuid,text)','EXECUTE')") === 't');

const previewId = randomUUID(); const otherPreviewId = randomUUID();
const video = { id: 'video-1', title: 'Synthetic YouTube source', url: 'https://www.youtube.com/watch?v=abcdefghijk', thumb: null };
const photo = { id: 'photo-1', title: 'Synthetic photo', url: 'https://example.com/photo.jpg', credits: 'Synthetic credit', sourceUrl: 'https://example.com/source', level: 'cfb', season: '2001' };
const content = { full_name: 'Synthetic Viewer Preview', bio: 'Private fixture', videos: [video], photos: [photo] };
for (const [id, slug] of [[previewId, `viewer-${previewId}`], [otherPreviewId, `other-${otherPreviewId}`]]) {
  const created = await clients.staff.from('preview_lockers').insert({ id, slug, ...content }).select('id').single(); assert.ifError(created.error);
}

for (const [name, client] of Object.entries({ anonymous: anon, ordinary: clients.other, legacy: clients.legacy })) {
  const rows = await client.from('preview_lockers').select('id');
  check(`${name}: cannot list private previews`, Boolean(rows.error) || rows.data.length === 0);
}
check('legacy profile admin is not platform admin', (await clients.legacy.rpc('is_internal_admin')).data === false);

const missingAuditBefore = sql(`select count(*) from audit_logs where entity_id='${previewId}' and action like 'preview.viewer.%'`);
const missing = await clients.staff.rpc('assign_preview_locker_viewer', { p_preview_locker_id: previewId, p_email: `missing-${randomUUID()}@bltz.invalid` });
assert.ifError(missing.error); check('account-not-found is honest and non-mutating', missing.data === 'account_not_found' && sql(`select count(*) from preview_locker_viewer_grants where preview_locker_id='${previewId}'`) === '0');
check('account-not-found emits no fake audit', sql(`select count(*) from audit_logs where entity_id='${previewId}' and action like 'preview.viewer.%'`) === missingAuditBefore);

const assigned = await clients.staff.rpc('assign_preview_locker_viewer', { p_preview_locker_id: previewId, p_email: users.viewerA.email.toUpperCase() });
assert.ifError(assigned.error); check('case-normalized exact email assigns', assigned.data === 'assigned');
check('admin sees assigned status without email', (await clients.staff.rpc('preview_locker_has_viewer', { p_preview_locker_id: previewId })).data === true);
const viewerRows = await clients.viewerA.from('preview_lockers').select('id,slug,photos,videos,hero_video_url');
assert.ifError(viewerRows.error);
check('assigned viewer lists only the assigned preview', viewerRows.data.length === 1 && viewerRows.data[0].id === previewId);
const projectedPhoto = viewerRows.data[0].photos[0]; const projectedVideo = viewerRows.data[0].videos[0];
check('assigned viewer receives exact media/source projection', viewerRows.data[0].photos.length === 1 && projectedPhoto.id === photo.id && projectedPhoto.url === photo.url && projectedPhoto.sourceUrl === photo.sourceUrl && projectedPhoto.credits === photo.credits && viewerRows.data[0].videos.length === 1 && projectedVideo.id === video.id && projectedVideo.url === video.url);
check('assigned viewer cannot read grant rows', Boolean((await clients.viewerA.from('preview_locker_viewer_grants').select('*')).error));
check('assigned viewer cannot read creator field', Boolean((await clients.viewerA.from('preview_lockers').select('created_by').eq('id', previewId)).error));
check('assigned viewer cannot create', Boolean((await clients.viewerA.from('preview_lockers').insert({ id: randomUUID(), slug: `denied-${randomUUID()}`, ...content })).error));
const deniedUpdate = await clients.viewerA.from('preview_lockers').update({ bio: 'denied' }).eq('id', previewId).select('id');
check('assigned viewer cannot edit', Boolean(deniedUpdate.error) || deniedUpdate.data.length === 0);
check('assigned viewer cannot delete', Boolean((await clients.viewerA.from('preview_lockers').delete().eq('id', previewId)).error));
check('assigned viewer cannot run discovery', Boolean((await clients.viewerA.rpc('admit_preview_discovery')).error));
check('assigned viewer cannot assign viewers', Boolean((await clients.viewerA.rpc('assign_preview_locker_viewer', { p_preview_locker_id: previewId, p_email: users.viewerB.email })).error));

const reassigned = await clients.staff.rpc('assign_preview_locker_viewer', { p_preview_locker_id: previewId, p_email: users.viewerB.email });
assert.ifError(reassigned.error); check('admin reassigns atomically', reassigned.data === 'reassigned');
check('previous viewer loses access', (await clients.viewerA.from('preview_lockers').select('id').eq('id', previewId)).data.length === 0);
check('replacement viewer gains access', (await clients.viewerB.from('preview_lockers').select('id').eq('id', previewId)).data.length === 1);
const revoked = await clients.staff.rpc('revoke_preview_locker_viewer', { p_preview_locker_id: previewId });
assert.ifError(revoked.error); check('admin revokes current viewer', revoked.data === true);
check('revoked viewer loses access', (await clients.viewerB.from('preview_lockers').select('id').eq('id', previewId)).data.length === 0);
check('no-viewer status is honest', (await clients.staff.rpc('preview_locker_has_viewer', { p_preview_locker_id: previewId })).data === false);
check('assign reassign revoke each audit once', sql(`select count(*) from audit_logs where entity_id='${previewId}' and action in ('preview.viewer.assigned','preview.viewer.reassigned','preview.viewer.revoked')`) === '3');
check('viewer audit stores no email address', sql(`select count(*) from audit_logs where entity_id='${previewId}' and action like 'preview.viewer.%' and (coalesce(previous_values,'{}')::text||coalesce(new_values,'{}')::text||request_metadata::text) like '%@%'`) === '0');

const rollback = sql(`begin;
create function pg_temp.reject_viewer_audit() returns trigger language plpgsql as $$ begin if new.action like 'preview.viewer.%' then raise exception 'synthetic viewer audit failure'; end if; return new; end $$;
create trigger synthetic_viewer_audit_failure before insert on public.audit_logs for each row execute function pg_temp.reject_viewer_audit();
set local role authenticated;
select set_config('request.jwt.claim.sub','${users.staff.id}',true);
do $$ begin
  begin perform public.assign_preview_locker_viewer('${previewId}','${users.viewerA.email}'); raise exception 'unexpected success';
  exception when others then if sqlerrm <> 'synthetic viewer audit failure' then raise; end if; end;
end $$;
reset role;
do $$ begin if exists(select 1 from public.preview_locker_viewer_grants where preview_locker_id='${previewId}') then raise exception 'grant survived audit failure'; end if; end $$;
rollback; select 'viewer audit rollback verified';`);
check('audit failure rolls viewer grant back', rollback.endsWith('viewer audit rollback verified'));
check('canonical player/claim/onboarding tables unchanged', sql('select jsonb_build_array((select count(*) from players),(select count(*) from player_lockers),(select count(*) from claim_tokens),(select count(*) from onboarding_pipeline_runs))') === baseline);
console.log(`PRIVATE_PREVIEW_VIEWER_DB_PROOF ${proof.length} assertions; disposable synthetic rows retained`);
