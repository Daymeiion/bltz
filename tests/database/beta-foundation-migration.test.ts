import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const foundation = readFileSync(
  resolve("lib/supabase/migrations/20260816000000_beta_intelligence_foundation.sql"),
  "utf8",
).toLowerCase();
const hardening = readFileSync(
  resolve("lib/supabase/migrations/20260817000000_beta_analytics_qa_hardening.sql"),
  "utf8",
).toLowerCase();
const statements = (sql: string) => sql.split(";").map((value) => value.replace(/\s+/g, " ").trim());

describe("beta intelligence migration contract", () => {
  it.each([
    "analytics_events", "beta_participants", "athlete_feedback",
    "athlete_insights", "athlete_baseline_snapshots",
  ])("creates and enables RLS for %s", (table) => {
    expect(foundation).toContain(`create table if not exists public.${table}`);
    expect(foundation).toContain(`alter table public.${table} enable row level security`);
  });

  it("has no direct analytics insert policy or browser-role insert grant", () => {
    const analyticsPolicies = statements(foundation).filter((statement) =>
      statement.startsWith("create policy") && statement.includes("on public.analytics_events"));
    expect(analyticsPolicies).toHaveLength(1);
    expect(analyticsPolicies[0]).toContain("for select");
    expect(analyticsPolicies[0]).not.toContain("for insert");
    expect(statements(foundation).some((statement) =>
      statement.startsWith("grant insert") && statement.includes("analytics_events"))).toBe(false);
  });

  it("limits raw analytics reads to the internal-admin predicate", () => {
    const readPolicy = statements(foundation).find((statement) =>
      statement.startsWith('create policy "internal admins can read analytics events"'));
    expect(readPolicy).toContain("for select");
    expect(readPolicy).toContain("using (public.is_internal_admin())");
  });

  it("makes the stable event UUID required while retaining the unique constraint", () => {
    expect(foundation).toContain("client_event_id uuid unique");
    expect(hardening).toContain("alter column client_event_id set not null");
  });

  it("keeps throttle state and aggregate RPCs service-role only", () => {
    expect(hardening).toContain("alter table public.analytics_rate_limit_buckets enable row level security");
    expect(hardening).toContain("revoke all on table public.analytics_rate_limit_buckets from public, anon, authenticated");
    expect(hardening).toContain("to service_role");
    expect(hardening).toContain("get_beta_intelligence_dashboard");
    expect(hardening).toContain("consume_analytics_rate_limit");
  });

  it("filters the aggregate at the participant source and supports athlete drill-down", () => {
    expect(hardening).toContain("p_since is null or bp.invited_at >= p_since");
    expect(hardening).toContain("p_cohort is null or bp.cohort = p_cohort");
    expect(hardening).toContain("p_status is null or bp.status::text = p_status");
    expect(hardening).toContain("p_athlete_id is null or bp.athlete_id = p_athlete_id");
  });

  it("reconciles implemented source events into unique-athlete action metrics", () => {
    expect(hardening).toContain("ae.event_name in ('locker_shared', 'share_link_copied')");
    expect(hardening).toContain("group by ae.athlete_id");
    expect(hardening).toContain("select count(*) from enriched where locker_views > 0");
    expect(hardening).toContain("'denominator', (select count(*) from enriched)");
  });
});
