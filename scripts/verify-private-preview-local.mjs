// Local-only, synthetic verification. Never accepts a hosted API or database.
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
const directory = process.env.PREVIEW_VERIFIER_DIR;
assert.ok(directory, 'Set PREVIEW_VERIFIER_DIR to the disposable fixture directory');
const settings = JSON.parse(readFileSync(`${directory}/status.json`, 'utf8'));
const fixtures = JSON.parse(readFileSync(`${directory}/fixtures.json`, 'utf8'));
assert.match(settings.API_URL, /^http:\/\/127\.0\.0\.1:\d+$/);
assert.match(fixtures.project, /^bltz-preview-[a-z0-9-]+$/);
const sql = query => execFileSync('docker', ['--context','desktop-linux','exec','-i',`supabase_db_${fixtures.project}`,'psql','-X','-U','postgres','-d','postgres','-qAt','-v','ON_ERROR_STOP=1'], { input: query, encoding: 'utf8', stdio: ['pipe','pipe','pipe'] }).trim();
const proof = []; const check = (name, condition) => { assert.ok(condition, name); proof.push(name); console.log(`PASS ${name}`); };
const clients = {};
for (const role of ['staff','ordinary','legacy']) {
  clients[role] = createClient(settings.API_URL, settings.PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const result = await clients[role].auth.signInWithPassword(fixtures.users[role]); assert.ifError(result.error);
}
const anon = createClient(settings.API_URL, settings.PUBLISHABLE_KEY, { auth: { persistSession: false } });
const admin = clients.staff; const id = randomUUID();
const video = { id: 'video-1', title: 'Synthetic video', url: 'https://example.com/synthetic.mp4', thumb: null };
const content = { slug: `synthetic-${id}`, full_name: 'Synthetic Preview', bio: 'Manual biography', videos: [video], photos: [{ id: 'photo-1', title: 'Synthetic photo', url: 'https://example.com/synthetic.jpg', credits: 'Synthetic fixture', sourceUrl: 'https://example.com/source', level: 'cfb', season: '2001' }], schools: [{ label: 'Fixture University', color: '#152238', logo: null }] };
check('private schema remains inaccessible to authenticated', sql("select has_schema_privilege('authenticated','private','usage')") === 'f');
check('pure JSON validator is security invoker', sql("select prosecdef from pg_proc where oid='private.preview_items_valid(text,jsonb)'::regprocedure") === 'f');
const baseline = sql('select jsonb_build_array((select count(*) from players),(select count(*) from player_lockers),(select count(*) from gtm_contacts),(select count(*) from onboarding_pipeline_runs))');
const created = await admin.from('preview_lockers').insert({ id, ...content }).select('id,slug,revision,photos,videos').single();
assert.ifError(created.error); check('authenticated admin persists nested media without private schema USAGE', created.data.id === id && created.data.revision === 1);
check('create audit committed atomically', sql(`select count(*) from audit_logs where entity_id='${id}' and action='preview.created'`) === '1');
check('creator column is not exposed', Boolean((await admin.from('preview_lockers').select('created_by').eq('id', id)).error));
for (const [role, client] of Object.entries({ anonymous: anon, ordinary: clients.ordinary, legacy: clients.legacy })) {
  const read = await client.from('preview_lockers').select('id').eq('id', id); check(`${role}: no private row read`, Boolean(read.error) || read.data.length === 0);
  const write = await client.from('preview_lockers').insert({ ...content, slug: `denied-${randomUUID()}` }); check(`${role}: create denied`, Boolean(write.error));
  const update = await client.from('preview_lockers').update({ bio: 'forbidden' }).eq('id', id).select('id'); check(`${role}: update denied`, Boolean(update.error) || update.data.length === 0);
  check(`${role}: discovery admission denied`, Boolean((await client.rpc('admit_preview_discovery')).error));
}
const results = await Promise.all([admin.from('preview_lockers').update({ bio: 'first' }).eq('id', id).eq('revision', 1).select('revision'), admin.from('preview_lockers').update({ bio: 'second' }).eq('id', id).eq('revision', 1).select('revision')]);
results.forEach(result => assert.ifError(result.error)); check('concurrent revision updates have exactly one winner', results.reduce((n, result) => n + result.data.length, 0) === 1);
check('update audit once', sql(`select count(*) from audit_logs where entity_id='${id}' and action='preview.updated'`) === '1');
check('permanent delete denied even to admin', Boolean((await admin.from('preview_lockers').delete().eq('id', id)).error));
for (const url of ['HTTPS://example.com/x','https://example.com:443/x','https://example.com/\u0001','https://user@example.com/x','https://host.local/x']) {
  const result = await admin.from('preview_lockers').update({ headshot_url: url }).eq('id', id); check(`DB rejects unsafe URL ${JSON.stringify(url)}`, result.error?.code === '23514');
  const nested = await admin.from('preview_lockers').update({ videos: [{ ...video, url }] }).eq('id', id); check('nested URL parity', nested.error?.code === '23514');
}
for (const payload of [{ bio: 'invalid\u0001text' }, { videos: [{ ...video, title: 'invalid\u0001title' }] }, { videos: [video, video] }, { videos: [{ ...video, verified: true }] }]) {
  check('DB rejects malformed text/media invariants', Boolean((await admin.from('preview_lockers').update(payload).eq('id', id)).error));
}
// Admission calls no provider; exercise SQL rate gate only.
sql(`update private.preview_discovery_limits set last_started=now()-interval '1 day',day=current_date-1 where user_id='${fixtures.users.staff.id}'`);
const admitted = await admin.rpc('admit_preview_discovery'); assert.ifError(admitted.error); check('bound invoker wrapper admits real authenticated admin', typeof admitted.data === 'string');
const limited = await admin.rpc('admit_preview_discovery'); assert.ifError(limited.error); check('immediate duplicate admission rate-limited', limited.data === null);
// Inject an audit failure only inside a rolled-back local transaction.
const rollback = sql(`begin;
create function pg_temp.reject_preview_audit() returns trigger language plpgsql as $$ begin raise exception 'synthetic audit failure'; end $$;
create trigger synthetic_preview_audit_failure before insert on public.audit_logs for each row execute function pg_temp.reject_preview_audit();
set local role authenticated;
select set_config('request.jwt.claim.sub','${fixtures.users.staff.id}',true);
do $$ begin
  begin update public.preview_lockers set bio='must roll back' where id='${id}'; raise exception 'unexpected success';
  exception when others then if sqlerrm <> 'synthetic audit failure' then raise; end if; end;
  if exists(select 1 from public.preview_lockers where id='${id}' and bio='must roll back') then raise exception 'write survived audit failure'; end if;
end $$;
rollback; select 'audit rollback verified';`);
check('audit failure rolls preview update back', rollback.endsWith('audit rollback verified'));
check('canonical and pipeline tables unchanged', sql('select jsonb_build_array((select count(*) from players),(select count(*) from player_lockers),(select count(*) from gtm_contacts),(select count(*) from onboarding_pipeline_runs))') === baseline);
writeFileSync(`${directory}/db-proof.json`, JSON.stringify({ assertions: proof, previewId: id, slug: content.slug }, null, 2));
console.log(`PRIVATE_PREVIEW_DB_PROOF ${proof.length} assertions; synthetic row retained for inspection`);
