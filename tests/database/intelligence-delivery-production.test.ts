// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const db = new PGlite();
const player = "10000000-0000-4000-8000-000000000001";
const session = "70000000-0000-4000-8000-000000000001";
const publisher = "90000000-0000-4000-8000-000000000001";
const worker = "90000000-0000-4000-8000-000000000002";
type Environment = "development" | "production";
type Batch = { batch_id: string; state: string; event_count: number; envelopes: Array<{ environment: Environment; event_id: string }>; event_ids: string[] };
function params(index: number, environment: Environment) {
  const id = `60000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
  return [{ client_event_id: id, event_name: "locker_viewed", athlete_id: player, session_id: session, source: "public_locker", page: "/player/synthetic", properties: {}, occurred_at: "2026-10-05T00:00:00Z" },
    { event_id: id, environment, schema_version: 1, subject_player_id: player, session_id: session, received_at: "2026-10-05T00:00:00Z" }];
}
async function accept(index: number, environment: Environment) {
  const [event, envelope] = params(index, environment);
  return (await db.query<{ result: { event_id: string; duplicate: boolean } }>("select public.accept_analytics_delivery_event($1::jsonb,$2::jsonb) result", [JSON.stringify(event), JSON.stringify(envelope)])).rows[0].result;
}
async function lease(environment: Environment): Promise<Batch | null> {
  return (await db.query<{ result: Batch | null }>("select public.lease_analytics_delivery_batch($1,100,262144,$2::uuid,60) result", [environment, publisher])).rows[0].result;
}
async function acknowledge(batch: Batch, environment: Environment) {
  await db.query("select public.acquire_analytics_delivery_batch($1,$2,$3::uuid,60)", [batch.batch_id, environment, worker]);
  expect((await db.query<{ ok: boolean }>("select public.settle_analytics_delivery_batch($1,$2,'acknowledged',null) ok", [batch.batch_id, worker])).rows[0].ok).toBe(true);
}
beforeAll(async () => {
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
    create schema auth;create table auth.users(id uuid primary key);create table players(id uuid primary key);create table moments(id uuid primary key);
    create table analytics_events(id uuid primary key default gen_random_uuid(),client_event_id uuid unique not null,event_name text not null,
      user_id uuid references auth.users,athlete_id uuid references players,session_id uuid,source text not null,page text,properties jsonb not null,occurred_at timestamptz not null,created_at timestamptz default now());
    grant select,insert on analytics_events to service_role;insert into players values('${player}');`);
  await db.exec(fs.readFileSync("supabase/migrations/20261009003442_analytics_delivery_transport.sql", "utf8"));
  await db.exec(fs.readFileSync("supabase/migrations/20261009003448_analytics_delivery_production_environment.sql", "utf8"));
}, 30_000);
afterAll(async () => db.close());

