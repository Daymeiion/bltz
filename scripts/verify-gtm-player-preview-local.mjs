// Local-only, synthetic verification. This script discovers only the loopback
// Supabase stack and refuses hosted URLs before creating any fixture records.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const settings = JSON.parse(execFileSync(process.execPath, ["node_modules/supabase/dist/supabase.js", "status", "-o", "json"], { encoding: "utf8" }));
assert.match(settings.API_URL ?? "", /^http:\/\/127\.0\.0\.1:\d+$/);
assert.ok(settings.PUBLISHABLE_KEY && settings.SECRET_KEY);

const sql = (query) => execFileSync(
  "docker",
  ["exec", "-i", "supabase_db_bltz", "psql", "-X", "-U", "postgres", "-d", "postgres", "-qAt", "-v", "ON_ERROR_STOP=1"],
  { input: /;\s*$/.test(query) ? query : `${query};`, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
).trim();
const proof = [];
const check = (name, condition) => { assert.ok(condition, name); proof.push(name); console.log(`PASS ${name}`); };

const service = createClient(settings.API_URL, settings.SECRET_KEY, { auth: { persistSession: false } });
const makeUser = async (label) => {
  const email = `gtm-preview-${label}-${randomUUID()}@bltz.invalid`;
  const password = `LocalQA-${randomUUID()}!`;
  const result = await service.auth.admin.createUser({ email, password, email_confirm: true });
  assert.ifError(result.error);
  return { id: result.data.user.id, email, password };
};
const adminUser = await makeUser("admin");
const ordinaryUser = await makeUser("ordinary");
sql(`insert into public.platform_role_assignments(user_id,role,assignment_reason)
values ('${adminUser.id}','super_admin','synthetic local GTM preview verification')`);

const signIn = async (fixture) => {
  const client = createClient(settings.API_URL, settings.PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const result = await client.auth.signInWithPassword({ email: fixture.email, password: fixture.password });
  assert.ifError(result.error);
  return client;
};
const admin = await signIn(adminUser);
const ordinary = await signIn(ordinaryUser);

const gsisId = `qa-${randomUUID()}`;
const displayName = `${"A".repeat(49)} B`;
const baseline = sql("select jsonb_build_array((select count(*) from players),(select count(*) from player_lockers),(select count(*) from claim_tokens),(select count(*) from preview_locker_viewer_grants))");
sql(`insert into public.nfl_players(
  gsis_id,display_name,position,height_in,weight_lbs,headshot_url,college_name,jersey_number
) values (
  '${gsisId}','${displayName}','DB',72,201,'https://example.com/synthetic.jpg','Fixture University',27
);
insert into public.gtm_player_prospects(gsis_id,selected_by)
values ('${gsisId}','${adminUser.id}')`);

check("relationship RLS enabled", sql("select relrowsecurity from pg_class where oid='public.gtm_player_preview_lockers'::regclass") === "t");
check("ordinary users have no direct relationship rows", (await ordinary.from("gtm_player_preview_lockers").select("gsis_id")).data?.length === 0);
check("ordinary users cannot create cohort previews", Boolean((await ordinary.rpc("open_or_create_gtm_player_preview", { p_gsis_id: gsisId })).error));

const attempts = await Promise.all([
  admin.rpc("open_or_create_gtm_player_preview", { p_gsis_id: gsisId }),
  admin.rpc("open_or_create_gtm_player_preview", { p_gsis_id: gsisId }),
]);
attempts.forEach((attempt) => assert.ifError(attempt.error));
const ids = attempts.map((attempt) => attempt.data.id);
check("concurrent double-clicks reopen exactly one linked preview", new Set(ids).size === 1 && attempts.filter((attempt) => attempt.data.created === true).length === 1);
const previewId = ids[0];
const preview = await admin.from("preview_lockers").select("id,slug,full_name,position,level,school,jersey,height_in,weight_lbs,headshot_url,bio,revision").eq("id", previewId).single();
assert.ifError(preview.error);
check("Player Master scalar types prefill the private preview exactly", preview.data.full_name === displayName && preview.data.position === "DB" && preview.data.level === "pro" && preview.data.school === "Fixture University" && preview.data.jersey === "27" && preview.data.height_in === 72 && preview.data.weight_lbs === 201 && preview.data.headshot_url === "https://example.com/synthetic.jpg" && preview.data.bio === "");
check("truncated slug has no trailing-name double hyphen", preview.data.slug === `${"a".repeat(49)}-${sql(`select left(md5('${gsisId}'),20)`)}` && !preview.data.slug.includes("--"));
check("link and audit commit once", sql(`select jsonb_build_array((select count(*) from gtm_player_preview_lockers where gsis_id='${gsisId}'),(select count(*) from audit_logs where entity_id='${previewId}' and action='preview.gtm_linked'))`) === "[1, 1]");
check("create does not grant an automatic viewer", sql(`select count(*) from preview_locker_viewer_grants where preview_locker_id='${previewId}'`) === "0");

const stale = await admin.rpc("complete_gtm_player_preview", { p_preview_locker_id: previewId, p_revision: 99 });
assert.ifError(stale.error);
check("stale completion revision conflicts without persisting", stale.data === "revision_conflict" && sql(`select completed_revision is null from gtm_player_preview_lockers where preview_locker_id='${previewId}'`) === "t");
const completed = await admin.rpc("complete_gtm_player_preview", { p_preview_locker_id: previewId, p_revision: 1 });
assert.ifError(completed.error);
check("explicit completion binds to revision one", completed.data === "completed" && sql(`select completed_revision from gtm_player_preview_lockers where preview_locker_id='${previewId}'`) === "1");

const noOp = await admin.from("preview_lockers").update({ bio: "" }).eq("id", previewId).eq("revision", 1).select("revision").single();
assert.ifError(noOp.error);
check("identical persisted save carries completion to the stamped revision", noOp.data.revision === 2 && sql(`select completed_revision from gtm_player_preview_lockers where preview_locker_id='${previewId}'`) === "2");
const changed = await admin.from("preview_lockers").update({ bio: "Changed persisted content" }).eq("id", previewId).eq("revision", 2).select("revision").single();
assert.ifError(changed.error);
check("persisted content change clears completion", changed.data.revision === 3 && sql(`select completed_revision is null and completed_by is null and completed_at is null from gtm_player_preview_lockers where preview_locker_id='${previewId}'`) === "t");

const recompleted = await admin.rpc("complete_gtm_player_preview", { p_preview_locker_id: previewId, p_revision: 3 });
assert.ifError(recompleted.error);
const partialConstraint = sql(`do $$ begin
  begin
    update public.gtm_player_preview_lockers
    set completed_revision=null,completed_by='${adminUser.id}',completed_at=clock_timestamp()
    where preview_locker_id='${previewId}';
    raise exception 'partial completion metadata unexpectedly accepted';
  exception when check_violation then null;
  end;
end $$;
select completed_revision from public.gtm_player_preview_lockers where preview_locker_id='${previewId}'`);
check("completion constraint rejects partially populated metadata", partialConstraint === "3");
check("completion and invalidation are audited", Number(sql(`select count(*) from audit_logs where entity_id='${previewId}' and action in ('preview.completed','preview.completion.invalidated')`)) === 3);
check("canonical Locker, claim, and viewer tables remain unchanged", sql("select jsonb_build_array((select count(*) from players),(select count(*) from player_lockers),(select count(*) from claim_tokens),(select count(*) from preview_locker_viewer_grants))") === baseline);

console.log(`GTM_PLAYER_PREVIEW_DB_PROOF ${proof.length} assertions; disposable local synthetic rows retained`);
