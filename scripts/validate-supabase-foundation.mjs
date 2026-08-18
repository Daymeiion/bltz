import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const SUPABASE_CLI_VERSION = "2.114.0";
const sourceRoot = resolve("supabase");
const isolatedRoot = mkdtempSync(join(tmpdir(), "bltz-supabase-ci-"));
const isolatedProjectId = `bltz-foundation-${process.pid}`;
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const excludedServices = [
  "gotrue",
  "realtime",
  "storage-api",
  "imgproxy",
  "kong",
  "mailpit",
  "postgrest",
  "postgres-meta",
  "studio",
  "edge-runtime",
  "logflare",
  "vector",
  "supavisor",
].join(",");

function run(args) {
  const command = [
    "--yes",
    `supabase@${SUPABASE_CLI_VERSION}`,
    "--workdir",
    isolatedRoot,
    ...args,
  ];
  const result = spawnSync(npx, command, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${basename(npx)} ${command.join(" ")} exited ${result.status}`);
  }
}

if (!readFileSync(join(sourceRoot, "config.toml"), "utf8").includes('[db.migrations]')) {
  throw new Error("supabase/config.toml is missing the migration configuration");
}

cpSync(join(sourceRoot, "config.toml"), join(isolatedRoot, "config.toml"));
cpSync(join(sourceRoot, "migrations"), join(isolatedRoot, "migrations"), {
  recursive: true,
});

const configPath = join(isolatedRoot, "config.toml");
const isolatedConfig = readFileSync(configPath, "utf8")
  .replace(/^project_id\s*=.*$/m, `project_id = "${isolatedProjectId}"`)
  .replace(/(\[db\][\s\S]*?\nport\s*=\s*)\d+/, `$1${25000 + (process.pid % 1000)}`)
  .replace(/(shadow_port\s*=\s*)\d+/, `$1${26000 + (process.pid % 1000)}`);
writeFileSync(configPath, isolatedConfig, "utf8");

let startAttempted = false;
let failure;
try {
  startAttempted = true;
  run(["start", "--exclude", excludedServices]);
  run(["db", "reset", "--local", "--no-seed"]);
  run([
    "db",
    "lint",
    "--local",
    "--schema",
    "public",
    "--level",
    "error",
    "--fail-on",
    "error",
  ]);
} catch (error) {
  failure = error;
} finally {
  if (startAttempted) {
    try {
      run(["stop", "--no-backup"]);
    } catch (error) {
      console.error("Failed to stop isolated Supabase instance", error);
      failure ??= error;
    }
  }
  rmSync(isolatedRoot, { recursive: true, force: true });
}

if (failure) throw failure;
