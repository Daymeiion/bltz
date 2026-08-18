import { existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { parseEnv } from "node:util";

const REQUIRED_NODE_MAJOR = 22;
const EXPECTED_PROJECT_REF = "yevihzsgqagvuulymqum";
const major = Number(process.versions.node.split(".", 1)[0]);

if (major < REQUIRED_NODE_MAJOR) {
  throw new Error(
    `Staging analytics proof requires Node ${REQUIRED_NODE_MAJOR}+; current runtime is ${process.version}`,
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
  if (name.includes("SUPABASE") || name.includes("POSTGRES")) delete process.env[name];
}
for (const name of required) {
  const value = staging[name];
  if (!value) throw new Error(`Missing ${name} in .env.staging.local`);
  process.env[name] = value;
}

const target = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
if (target.hostname.split(".", 1)[0] !== EXPECTED_PROJECT_REF) {
  throw new Error("Refusing analytics proof: .env.staging.local is not the approved staging project");
}
if (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY.startsWith("sb_publishable_")) {
  throw new Error("Refusing analytics proof: staging publishable key has an unexpected format");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY.startsWith("sb_secret_")) {
  throw new Error("Refusing analytics proof: staging server key has an unexpected format");
}

process.env.BLTZ_EXPECTED_SUPABASE_PROJECT_REF = EXPECTED_PROJECT_REF;
process.env.RUN_LIVE_ANALYTICS_TESTS = "1";
process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, "--use-system-ca"].filter(Boolean).join(" ");
const evidencePath = resolve(tmpdir(), `bltz-live-analytics-${process.pid}.json`);
rmSync(evidencePath, { force: true });
process.env.BLTZ_LIVE_ANALYTICS_EVIDENCE_PATH = evidencePath;

const vitest = resolve("node_modules/vitest/vitest.mjs");
const result = spawnSync(process.execPath, [
  "--use-system-ca",
  vitest,
  "run",
  "tests/analytics/ingestion-live.test.ts",
], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

if (result.error) throw result.error;
if (result.status !== 0) {
  rmSync(evidencePath, { force: true });
  process.exit(result.status ?? 1);
}
if (!existsSync(evidencePath)) throw new Error("Live analytics proof did not produce evidence");
const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
rmSync(evidencePath, { force: true });
console.log(`STAGING_ANALYTICS_EVIDENCE=${JSON.stringify(evidence)}`);
