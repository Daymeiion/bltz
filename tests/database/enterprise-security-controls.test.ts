// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const actor = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
const orgA = "00000000-0000-4000-8000-000000000003";
const orgB = "00000000-0000-4000-8000-000000000004";
const player = "00000000-0000-4000-8000-000000000005";
let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create schema storage;
    create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, created_at timestamptz);
    create function auth.uid() returns uuid language sql stable as
      $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
    create function public.set_updated_at() returns trigger language plpgsql as
      $$begin new.updated_at = now(); return new; end;$$;
    create table public.schools(id uuid primary key);
    create table public.teams(id uuid primary key);
    create table public.profiles(id uuid primary key, role text, email text, display_name text);
    create table public.players(id uuid primary key);
    create table public.nfl_players(gsis_id text primary key);
    create table public."Colleges"(id bigint primary key);
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    grant usage on schema public, auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to authenticated, service_role;
    insert into auth.users(id) values ('${actor}'), ('${other}');
    insert into players values ('${player}');
  `);
  for (const file of [
    "20260818000001_phase2_tenant_authorization_foundation.sql",
    "20261102120000_crm_pilot_school_permissions.sql",
    "20261102130000_crm_pilot_activations.sql",
    "20261102140000_crm_pilot_locker_launches.sql",
    "20261102160000_crm_pilot_media_uploads.sql",
    "20261110140000_crm_pilot_onboarding.sql",
    "20261111120000_enterprise_security_controls.sql",
  ]) {
    // PGlite has gen_random_uuid built in, but does not bundle pgcrypto.
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8")
      .replace('create extension if not exists "pgcrypto";', ""));
  }
  await db.exec(`insert into organizations(id, name, organization_type, status)
    values ('${orgA}', 'School A', 'school', 'approved'), ('${orgB}', 'School B', 'school', 'approved');`);
}, 30_000);

afterAll(async () => { await db?.close(); });
beforeEach(async () => {
  await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false)");
});

async function activation(org = orgA) {
  return (await db.query<{ id: string }>(`insert into organization_activations
    (organization_id, player_id, kind, title, created_by)
    values ($1, $2, 'post', 'Private campaign brief', $3) returning id`, [org, player, actor])).rows[0].id;
}
async function logs(id: string) {
  return (await db.query<{ actor_user_id: string | null; action: string; previous_values: Record<string, unknown> | null; new_values: Record<string, unknown> }>(
    "select actor_user_id, action, previous_values, new_values from audit_logs where entity_id = $1 order by id", [id],
  )).rows;
}

describe.sequential("enterprise security controls in PostgreSQL", () => {
  it("audits service-role activation creation and updates without copying private content", async () => {
    await db.exec("set role service_role");
    const id = await activation();
    await db.query("update organization_activations set status = 'cancelled', updated_by = $1 where id = $2", [other, id]);
    const audit = await logs(id);
    expect(audit).toHaveLength(2);
    expect(audit[0].actor_user_id).toBe(actor);
    expect(audit[1].actor_user_id).toBe(other);
    expect(audit[1].previous_values?.status).toBe("planned");
    expect(audit[1].new_values.status).toBe("cancelled");
    expect(JSON.stringify(audit)).not.toContain("Private campaign brief");
  });

  it("rolls back the business mutation if the audit insert fails", async () => {
    const id = await activation();
    await db.exec("revoke insert on audit_logs from service_role; set role service_role");
    try {
      await expect(db.query("update organization_activations set status = 'cancelled' where id = $1", [id])).rejects.toThrow();
    } finally {
      await db.exec("reset role; grant insert on audit_logs to service_role");
    }
    expect((await db.query<{ status: string }>("select status from organization_activations where id = $1", [id])).rows[0].status).toBe("planned");
    expect(await logs(id)).toHaveLength(1);
  });

  it("rejects cross-tenant media links on insert and update", async () => {
    const id = await activation();
    await expect(db.query(`insert into organization_athlete_media
      (organization_id, player_id, activation_id, kind, title, created_by)
      values ($1, $2, $3, 'image', 'Photo', $4)`, [orgB, player, id, actor])).rejects.toThrow(/foreign key/i);
    const media = (await db.query<{ id: string }>(`insert into organization_athlete_media
      (organization_id, player_id, activation_id, kind, title, created_by)
      values ($1, $2, $3, 'image', 'Photo', $4) returning id`, [orgA, player, id, actor])).rows[0].id;
    await expect(db.query("update organization_athlete_media set organization_id = $1 where id = $2", [orgB, media])).rejects.toThrow(/foreign key/i);
  });

  it("rejects cross-tenant launch and athlete invite links", async () => {
    const launch = (await db.query<{ id: string }>(`insert into organization_locker_launches
      (organization_id, player_name, created_by) values ($1, 'Athlete', $2) returning id`, [orgA, actor])).rows[0].id;
    expect(await logs(launch)).toHaveLength(1);
    await expect(db.query(`insert into organization_athlete_media
      (organization_id, launch_id, kind, title, created_by)
      values ($1, $2, 'image', 'Photo', $3)`, [orgB, launch, actor])).rejects.toThrow(/foreign key/i);
    const athlete = (await db.query<{ id: string }>(`insert into organization_athletes
      (organization_id, display_name, source) values ($1, 'Athlete', 'staff_added') returning id`, [orgA])).rows[0].id;
    await expect(db.query(`insert into organization_athlete_invites
      (organization_id, organization_athlete_id, token_hash, channel, expires_at, created_by)
      values ($1, $2, repeat('a',64), 'link', now() + interval '1 day', $3)`, [orgB, athlete, actor])).rejects.toThrow(/foreign key/i);
    await db.query(`insert into organization_athlete_invites
      (organization_id, organization_athlete_id, token_hash, channel, expires_at, created_by)
      values ($1, $2, repeat('a',64), 'link', now() + interval '1 day', $3)`, [orgA, athlete, actor]);
  });

  it("prevents membership identity reassignment and audits role changes without version-only noise", async () => {
    const id = (await db.query<{ id: string }>(`insert into organization_memberships
      (organization_id, user_id, role, created_by) values ($1, $2, 'owner', $2) returning id`, [orgA, actor])).rows[0].id;
    await expect(db.query("update organization_memberships set organization_id = $1 where id = $2", [orgB, id])).rejects.toThrow(/identity is immutable/i);
    await expect(db.query("update organization_memberships set user_id = $1 where id = $2", [other, id])).rejects.toThrow(/identity is immutable/i);
    await expect(db.query("update organization_memberships set role = 'viewer' where id = $1", [id])).rejects.toThrow(/final active organization owner/i);
    await db.query(`insert into organization_memberships (organization_id, user_id, role)
      values ($1, $2, 'owner')`, [orgA, other]);
    await db.query("update organization_memberships set role = 'viewer' where id = $1", [id]);
    await db.query("update organization_memberships set authorization_version = authorization_version + 1 where id = $1", [id]);
    const audit = await logs(id);
    expect(audit).toHaveLength(2);
    expect(audit[1].previous_values?.role).toBe("owner");
    expect(audit[1].new_values.role).toBe("viewer");
    expect(audit[1].actor_user_id).toBeNull(); // no fabricated end-user attribution
  });

  it("audits platform grants and revocations with the actual recorded actor", async () => {
    const id = (await db.query<{ id: string }>(`insert into platform_role_assignments
      (user_id, role, assigned_by, assignment_reason)
      values ($1, 'support_admin', $2, 'Support access') returning id`, [other, actor])).rows[0].id;
    await db.query(`update platform_role_assignments set revoked_by = $1,
      revoked_at = now(), revocation_reason = 'Access ended' where id = $2`, [actor, id]);
    const audit = await logs(id);
    expect(audit).toHaveLength(2);
    expect(audit.every((row) => row.actor_user_id === actor)).toBe(true);
  });

  it("keeps browser roles away from tenant operational data and audit records", async () => {
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      for (const table of ["organization_activations", "organization_locker_launches", "organization_athlete_media", "organization_athlete_invites", "platform_role_assignments", "audit_logs"]) {
        await expect(db.query(`select * from ${table}`)).rejects.toThrow(/permission denied/i);
      }
      await db.exec("reset role");
    }
    const id = await activation();
    await expect(db.query("update audit_logs set reason = 'rewrite' where entity_id = $1", [id])).rejects.toThrow(/append-only/i);
    await expect(db.query("delete from audit_logs where entity_id = $1", [id])).rejects.toThrow(/append-only/i);
  });
});
