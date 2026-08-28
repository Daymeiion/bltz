import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve("supabase/migrations/20260818000000_phase2_authorization_exposure_hardening.sql"),
  "utf8",
).toLowerCase();

const statements = migration
  .split(";")
  .map((value) => value.replace(/\s+/g, " ").trim())
  .filter(Boolean);

describe("Phase 2A authorization hardening migration", () => {
  it("removes browser default privileges for future public objects", () => {
    expect(migration).toContain("revoke all on tables from anon, authenticated");
    expect(migration).toContain("revoke all on sequences from anon, authenticated");
    expect(migration).toContain("revoke all on functions from anon, authenticated");
  });

  it("removes permissive profile policies and keeps access owner-scoped", () => {
    expect(migration).toContain('drop policy if exists "allow all profile operations"');
    expect(migration).toContain('drop policy if exists "profiles_public_read"');
    expect(migration).toContain('create policy "profiles_select_own"');
    expect(migration).toContain("using ((select auth.uid()) = id)");
    expect(migration).toContain("grant update (display_name, avatar_url)");
    expect(migration).not.toContain("grant update (role");
    expect(migration).not.toContain("grant update (player_id");
  });

  it("keeps anonymous player access read-only and visibility-scoped", () => {
    expect(migration).toContain('drop policy if exists "users can create players"');
    expect(migration).toContain('drop policy if exists "players_public_read"');
    expect(migration).toContain("grant select on table public.players to anon");
    expect(statements.some((statement) =>
      statement.startsWith("grant insert") && statement.includes("public.players to anon"),
    )).toBe(false);
  });

  it("removes unconditional messaging policies", () => {
    expect(migration).toContain('drop policy if exists "allow all attachment operations"');
    expect(migration).toContain('drop policy if exists "allow all message operations"');
    expect(migration).toContain('drop policy if exists "allow all thread operations"');
    expect(migration).not.toContain("using (true)");
  });

  it.each([
    "append_pipeline_event(uuid, jsonb)",
    "claim_pipeline_run(uuid, integer)",
    "create_reciprocal_teammate()",
    "handle_new_user()",
    "set_updated_at()",
    "update_updated_at_column()",
  ])("revokes direct browser execution of %s", (signature) => {
    expect(migration).toContain(`revoke all on function public.${signature}`);
  });

  it("does not introduce tenant or Media Graph tables", () => {
    expect(migration).not.toContain("create table");
    expect(migration).not.toContain("media_assets");
    expect(migration).not.toContain("organization_memberships");
  });
});
