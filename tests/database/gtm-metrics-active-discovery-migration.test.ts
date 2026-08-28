import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260825220000_fix_gtm_metrics_active_discovery.sql",
  "utf8",
);

describe("GTM active-contact discovery metrics migration", () => {
  it("joins every discovery aggregate to the active contact projection", () => {
    expect(migration).toContain("active_contacts as");
    expect(migration).toContain("active_discovery as");
    expect(migration).toContain("join active_contacts contact on contact.id = discovery.contact_id");
    expect(migration).not.toMatch(/from public\.gtm_customer_discovery\s+where/);
  });

  it("preserves the internal-admin, invoker, and grant boundary", () => {
    expect(migration).toContain("security invoker");
    expect(migration).toContain("public.is_internal_admin()");
    expect(migration).toContain("to authenticated, service_role");
  });
});
