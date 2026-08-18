import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const SUPABASE_CLI_VERSION = "2.114.0";
const sourceRoot = resolve("supabase");
const isolatedRoot = mkdtempSync(join(tmpdir(), "bltz-supabase-ci-"));
const isolatedSupabase = join(isolatedRoot, "supabase");
const isolatedProjectId = `bltz-foundation-${process.pid}`;
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const docker = process.platform === "win32" ? "docker.exe" : "docker";
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

mkdirSync(isolatedSupabase);
cpSync(join(sourceRoot, "config.toml"), join(isolatedSupabase, "config.toml"));
cpSync(join(sourceRoot, "migrations"), join(isolatedSupabase, "migrations"), {
  recursive: true,
});
if (existsSync(join(sourceRoot, "tests"))) {
  cpSync(join(sourceRoot, "tests"), join(isolatedSupabase, "tests"), {
    recursive: true,
  });
}

function runSqlFile(path) {
  const container = `supabase_db_${isolatedProjectId}`;
  const result = spawnSync(
    docker,
    [
      "exec",
      "-i",
      container,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-f",
      "-",
    ],
    {
      input: readFileSync(path, "utf8"),
      stdio: ["pipe", "inherit", "inherit"],
      encoding: "utf8",
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${basename(docker)} psql verification exited ${result.status}`);
  }
}

const configPath = join(isolatedSupabase, "config.toml");
const isolatedConfig = readFileSync(configPath, "utf8")
  .replace(/^project_id\s*=.*$/m, `project_id = "${isolatedProjectId}"`)
  .replace(/(\[db\][\s\S]*?\nport\s*=\s*)\d+/, `$1${25000 + (process.pid % 1000)}`)
  .replace(/(shadow_port\s*=\s*)\d+/, `$1${26000 + (process.pid % 1000)}`);
writeFileSync(configPath, isolatedConfig, "utf8");

function verifyIsolatedLayout() {
  const migrationPath = join(isolatedSupabase, "migrations");
  if (!existsSync(configPath) || !existsSync(migrationPath)) {
    throw new Error("isolated Supabase workspace is missing config.toml or migrations");
  }
  const sourceMigrations = readdirSync(join(sourceRoot, "migrations"))
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const isolatedMigrations = readdirSync(migrationPath)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  if (JSON.stringify(sourceMigrations) !== JSON.stringify(isolatedMigrations)) {
    throw new Error("isolated migration copy does not match canonical migrations");
  }
}

verifyIsolatedLayout();

if (process.argv.includes("--verify-layout")) {
  rmSync(isolatedRoot, { recursive: true, force: true });
  console.log("Isolated Supabase workspace layout verified");
  process.exit(0);
}

let startAttempted = false;
let failure;
try {
  startAttempted = true;
  run(["start", "--exclude", excludedServices]);
  run(["db", "reset", "--local", "--no-seed"]);
  const phase2RlsTest = join(isolatedSupabase, "tests", "phase2_tenant_rls.sql");
  if (existsSync(phase2RlsTest)) {
    runSqlFile(phase2RlsTest);
  }
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
