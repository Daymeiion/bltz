// Isolated PostgreSQL proof; no hosted connection, real player or external request.
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const db = new PGlite();
const admin = '00000000-0000-4000-8000-000000000001';
const viewer = '00000000-0000-4000-8000-000000000002';
const other = '00000000-0000-4000-8000-000000000003';
const id = '00000000-0000-4000-8000-000000000004';
const article = { id: 'article', sourceUrl: 'https://publisher.example.com/original', visible: false, headline: 'Fixture player interview', publisher: 'Publisher', articleUrl: 'https://publisher.example.com/original', imageUrl: null, summary: 'Short summary', publishedAt: '2026-10-16' };
const product = { id: 'card', title: 'Fixture trading card', category: 'trading_card', productUrl: 'https://shop.example.com/card', imageUrl: null, retailer: 'Shop', priceLabel: '$12', visible: true };
try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema private; create table auth.users(id uuid primary key,email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated;
    create function public.is_internal_admin() returns boolean language sql stable as $$ select auth.uid()='${admin}'::uuid $$;
    create table public.audit_logs(id bigserial primary key,actor_user_id uuid,action text,entity_type text,entity_id text,actor_role_scope text,risk_level text,previous_values jsonb,new_values jsonb,request_metadata jsonb);
    insert into auth.users values ('${admin}','admin@example.test'),('${viewer}','viewer@example.test'),('${other}','other@example.test');`);
  const apply = async file => db.exec(fs.readFileSync(`supabase/migrations/${file}`, 'utf8'));
  await apply('20260831161831_private_preview_lockers.sql');
  await apply('20260901184112_private_preview_assigned_viewer.sql');
  await db.exec(`alter table public.preview_lockers add column career_stats jsonb not null default '[]';
    grant select(career_stats),insert(career_stats),update(career_stats) on public.preview_lockers to authenticated;
    create function public.preview_conversion(uuid,text,uuid,uuid,jsonb) returns jsonb language sql as $$ select '{}'::jsonb $$;`);
  for (const file of ['20260914213500_preview_award_sources.sql', '20260915003000_preview_award_descriptions.sql', '20260916193000_private_preview_cfb_csv.sql', '20260922190000_preview_awards_social.sql', '20260929120000_preview_photo_room_banner.sql', '20260929195816_preview_photo_room_banner_upload.sql', '20261011170240_preview_pfr_csv.sql']) await apply(file);
  const legacyId = '00000000-0000-4000-8000-000000000006';
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${admin}',false);`);
  await db.query('insert into preview_lockers(id,slug,full_name) values ($1,$2,$3)', [legacyId, 'legacy-media', 'Legacy Media']);
  await db.exec('reset role');
  await apply('20261017010958_preview_media_curation.sql');
  await db.exec('create table public.players(id uuid primary key, dob date); create table public.onboarding_pipeline_runs(id uuid); create table public.claim_tokens(id uuid);');
  const baseline = fs.readFileSync('supabase/migrations/20260701000000_production_schema_baseline.sql', 'utf8');
  await db.exec(baseline.match(/CREATE OR REPLACE FUNCTION "public"\."publish_onboarding_run"[\s\S]*?\$\$;/)[0]);
  await db.exec('revoke all on function public.publish_onboarding_run(uuid,uuid,jsonb,jsonb,text,jsonb,uuid,text) from public,anon,authenticated; grant execute on function public.publish_onboarding_run(uuid,uuid,jsonb,jsonb,text,jsonb,uuid,text) to service_role;');
  await apply('20261018030520_athlete_birthdate_high_school.sql');
  await apply('20261018184205_preview_merchandise_image_uploads.sql');
  assert.deepEqual((await db.query('select dob,high_school from preview_lockers where id=$1', [legacyId])).rows[0], {dob: null, high_school: null});
  const publish = (await db.query("select pg_get_functiondef('public.publish_onboarding_run(uuid,uuid,jsonb,jsonb,text,jsonb,uuid,text)'::regprocedure) definition")).rows[0].definition;
  assert.match(publish, /dob, high_school, height_in/);
  assert.match(publish, /else high_school end/);
  assert.equal((await db.query("select has_function_privilege('authenticated','public.publish_onboarding_run(uuid,uuid,jsonb,jsonb,text,jsonb,uuid,text)','execute') allowed")).rows[0].allowed, false);
  assert.deepEqual((await db.query('select article_edits,merchandise from preview_lockers where id=$1', [legacyId])).rows[0], { article_edits: [], merchandise: [] });
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${admin}',false);`);
  await db.query('insert into preview_lockers(id,slug,full_name,article_edits,merchandise) values ($1,$2,$3,$4,$5)', [id, 'media-fixture', 'Media Fixture', JSON.stringify([article]), JSON.stringify([product])]);
  const read = () => db.query('select revision,article_edits,merchandise from preview_lockers where id=$1', [id]);
  assert.deepEqual((await read()).rows[0].merchandise, [product]);
  await db.query('update preview_lockers set article_edits=$1 where id=$2 and revision=1', [JSON.stringify([{ ...article, visible: true }]), id]);
  assert.equal((await read()).rows[0].revision, 2);
  assert.equal((await db.query("update preview_lockers set merchandise='[]' where id=$1 and revision=1 returning id", [id])).rows.length, 0);
  await db.exec('reset role');
  const audit = (await db.query('select previous_values,new_values from audit_logs order by id desc limit 1')).rows[0];
  assert.equal(audit.previous_values.article_edits[0].visible, false);
  assert.equal(audit.new_values.article_edits[0].visible, true);
  assert.deepEqual(audit.new_values.merchandise, [product]);
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${admin}',false);`);
  await db.query('update preview_lockers set dob=$1,high_school=$2 where id=$3', ['1986-07-09', 'Los Alamitos High School', id]);
  assert.deepEqual((await db.query('select dob::text,high_school from preview_lockers where id=$1', [id])).rows[0], {dob:'1986-07-09', high_school:'Los Alamitos High School'});
  for (const invalid of ['1800-01-01','2999-01-01','1986-02-30']) await assert.rejects(db.query('update preview_lockers set dob=$1 where id=$2', [invalid,id]));
  for (const invalid of ['', 'x'.repeat(161), 'School\nOther']) await assert.rejects(db.query('update preview_lockers set high_school=$1 where id=$2', [invalid,id]));
  await db.exec('reset role');
  const bioAudit = (await db.query('select previous_values,new_values from audit_logs order by id desc limit 1')).rows[0];
  assert.equal(bioAudit.previous_values.high_school,null);
  assert.equal(bioAudit.new_values.high_school,'Los Alamitos High School');
  await db.query('insert into preview_locker_viewer_grants(preview_locker_id,viewer_user_id) values ($1,$2)', [id, viewer]);
  await db.exec('set role anon');
  await assert.rejects(read(), /permission denied/);
  await db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub','${other}',false);`);
  assert.equal((await read()).rows.length, 0);
  await assert.rejects(db.query('insert into preview_lockers(slug,full_name,merchandise) values ($1,$2,$3)', ['denied-media', 'Denied', JSON.stringify([product])]));
  await db.exec(`select set_config('request.jwt.claim.sub','${viewer}',false);`);
  assert.deepEqual((await read()).rows[0].article_edits, [{ ...article, visible: true }]);
  assert.equal((await db.query("update preview_lockers set merchandise='[]' returning id")).rows.length, 0);
  await assert.rejects(db.query("select preview_conversion_create($1,'{}','{}')", [id]), /forbidden/);
  await db.exec(`select set_config('request.jwt.claim.sub','${admin}',false);`);
  for (const invalid of [{ ...product, productUrl: 'javascript:alert(1)' }, { ...product, visible: 'true' }, { ...product, category: 'payments' }, { ...product, title: '' }, { ...product, privateNotes: 'never publish' }]) {
    await assert.rejects(db.query('update preview_lockers set merchandise=$1 where id=$2', [JSON.stringify([invalid]), id]));
  }
  for (const invalid of [{ ...article, publishedAt: '2026-02-30' }, { ...article, articleUrl: 'https://user:secret@example.com/story' }, { ...article, headline: '' }, { ...article, visible: null }]) {
    await assert.rejects(db.query('update preview_lockers set article_edits=$1 where id=$2', [JSON.stringify([invalid]), id]));
  }
  await assert.rejects(db.query('update preview_lockers set merchandise=$1', [JSON.stringify(Array(41).fill(product))]));
  await assert.rejects(db.query('update preview_lockers set article_edits=$1', [JSON.stringify([article, article])]));
  const atomicId = '00000000-0000-4000-8000-000000000005';
  const content = { slug: 'media-atomic', full_name: 'Media Atomic', dob: '1986-07-09', high_school: 'Los Alamitos High School', bio: '', schools: [], pro_teams: [], awards: [], social: [], career_stats: [], cfb_stats: [], pfr_stats: [], videos: [], photos: [], article_edits: [article], merchandise: [product], photo_room_banner_url: null, photo_room_banner_link: null, photo_room_banner_storage_path: null };
  await db.query("select preview_conversion_create($1,$2,'{}')", [atomicId, JSON.stringify(content)]);
  await db.query("select preview_conversion_create($1,$2,'{}')", [atomicId, JSON.stringify(content)]);
  assert.deepEqual((await db.query('select merchandise from preview_lockers where id=$1', [atomicId])).rows[0].merchandise, [product]);
  await assert.rejects(db.query("select preview_conversion_create($1,$2,'{}')", [atomicId, JSON.stringify({ ...content, article_edits: [] })]), /preview conflict/);
  await assert.rejects(db.query("select preview_conversion_create($1,$2,'{}')", [atomicId, JSON.stringify({ ...content, merchandise: [] })]), /preview conflict/);
  await assert.rejects(db.query("select preview_conversion_create($1,$2,'{}')", [atomicId, JSON.stringify({ ...content, high_school: 'Different School' })]), /preview conflict/);
  assert.deepEqual((await db.query('select dob::text,high_school from preview_lockers where id=$1', [atomicId])).rows[0], {dob:content.dob,high_school:content.high_school});
  await db.exec('reset role');
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${admin}',false);`);
  const uploadedProduct={...product,imageUrl:'https://shop.example.com/default.png',imageStoragePath:`${id}/photos/00000000-0000-4000-8000-000000000007.png`};
  await db.query('update preview_lockers set merchandise=$1 where id=$2',[JSON.stringify([uploadedProduct]),id]);
  assert.deepEqual((await read()).rows[0].merchandise,[uploadedProduct]);
  for(const imageStoragePath of [`${other}/photos/00000000-0000-4000-8000-000000000007.png`,`${id}/videos/00000000-0000-4000-8000-000000000007.mp4`,'../foreign.png',42]) {
    await assert.rejects(db.query('update preview_lockers set merchandise=$1 where id=$2',[JSON.stringify([{...uploadedProduct,imageStoragePath}]),id]));
  }
  await db.query('update preview_lockers set merchandise=$1 where id=$2',[JSON.stringify([{...uploadedProduct,imageStoragePath:null}]),id]);
  assert.equal((await read()).rows[0].merchandise[0].imageUrl,uploadedProduct.imageUrl);
  await db.exec('reset role');
  assert.ok((await db.query("select count(*)::int n from audit_logs where new_values->'merchandise'->0->>'imageStoragePath'=$1",[uploadedProduct.imageStoragePath])).rows[0].n>0);
  await db.exec('reset role');
  if (process.argv.includes('--generate-types')) {
    const columns = (await db.query("select column_name,data_type,is_nullable,column_default from information_schema.columns where table_schema='public' and table_name='preview_lockers' order by column_name")).rows;
    const fields = mode => columns.map(column => {
      const type = column.data_type === 'jsonb' ? 'Json' : ['smallint', 'integer', 'bigint', 'numeric'].includes(column.data_type) ? 'number' : column.data_type === 'boolean' ? 'boolean' : 'string';
      const optional = mode === 'Update' || (mode === 'Insert' && (column.column_default !== null || column.is_nullable === 'YES'));
      return `          ${column.column_name}${optional ? '?' : ''}: ${type}${column.is_nullable === 'YES' ? ' | null' : ''}`;
    }).join('\n');
    const file = 'types/preview-lockers.generated.ts';
    const original = fs.readFileSync(file, 'utf8');
    const replacement = `preview_lockers: {\n${['Row', 'Insert', 'Update'].map(mode => `        ${mode}: {\n${fields(mode)}\n        }`).join('\n')}\n        Relationships: []\n      }`;
    fs.writeFileSync(file, original.replace(/preview_lockers: \{[\s\S]*?Relationships: \[\]\s*\}/, replacement)
      .replace(/^\/\/ Preview table regenerated[^\n]*/, '// Preview table regenerated from isolated PostgreSQL information_schema by scripts/verify-preview-media.mjs; remaining declarations retain their Supabase CLI provenance.'));
    const bioColumn = (await db.query("select data_type,is_nullable from information_schema.columns where table_schema='public' and table_name='players' and column_name='high_school'")).rows[0];
    assert.deepEqual(bioColumn, {data_type:'text',is_nullable:'YES'});
    const databaseFile = 'types/database.generated.ts';
    let database = fs.readFileSync(databaseFile, 'utf8');
    database = database.replace(/(      players: \{[\s\S]*?        Relationships:)/, block => block.replace(/          high_school\??: string \| null\r?\n/g, '').replace(/(          height_in(\?)?: number \| null\r?\n)/g, (line, _whole, optional) => `${line}          high_school${optional ?? ''}: string | null\n`));
    if (!database.startsWith('// players.high_school')) database = '// players.high_school regenerated from PostgreSQL information_schema by scripts/verify-preview-media.mjs; remaining schema retains Supabase CLI provenance.\n' + database;
    fs.writeFileSync(databaseFile, database);
  }
  console.log('PASS: media persistence, visibility edits, RLS, audit history, revision conflicts, bounded metadata, enrollment/retry, generated columns.');
} finally { await db.close(); }
