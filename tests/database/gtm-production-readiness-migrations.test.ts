import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const importMigration = readFileSync("supabase/migrations/20260828121000_harden_gtm_contact_import.sql", "utf8");

describe("GTM production-readiness migrations", () => {
  it("binds commit rows to the approved preview and supports the live LinkedIn export", () => {
    expect(importMigration).toContain("rows_sha256");
    expect(importMigration).toContain("public.gtm_import_rows_sha256(p_rows)");
    expect(importMigration).toContain("at most 10000 records");
    expect(importMigration).toContain("v_job.uploaded_by <> v_actor");
  });

  it("keeps the privileged commit implementation outside exposed schemas", () => {
    expect(importMigration).toContain("gtm_private.import_gtm_contacts_impl");
    expect(importMigration).toContain("security definer");
    expect(importMigration).toContain("revoke update on table public.gtm_import_jobs from authenticated");
    expect(importMigration).toContain("security invoker");
  });
});
