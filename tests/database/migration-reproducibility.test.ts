import { readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readMigration = (name: string) =>
  readFileSync(resolve("supabase/migrations", name), "utf8").toLowerCase();

describe("migration reproducibility contracts", () => {
  it("keeps every active Supabase migration version unique", () => {
    const names = readdirSync(resolve("supabase/migrations"))
      .filter((name) => name.endsWith(".sql"))
      .sort();
    const versions = names.map((name) => name.match(/^(\d{14})_/)?.[1]);

    expect(versions.every(Boolean)).toBe(true);
    expect(new Set(versions).size).toBe(versions.length);
  });

  it("commits the new media provenance enum value before using it", () => {
    const enumMigration = readMigration(
      "20260718000001_media_provenance_scraped_candidate.sql",
    );
    const rightsMigration = readMigration("20260718000002_media_rights_requests.sql");

    expect(enumMigration).toContain(
      "alter type media_provenance add value if not exists 'scraped_candidate'",
    );
    expect(rightsMigration).toContain("where provenance = 'scraped_candidate'");
    expect(rightsMigration).not.toContain("alter type media_provenance");
  });

  it("converts onboarding youtube URL JSON arrays to the database text-array type", () => {
    const publishPatch = readMigration(
      "20260715000000_fix_publish_profile_display_name.sql",
    );

    expect(publishPatch).toContain("jsonb_array_elements_text");
    expect(publishPatch).toContain("array(select");
  });

  it("provides a pinned isolated reset and lint entry without linked mutations", () => {
    const validator = readFileSync(
      resolve("scripts/validate-supabase-foundation.mjs"),
      "utf8",
    );

    expect(validator).toContain('const SUPABASE_CLI_VERSION = "2.114.0"');
    expect(validator).toContain('mkdtempSync(join(tmpdir(), "bltz-supabase-ci-")');
    expect(validator).toContain('const isolatedSupabase = join(isolatedRoot, "supabase")');
    expect(validator).toContain('join(isolatedSupabase, "config.toml")');
    expect(validator).toContain('["db", "reset", "--local", "--no-seed"]');
    expect(validator).toContain("runSqlFile(phase2RlsTest)");
    expect(validator).toContain('`supabase_db_${isolatedProjectId}`');
    expect(validator).toContain('"ON_ERROR_STOP=1"');
    expect(validator).toContain('"lint"');
    expect(validator).toContain('"--fail-on"');
    expect(validator).not.toContain('"--linked"');
    expect(validator).not.toContain('"--project-ref"');
  });

  it("materializes the CLI project under the isolated supabase directory without Docker", () => {
    const result = spawnSync(
      process.execPath,
      [resolve("scripts/validate-supabase-foundation.mjs"), "--verify-layout"],
      { cwd: resolve("."), encoding: "utf8" },
    );

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("Isolated Supabase workspace layout verified");
  });
});