describe("forward production delivery migration", () => {
  it("accepts each environment atomically and never moves one logical event to the other environment", async () => {
    const first = await accept(1, "development");
    expect(await accept(1, "development")).toEqual({ ...first, duplicate: true });
    await expect(accept(1, "production")).rejects.toThrow("delivery identity collision");
    expect((await accept(2, "production")).duplicate).toBe(false);
    expect((await db.query<{ environment: string; n: number }>("select environment,count(*)::int n from analytics_delivery_outbox group by environment order by environment")).rows).toEqual([
      { environment: "development", n: 1 }, { environment: "production", n: 1 },
    ]);
  });
  it("leases and acquires only matching-environment members, with publisher/worker acknowledgment race fencing", async () => {
    const development = (await lease("development"))!; const production = (await lease("production"))!;
    expect(development.envelopes.every(event => event.environment === "development")).toBe(true);
    expect(production.envelopes.every(event => event.environment === "production")).toBe(true);
    expect(development.event_ids).not.toEqual(production.event_ids);
    expect((await db.query<{ result: unknown }>("select public.acquire_analytics_delivery_batch($1,'development',$2,60) result", [production.batch_id, worker])).rows[0].result).toBeNull();
    expect((await db.query<{ result: unknown }>("select public.get_analytics_delivery_batch($1,'development') result", [production.batch_id])).rows[0].result).toBeNull();
    await acknowledge(development, "development"); await acknowledge(production, "production");
    await db.query("select public.mark_analytics_delivery_published($1,$2,'synthetic-production-message')", [production.batch_id, publisher]);
    expect((await db.query("select state,message_id from analytics_delivery_batches where id=$1", [production.batch_id])).rows[0]).toEqual({ state: "acknowledged", message_id: "synthetic-production-message" });
    expect((await db.query<{ result: Batch }>("select public.acquire_analytics_delivery_batch($1,'production',$2,60) result", [production.batch_id, worker])).rows[0].result.state).toBe("acknowledged");
  });
  it("rejects a changed immutable export context without changing its accepted hash or payload", async () => {
    await accept(3, "production"); const [event, envelope] = params(3, "production");
    const before = (await db.query("select payload_hash,envelope from analytics_delivery_outbox where event_id=$1", [envelope.event_id])).rows[0];
    await expect(db.query("select public.accept_analytics_delivery_event($1::jsonb,$2::jsonb)", [JSON.stringify(event), JSON.stringify({ ...envelope, moment_id: "10000000-0000-4000-8000-000000000099" })])).rejects.toThrow("delivery identity collision");
    expect((await db.query("select payload_hash,envelope from analytics_delivery_outbox where event_id=$1", [envelope.event_id])).rows[0]).toEqual(before);
    await acknowledge((await lease("production"))!, "production");
  });
  it("retains the accepted payload/hash when canonical retries express the same occurrence with a different offset", async () => {
    const [event, envelope] = params(8, "production");
    const original = { ...envelope, occurred_at: "2026-10-05T00:00:00Z" };
    await db.query("select public.accept_analytics_delivery_event($1::jsonb,$2::jsonb)", [JSON.stringify(event), JSON.stringify(original)]);
    const before = (await db.query("select payload_hash,envelope from analytics_delivery_outbox where event_id=$1", [envelope.event_id])).rows[0];
    const retried = await db.query<{ result: { duplicate: boolean } }>("select public.accept_analytics_delivery_event($1::jsonb,$2::jsonb) result", [JSON.stringify({ ...event, occurred_at: "2026-10-04T19:00:00-05:00" }), JSON.stringify({ ...original, occurred_at: "2026-10-05T00:00:00+00:00" })]);
    expect(retried.rows[0].result.duplicate).toBe(true);
    expect((await db.query("select payload_hash,envelope from analytics_delivery_outbox where event_id=$1", [envelope.event_id])).rows[0]).toEqual(before);
    await acknowledge((await lease("production"))!, "production");
  });
  it("enforces cross-environment batch membership even for privileged direct updates", async () => {
    await accept(4, "production"); const [, envelope] = params(4, "production");
    const wrong = (await db.query<{ id: string }>("insert into analytics_delivery_batches(environment,event_count,byte_count) values('development',1,1000) returning id")).rows[0].id;
    await expect(db.query("update analytics_delivery_outbox set batch_id=$1 where event_id=$2", [wrong, envelope.event_id])).rejects.toThrow(/foreign key/);
    await db.query("delete from analytics_delivery_batches where id=$1", [wrong]);
    const proper = (await lease("production"))!;
    await expect(db.query("update analytics_delivery_batches set environment='development' where id=$1", [proper.batch_id])).rejects.toThrow("environment immutable");
    await acknowledge(proper, "production");
  });
  it("quarantines a production insert lease lost after a crash and never automatically replays it", async () => {
    await accept(5, "production"); const batch = (await lease("production"))!;
    await db.query("select public.acquire_analytics_delivery_batch($1,'production',$2,60)", [batch.batch_id, worker]);
    await db.query("update analytics_delivery_batches set worker_lease_until=clock_timestamp()-interval '1 minute' where id=$1", [batch.batch_id]);
    expect((await db.query<{ result: unknown }>("select public.acquire_analytics_delivery_batch($1,'production',$2,60) result", [batch.batch_id, publisher])).rows[0].result).toBeNull();
    expect((await db.query("select state,last_error_code from analytics_delivery_batches where id=$1", [batch.batch_id])).rows[0]).toEqual({ state: "quarantined", last_error_code: "worker_lease_expired" });
    expect(await lease("production")).toBeNull();
  });
  it("rejects unsupported/null environments and null lease bounds rather than bypassing validation", async () => {
    for (const value of [null, "preview", "synthetic", "Production"]) {
      await expect(db.query("select public.lease_analytics_delivery_batch($1,100,262144,$2,60)", [value, publisher])).rejects.toThrow("invalid lease bounds");
      await expect(db.query("select public.acquire_analytics_delivery_batch($1,$2,$3,60)", [publisher, value, worker])).rejects.toThrow("invalid worker lease");
      const [event, envelope] = params(6, "production");
      await expect(db.query("select public.accept_analytics_delivery_event($1::jsonb,$2::jsonb)", [JSON.stringify(event), JSON.stringify({ ...envelope, environment: value })])).rejects.toThrow("invalid delivery envelope");
    }
    await expect(db.query("select public.lease_analytics_delivery_batch('production',null,262144,$1,60)", [publisher])).rejects.toThrow("invalid lease bounds");
  });
  it("retains SECURITY INVOKER and service-only grants/RLS after function replacements", async () => {
    const functions = (await db.query<{ proname: string; prosecdef: boolean }>("select proname,prosecdef from pg_proc where proname in ('accept_analytics_delivery_event','get_analytics_delivery_batch','lease_analytics_delivery_batch','acquire_analytics_delivery_batch','guard_analytics_delivery_batch_environment')")).rows;
    expect(functions).toHaveLength(5); expect(functions.every(row => !row.prosecdef)).toBe(true);
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      try {
        await expect(db.query("select * from analytics_delivery_outbox")).rejects.toThrow(/permission denied/);
        await expect(accept(7, "production")).rejects.toThrow(/permission denied/);
        await expect(lease("production")).rejects.toThrow(/permission denied/);
      } finally { await db.exec("reset role"); }
    }
    await db.exec("set role service_role");
    try { expect((await accept(7, "production")).duplicate).toBe(false); }
    finally { await db.exec("reset role"); }
    expect((await db.query<{ relrowsecurity: boolean }>("select relrowsecurity from pg_class where relname in ('analytics_delivery_outbox','analytics_delivery_batches')")).rows.every(row => row.relrowsecurity)).toBe(true);
  });
});
