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
  "RLS_TEST_PLATFORM_ADMIN_EMAIL",
  "RLS_TEST_PLATFORM_ADMIN_PASSWORD",
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
  { key: "RLS_TEST_LEGACY_ADMIN_JWT", role: "admin", label: "legacyAdmin" },
];

const created = [];

async function cleanup() {
  const errors = [];
  for (const row of created) {
    const profileDelete = await admin.from("profiles").delete().eq("id", row.id);
    if (profileDelete.error) {
      errors.push(`${row.label} profile delete: ${profileDelete.error.message}`);
    }
    const userDelete = await admin.auth.admin.deleteUser(row.id);
    if (userDelete.error) {
      errors.push(`${row.label} Auth user delete: ${userDelete.error.message}`);
    }
  }
  const leftover = [];
  for (const row of created) {
    const profileCheck = await admin.from("profiles").select("id").eq("id", row.id).maybeSingle();
    if (profileCheck.error) {
      errors.push(`${row.label} profile cleanup verification: ${profileCheck.error.message}`);
    }
    const userCheck = await admin.auth.admin.getUserById(row.id);
    const authUserMissing = userCheck.error?.status === 404;
    if (userCheck.error && !authUserMissing) {
      errors.push(`${row.label} Auth cleanup verification: ${userCheck.error.message}`);
    }
    leftover.push({
      label: row.label,
      profile: Boolean(profileCheck.data),
      authUser: Boolean(userCheck.data?.user),
    });
  }
  return { rows: leftover, errors };
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

async function signInAssignedPlatformAdmin() {
  const email = process.env.RLS_TEST_PLATFORM_ADMIN_EMAIL;
  const password = process.env.RLS_TEST_PLATFORM_ADMIN_PASSWORD;
  const session = await browser.auth.signInWithPassword({ email, password });
  const user = session.data.user;
  const token = session.data.session?.access_token;
  if (session.error || !user || !token) {
    throw new Error(
      `Failed to sign in assigned platform admin: ${session.error?.message ?? "missing session"}`,
    );
  }

  const assignment = await admin
    .from("platform_role_assignments")
    .select("id")
    .eq("user_id", user.id)
    .eq("role", "super_admin")
    .is("revoked_at", null)
    .maybeSingle();
  if (assignment.error || !assignment.data) {
    throw new Error(
      `Assigned platform admin is missing an active super_admin assignment: ${assignment.error?.message ?? "not found"}`,
    );
  }

  process.env.RLS_TEST_PLATFORM_ADMIN_JWT = token;
  await browser.auth.signOut();
  return {
    label: "platformAdmin",
    role: "super_admin",
    userIdPrefix: user.id.slice(0, 8),
  };
}

let identities;
let cleanupResult;
let testStatus = 1;

try {
  identities = [];
  for (const spec of fixtures) identities.push(await createFixture(spec));
  identities.push(await signInAssignedPlatformAdmin());
  delete process.env.RLS_TEST_PLATFORM_ADMIN_EMAIL;
  delete process.env.RLS_TEST_PLATFORM_ADMIN_PASSWORD;

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
  cleanupResult = await cleanup();
  for (const name of Object.keys(process.env)) {
    if (name.startsWith("RLS_TEST_")) delete process.env[name];
  }
}

const evidence = {
  projectRef,
  runId,
  identities,
  cleanup: cleanupResult?.rows ?? [],
  cleanupErrors: cleanupResult?.errors ?? ["cleanup did not complete"],
  leftoverRows: (cleanupResult?.rows ?? []).filter((row) => row.profile || row.authUser).length,
  testsExit: testStatus,
};
console.log(`STAGING_RLS_EVIDENCE=${JSON.stringify(evidence)}`);
if (testStatus !== 0 || evidence.leftoverRows !== 0 || evidence.cleanupErrors.length !== 0) {
  process.exit(testStatus || 1);
}
