import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    "supabase/migrations/20260818000001_phase2_tenant_authorization_foundation.sql",
  ),
  "utf8",
).toLowerCase();

const normalized = migration.replace(/\s+/g, " ");

describe("Phase 2 tenant authorization migration contract", () => {
  it.each([
    "organizations",
    "organization_memberships",
    "platform_role_assignments",
    "audit_logs",
  ])("creates and enables RLS for %s", (table) => {
    expect(normalized).toContain(`create table if not exists public.${table}`);
    expect(normalized).toContain(`alter table public.${table} enable row level security`);
  });

  it("uses the approved organization and membership vocabularies", () => {
    expect(normalized).toContain(
      "'draft', 'pending_review', 'approved', 'rejected', 'suspended', 'restricted', 'closed'",
    );
    expect(normalized).toContain(
      "'owner', 'organization_admin', 'media_manager', 'rights_manager', 'analyst', 'viewer'",
    );
    expect(normalized).toContain("'active', 'suspended', 'removed'");
    expect(normalized).not.toContain("default 'invited'");
    expect(normalized).toContain("organization_type text not null");
    expect(normalized).not.toContain("create type organization_type");
    expect(normalized).not.toContain("slug text");
  });

  it("adds a nullable, indexed organization reference to existing teams without backfill", () => {
    expect(normalized).toContain(
      "alter table public.teams add column if not exists organization_id uuid",
    );
    expect(normalized).toContain("constraint teams_organization_id_fkey");
    expect(normalized).toContain(
      "create index if not exists teams_organization_id_idx on public.teams (organization_id) where organization_id is not null",
    );
    expect(normalized).not.toContain("alter column organization_id set not null");
    expect(normalized).not.toMatch(/update public\.teams\s+set organization_id/);
  });

  it("keeps platform assignments and audit records server-only and audit logs append-only", () => {
    expect(normalized).toContain(
      "revoke all on table public.platform_role_assignments from public, anon, authenticated, service_role",
    );
    expect(normalized).toContain(
      "grant select, insert, update on table public.platform_role_assignments to service_role",
    );
    expect(normalized).toContain(
      "grant select, insert on table public.audit_logs to service_role",
    );
    expect(normalized).not.toContain(
      "grant select, insert, update on table public.audit_logs",
    );
    expect(normalized).not.toMatch(
      /grant (?:insert|update|delete)[^;]*platform_role_assignments[^;]*authenticated/,
    );
    expect(normalized).not.toMatch(
      /grant (?:insert|update|delete)[^;]*audit_logs[^;]*authenticated/,
    );
    expect(normalized).toContain("assignment_reason text not null");
    expect(normalized).toContain(
      "revoked_at is not null and revoked_by is not null and revocation_reason is not null",
    );
  });

  it("allows browser roles only the read contracts needed by the organization switcher", () => {
    expect(normalized).toContain(
      "grant select on table public.organizations to authenticated",
    );
    expect(normalized).toContain(
      "grant select on table public.organization_memberships to authenticated",
    );
    expect(normalized).toContain("membership.user_id = (select auth.uid())");
    expect(normalized).toContain("membership.status = 'active'");
    expect(normalized).toContain("status in ('approved', 'restricted')");
    expect(normalized).toContain("user_id = (select auth.uid())");
    expect(normalized).toContain("or (select public.is_internal_admin())");
    expect(normalized).not.toMatch(
      /grant (?:insert|update|delete)[^;]*(?:organizations|organization_memberships)[^;]*authenticated/,
    );
    expect(normalized).not.toMatch(
      /grant [^;]+(?:organizations|organization_memberships|platform_role_assignments|audit_logs)[^;]+ to anon/,
    );
  });

  it("keeps team directory reads public while tenant assignment remains server-only", () => {
    expect(normalized).toContain(
      "revoke all on table public.teams from public, anon, authenticated",
    );
    expect(normalized).toContain(
      "grant select on table public.teams to anon, authenticated",
    );
    expect(normalized).not.toMatch(
      /grant (?:insert|update|delete)[^;]*public\.teams[^;]*(?:anon|authenticated)/,
    );
  });

  it("moves forward authorization to private platform-role lookup while preserving the legacy fallback", () => {
    expect(normalized).toContain("create schema if not exists private");
    expect(normalized).toContain(
      "create or replace function private.has_active_platform_role",
    );
    expect(normalized).toContain("set search_path = ''");
    expect(normalized).toContain("pra.revoked_at is null");
    expect(normalized).toContain("array['super_admin']::text[]");
    expect(normalized).toContain("p.role = 'admin'");
    expect(normalized).toContain("create or replace function public.is_internal_admin()");
  });

  it("indexes foreign keys and authorization lookup columns", () => {
    expect(normalized).toContain("organizations_school_id_idx");
    expect(normalized).toContain("organizations_created_by_idx");
    expect(normalized).toContain("organization_memberships_user_status_org_idx");
    expect(normalized).toContain("organization_memberships_created_by_idx");
    expect(normalized).toContain("platform_role_assignments_user_id_idx");
    expect(normalized).toContain("platform_role_assignments_assigned_by_idx");
    expect(normalized).toContain("platform_role_assignments_revoked_by_idx");
    expect(normalized).toContain("audit_logs_organization_created_idx");
    expect(normalized).toContain("audit_logs_actor_created_idx");
  });

  it("preserves an active owner and captures decision context in audit records", () => {
    expect(normalized).toContain(
      "create or replace function private.protect_final_active_organization_owner()",
    );
    expect(normalized).toContain("cannot remove the final active organization owner");
    expect(normalized).toContain(
      "before update of role, status or delete on public.organization_memberships",
    );
    expect(normalized).toContain("actor_role text");
    expect(normalized).toContain("actor_role_scope text");
    expect(normalized).toContain("reason text");
    expect(normalized).toContain("risk_level text not null default 'low'");
    expect(normalized).toContain("correlation_id uuid");
    expect(normalized).toContain("request_metadata jsonb not null");
    expect(normalized).toContain("audit_logs_correlation_id_idx");
    expect(normalized).toContain(
      "create or replace trigger organizations_prevent_hard_delete",
    );
    expect(normalized).toContain(
      "create or replace trigger audit_logs_enforce_append_only",
    );
    expect(normalized).toContain("before update or delete on public.audit_logs");
  });

  it("does not create deferred career or media graph entities", () => {
    expect(normalized).not.toMatch(
      /create table if not exists public\.(?:seasons|sports_events|athlete_team_seasons|media_assets|athlete_media|rights_records)\b/,
    );
    expect(normalized).not.toMatch(/alter table public\.(?:media|videos|player_lockers)\b/);
  });
});
