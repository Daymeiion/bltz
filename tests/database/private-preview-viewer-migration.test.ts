// @vitest-environment node
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const path = "supabase/migrations/20260901184112_private_preview_assigned_viewer.sql";
const sql = readFileSync(path, "utf8").toLowerCase().replace(/\s+/g, " ");

it("adds one normalized viewer grant with least-privilege RLS", () => {
  expect(sql).toContain("create table public.preview_locker_viewer_grants");
  expect(sql).toContain("preview_locker_id uuid primary key");
  expect(sql).toContain("viewer_user_id uuid not null");
  expect(sql).toContain("alter table public.preview_locker_viewer_grants enable row level security");
  expect(sql).toContain("revoke all on table public.preview_locker_viewer_grants from public, anon, authenticated, service_role");
  expect(sql).not.toMatch(/grant [^;]+ on (?:table )?public\.preview_locker_viewer_grants/);
  expect(sql).toContain("create policy preview_assigned_viewer_read on public.preview_lockers for select to authenticated");
  expect(sql).toContain("grant_row.viewer_user_id = (select auth.uid())");
  expect(sql).toContain("preview_locker_viewer_grants_viewer_idx");
});

it("keeps exact-email lookup and mutations inside audited admin functions", () => {
  expect(sql).toContain("where lower(user_row.email) = normalized_email");
  expect(sql).toContain("actor is null or not public.is_internal_admin()");
  expect(sql).toContain("on conflict (preview_locker_id) do update");
  expect(sql).toContain("preview.viewer.assigned");
  expect(sql).toContain("preview.viewer.reassigned");
  expect(sql).toContain("preview.viewer.revoked");
  expect(sql).not.toContain("p_email',");
  expect(sql).not.toContain("'email'");
});

it("exposes only bounded invoker wrappers and no canonical athlete linkage", () => {
  for (const name of ["assign_preview_locker_viewer", "revoke_preview_locker_viewer", "preview_locker_has_viewer"]) {
    expect(sql).toContain(`create function public.${name}`);
    expect(sql).toContain(`grant execute on function public.${name}`);
  }
  expect(sql).not.toMatch(/(?:insert into|update|delete from) public\.(players|player_lockers|athlete_claims)/);
  expect(sql).not.toContain("send_email");
});
