import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    "supabase/migrations/20260818000002_phase2_legacy_admin_super_admin_transition.sql",
  ),
  "utf8",
).toLowerCase();

const normalized = migration.replace(/\s+/g, " ");

describe("Phase 2 legacy-admin platform-role transition", () => {
  it("backfills legacy admins exactly once without reactivating revoked history", () => {
    expect(normalized).toContain("insert into public.platform_role_assignments");
    expect(normalized).toContain("from public.profiles profile");
    expect(normalized).toContain("where profile.role = 'admin'");
    expect(normalized).toContain("'super_admin'");
    expect(normalized).toContain("assignment_reason");
    expect(normalized).toContain(
      "not exists ( select 1 from public.platform_role_assignments existing_assignment",
    );
    expect(normalized).toContain("existing_assignment.user_id = profile.id");
    expect(normalized).toContain("existing_assignment.role = 'super_admin'");
    expect(normalized).not.toContain("on conflict do update");
  });

  it("writes one append-only audit record for each inserted assignment", () => {
    expect(normalized).toContain("with inserted_assignments as");
    expect(normalized).toContain("insert into public.audit_logs");
    expect(normalized).toContain("'platform_role.backfilled'");
    expect(normalized).toContain("'platform_role_assignment'");
    expect(normalized).toContain("assignment.assignment_reason");
    expect(normalized).toContain("risk_level");
    expect(normalized).toContain("'high'");
    expect(normalized).toContain(
      "'migration', '20260818000002_phase2_legacy_admin_super_admin_transition'",
    );
  });

  it("authorizes only active super-admin assignments after the backfill", () => {
    const functionBody = normalized.match(
      /create or replace function public\.is_internal_admin\(\).*?as \$\$(.*?)\$\$;/,
    )?.[1];

    expect(functionBody).toBeDefined();
    expect(functionBody).toContain("private.has_active_platform_role");
    expect(functionBody).toContain("array['super_admin']::text[]");
    expect(functionBody).not.toContain("public.profiles");
    expect(functionBody).not.toContain("profiles.role");
    expect(functionBody).not.toContain("auth.jwt");
    expect(normalized).toContain("security definer set search_path = ''");
  });

  it("keeps the compatibility predicate narrowly executable", () => {
    expect(normalized).toContain(
      "revoke all on function public.is_internal_admin() from public, anon, authenticated, service_role",
    );
    expect(normalized).toContain(
      "grant execute on function public.is_internal_admin() to authenticated, service_role",
    );
  });

  it("does not encode administrator credentials or identifiers", () => {
    expect(normalized).not.toContain("@bltz");
    expect(normalized).not.toContain("password");
    expect(normalized).not.toContain("email =");
    expect(normalized).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/);
  });
});
