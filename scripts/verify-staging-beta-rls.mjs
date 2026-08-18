import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";

const REQUIRED_NODE_MAJOR = 22;
const EXPECTED_PROJECT_REF = "yevihzsgqagvuulymqum";
const major = Number(process.versions.node.split(".", 1)[0]);

if (major < REQUIRED_NODE_MAJOR) {
  throw new Error(
    `Staging RLS proof requires Node ${REQUIRED_NODE_MAJOR}+; current runtime is ${process.version}`,
  );
}

const stagingPath = resolve(".env.staging.local");
const staging = parseEnv(readFileSync(stagingPath, "utf8"));
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

for (const name of Object.keys(process.env)) {
  if (name.includes("SUPABASE") || name.includes("POSTGRES") || name.startsWith("RLS_TEST_")) {
    delete process.env[name];
  }
}
for (const name of required) {
  const value = staging[name];
  if (!value) throw new Error(`Missing ${name} in .env.staging.local`);
  process.env[name] = value;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const projectRef = new URL(url).hostname.split(".", 1)[0];
if (projectRef !== EXPECTED_PROJECT_REF) {
  throw new Error("Refusing RLS proof: .env.staging.local is not the approved staging project");
}
if (!anonKey.startsWith("sb_publishable_")) {
  throw new Error("Refusing RLS proof: staging publishable key has an unexpected format");
}
if (!serviceKey.startsWith("sb_secret_")) {
  throw new Error("Refusing RLS proof: staging server key has an unexpected format");
}

const runId = randomUUID().slice(0, 8);
const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const browser = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const fixtures = [
  { key: "RLS_TEST_ATHLETE_A_JWT", role: "player", label: "athleteA" },
  { key: "RLS_TEST_ATHLETE_B_JWT", role: "player", label: "athleteB" },
  { key: "RLS_TEST_NON_ADMIN_JWT", role: "fan", label: "nonAdmin" },
  { key: "RLS_TEST_PLATFORM_ADMIN_JWT", role: "admin", label: "platformAdmin" },
];

const created = [];

async function cleanup() {
  for (const row of created) {
    await admin.from("profiles").delete().eq("id", row.id);
    await admin.auth.admin.deleteUser(row.id);
  }
  const leftover = [];
  for (const row of created) {
    const { data: profile } = await admin.from("profiles").select("id").eq("id", row.id).maybeSingle();
    const { data: userData } = await admin.auth.admin.getUserById(row.id);
    leftover.push({
      label: row.label,
      profile: Boolean(profile),
      authUser: Boolean(userData.user),
    });
  }
  return leftover;
}

async function createFixture(spec) {
  const email = `staging-rls-${runId}-${spec.label.toLowerCase()}@bltz.test`;
  const password = randomBytes(18).toString("base64url");
  const createdUser = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: `RLS ${spec.label}`,
      purpose: "staging-rls-disposable",
      runId,
    },
  });
  if (createdUser.error || !createdUser.data.user) {
    throw new Error(`Failed to create ${spec.label}: ${createdUser.error?.message ?? "unknown"}`);
  }
  const id = createdUser.data.user.id;
  created.push({ id, label: spec.label, email });
  const profile = await admin.from("profiles").upsert({
    id,
    email,
    role: spec.role,
    display_name: `RLS ${spec.label}`,
  }, { onConflict: "id" }).select("role").maybeSingle();
  if (profile.error) throw new Error(`Failed to set ${spec.label} profile: ${profile.error.message}`);
  const session = await browser.auth.signInWithPassword({ email, password });
  const token = session.data.session?.access_token;
  if (session.error || !token) {
    throw new Error(`Failed to sign in ${spec.label}: ${session.error?.message ?? "missing token"}`);
  }
  await browser.auth.signOut();
  process.env[spec.key] = token;
  return { label: spec.label, role: spec.role, userIdPrefix: id.slice(0, 8) };
}

let identities;
let leftover;
let testStatus = 1;

try {
  identities = [];
  for (const spec of fixtures) identities.push(await createFixture(spec));

  process.env.RUN_LIVE_RLS_TESTS = "1";
  process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, "--use-system-ca"].filter(Boolean).join(" ");
  const vitest = resolve("node_modules/vitest/vitest.mjs");
  const result = spawnSync(process.execPath, [
    "--use-system-ca",
    vitest,
    "run",
    "tests/database/beta-rls-live.test.ts",
  ], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  testStatus = result.status ?? 1;
} finally {
  leftover = await cleanup();
  for (const name of Object.keys(process.env)) {
    if (name.startsWith("RLS_TEST_")) delete process.env[name];
  }
}

const evidence = {
  projectRef,
  runId,
  identities,
  cleanup: leftover,
  leftoverRows: leftover.filter((row) => row.profile || row.authUser).length,
  testsExit: testStatus,
};
console.log(`STAGING_RLS_EVIDENCE=${JSON.stringify(evidence)}`);
if (testStatus !== 0 || evidence.leftoverRows !== 0) process.exit(testStatus || 1);
