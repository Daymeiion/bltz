// Creates disposable loopback-only browser fixtures. Never accepts hosted URLs.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const settings = JSON.parse(execFileSync(process.execPath, ["node_modules/supabase/dist/supabase.js", "status", "-o", "json"], { encoding: "utf8" }));
assert.match(settings.API_URL ?? "", /^http:\/\/127\.0\.0\.1:\d+$/);
assert.ok(settings.SECRET_KEY);
const service = createClient(settings.API_URL, settings.SECRET_KEY, { auth: { persistSession: false } });
const token = randomUUID();
const email = `gtm-preview-browser-${token}@bltz.invalid`;
const password = `LocalBrowserQA-${token}!`;
const created = await service.auth.admin.createUser({ email, password, email_confirm: true });
assert.ifError(created.error);
const userId = created.data.user.id;
const gsisId = `browser-${token}`;
const sql = `insert into public.platform_role_assignments(user_id,role,assignment_reason)
values ('${userId}','super_admin','synthetic local browser proof');
insert into public.nfl_players(gsis_id,display_name,position,height_in,weight_lbs,college_name,jersey_number,status)
values ('${gsisId}','Browser Proof Athlete','WR',74,208,'Fixture University',12,'active');
insert into public.gtm_player_prospects(gsis_id,selected_by)
values ('${gsisId}','${userId}');`;
execFileSync("docker", ["exec", "-i", "supabase_db_bltz", "psql", "-X", "-U", "postgres", "-d", "postgres", "-qAt", "-v", "ON_ERROR_STOP=1"], { input: sql, stdio: ["pipe", "pipe", "pipe"] });
console.log(JSON.stringify({ email, password, gsisId, apiUrl: settings.API_URL, publishableKey: settings.PUBLISHABLE_KEY }));
