import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve("lib/supabase/migrations/20260816000000_beta_intelligence_foundation.sql"),
  "utf8",
).toLowerCase();

describe("beta intelligence migration contract", () => {
  it.each([
    "analytics_events",
    "beta_participants",
    "athlete_feedback",
    "athlete_insights",
    "athlete_baseline_snapshots",
  ])("creates and enables RLS for %s", (table) => {
    expect(migration).toContain(`create table if not exists public.${table}`);
    expect(migration).toContain(`alter table public.${table} enable row level security`);
  });

  it("does not grant direct analytics inserts to browser roles", () => {
    expect(migration).not.toMatch(/policy[^;]+analytics_events[^;]+for insert/);
    expect(migration).not.toMatch(/grant insert on[^;]+analytics_events/);
  });

  it("limits raw analytics reads to the internal-admin policy", () => {
    expect(migration).toContain('policy "internal admins can read analytics events"');
    expect(migration).toContain("using (public.is_internal_admin())");
  });
});
