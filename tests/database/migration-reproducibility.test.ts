import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readMigration = (name: string) =>
  readFileSync(resolve("lib/supabase/migrations", name), "utf8").toLowerCase();

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
});
