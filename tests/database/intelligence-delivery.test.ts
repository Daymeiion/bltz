// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const db = new PGlite();
const player = "10000000-0000-4000-8000-000000000001";
const session = "70000000-0000-4000-8000-000000000001";
const lease = "90000000-0000-4000-8000-000000000001";
const worker = "90000000-0000-4000-8000-000000000002";
function params(index: number) {
  const id = `60000000-0000-4000-8000-${String(index).padStart(12,"0")}`;
  return [{ client_event_id: id,event_name: "locker_viewed",athlete_id:player,session_id:session,source:"public_locker",page:"/player/synthetic",properties:{},occurred_at:"2026-10-05T00:00:00Z" },
    { event_id:id,environment:"development",schema_version:1,subject_player_id:player,session_id:session,received_at:"2026-10-05T00:00:00Z" }];
}
async function accept(index:number) { const [event,envelope]=params(index);return (await db.query<{result:{event_id:string;duplicate:boolean}}>("select public.accept_analytics_delivery_event($1::jsonb,$2::jsonb) result",[JSON.stringify(event),JSON.stringify(envelope)])).rows[0].result; }
async function batch() { return (await db.query<{result:{batch_id:string;event_count:number;state:string}}>("select lease_analytics_delivery_batch('development',100,262144,$1::uuid,60) result",[lease])).rows[0].result; }
beforeAll(async()=>{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
    create schema auth;create table auth.users(id uuid primary key);create table players(id uuid primary key);create table moments(id uuid primary key);
    create table analytics_events(id uuid primary key default gen_random_uuid(),client_event_id uuid unique not null,event_name text not null,
      user_id uuid references auth.users,athlete_id uuid references players,session_id uuid,source text not null,page text,properties jsonb not null,occurred_at timestamptz not null,created_at timestamptz default now());
    grant select,insert on analytics_events to service_role;insert into players values('${player}');`);
  await db.exec(fs.readFileSync("supabase/migrations/20261005183837_intelligence_measured_delivery.sql","utf8"));
  expect((await db.query("select to_regclass('public.intelligence_engine_runs') is not null engine, to_regclass('public.analytics_delivery_outbox') is null transport_absent")).rows[0])
    .toEqual({ engine: true, transport_absent: true });
  await db.exec(fs.readFileSync("supabase/migrations/20261009003442_analytics_delivery_transport.sql","utf8"));
},30000);
afterAll(async()=>db.close());
describe("transactional development delivery SQL",()=>{
  it("accepts journal and outbox atomically and repeats a logical ID once",async()=>{
    const first=await accept(1);expect(first.duplicate).toBe(false);expect(await accept(1)).toEqual({...first,duplicate:true});
    expect((await db.query<Record<string, unknown>>("select count(*)::int n from analytics_delivery_outbox")).rows[0]).toEqual({n:1});
    const [event,envelope]=params(2);envelope.subject_player_id="bad";
    await expect(db.query<Record<string, unknown>>("select accept_analytics_delivery_event($1::jsonb,$2::jsonb)",[JSON.stringify(event),JSON.stringify(envelope)])).rejects.toThrow();
    expect((await db.query<Record<string, unknown>>("select count(*)::int n from analytics_events")).rows[0]).toEqual({n:1});
    const [collision,original]=params(1);collision.event_name="media_opened";
    await expect(db.query<Record<string, unknown>>("select accept_analytics_delivery_event($1::jsonb,$2::jsonb)",[JSON.stringify(collision),JSON.stringify(original)])).rejects.toThrow("identity collision");
  });
  it("bounds and fences immutable batches and preserves worker ack in publisher race",async()=>{
    const b=await batch();expect(b.event_count).toBe(1);
    await expect(db.query<Record<string, unknown>>("select lease_analytics_delivery_batch('production',100,262144,$1::uuid,60)",[lease])).rejects.toThrow();
    for(const [limit,cap,seconds] of [[null,262144,60],[100,null,60],[100,262144,null]])
      await expect(db.query("select lease_analytics_delivery_batch('development',$1,$2,$3::uuid,$4)",[limit,cap,lease,seconds])).rejects.toThrow("invalid lease bounds");
    await expect(db.query("select acquire_analytics_delivery_batch($1,'development',$2,null)",[b.batch_id,worker])).rejects.toThrow("invalid worker lease");
    await expect(db.query("select settle_analytics_delivery_batch($1,$2,null,null)",[b.batch_id,worker])).rejects.toThrow("invalid settlement");
    expect((await db.query<Record<string, unknown>>("select acquire_analytics_delivery_batch($1,'development',$2,60) result",[b.batch_id,worker])).rows[0].result).toMatchObject({state:"processing"});
    expect((await db.query<Record<string, unknown>>("select acquire_analytics_delivery_batch($1,'development',$2,60) result",[b.batch_id,lease])).rows[0].result).toBeNull();
    expect((await db.query<Record<string, unknown>>("select settle_analytics_delivery_batch($1,$2,'acknowledged',null) ok",[b.batch_id,lease])).rows[0].ok).toBe(false);
    expect((await db.query<Record<string, unknown>>("select settle_analytics_delivery_batch($1,$2,'acknowledged',null) ok",[b.batch_id,worker])).rows[0].ok).toBe(true);
    await db.query<Record<string, unknown>>("select mark_analytics_delivery_published($1,$2,'remote-message')",[b.batch_id,lease]);
    expect((await db.query<Record<string, unknown>>("select state,message_id from analytics_delivery_batches where id=$1",[b.batch_id])).rows[0]).toEqual({state:"acknowledged",message_id:"remote-message"});
    expect((await db.query<Record<string, unknown>>("select acquire_analytics_delivery_batch($1,'development',$2,60) result",[b.batch_id,worker])).rows[0].result).toMatchObject({state:"acknowledged"});
    await expect(db.exec("update analytics_delivery_outbox set envelope='{}'")).rejects.toThrow("immutable");
  });
  it("quarantines expired external insert leases rather than blindly replaying",async()=>{
    await accept(3);const b=await batch();await db.query<Record<string, unknown>>("select acquire_analytics_delivery_batch($1,'development',$2,60)",[b.batch_id,worker]);
    await db.query<Record<string, unknown>>("update analytics_delivery_batches set worker_lease_until=now()-interval '1 minute' where id=$1",[b.batch_id]);
    expect((await db.query<Record<string, unknown>>("select settle_analytics_delivery_batch($1,$2,'acknowledged',null) ok",[b.batch_id,worker])).rows[0].ok).toBe(false);
    expect((await db.query<Record<string, unknown>>("select acquire_analytics_delivery_batch($1,'development',$2,60) result",[b.batch_id,lease])).rows[0].result).toBeNull();
    expect((await db.query<Record<string, unknown>>("select state from analytics_delivery_batches where id=$1",[b.batch_id])).rows[0].state).toBe("quarantined");
  });
  it("blocks browser roles from tables and functions; permits service only",async()=>{
    for(const role of ["anon","authenticated"]){await db.exec(`set role ${role}`);try{
      await expect(db.query<Record<string, unknown>>("select * from analytics_delivery_outbox")).rejects.toThrow(/permission denied/);
      await expect(db.query<Record<string, unknown>>("select * from analytics_delivery_batches")).rejects.toThrow(/permission denied/);
      await expect(accept(4)).rejects.toThrow(/permission denied/);
    }finally{await db.exec("reset role");}}
    await db.exec("set role service_role");try{expect((await accept(4)).duplicate).toBe(false);}finally{await db.exec("reset role");}
  });
  it("keeps immutable feature runs and refuses stale current-pointer writes",async()=>{
    const run={id:"80000000-0000-4000-8000-000000000001",environment:"development",player_id:player,moment_id:null,subject_kind:"athlete",subject_key:`athlete:${player}`,
      scope_key:"public_audience",feature_version:"engagement-v1",rule_version:"measured-v1",as_of:"2026-10-05T20:00:00Z",computed_at:"2026-10-05T20:01:00Z",event_watermark:"2026-10-05T19:00:00Z",
      input_revision:1,input_snapshot_hash:"a".repeat(64),input_snapshot:{eventIds:[1]},features:{value:3},signals:{signals:[]}};
    expect((await db.query<Record<string, unknown>>("select store_intelligence_feature_run($1::jsonb) ok",[JSON.stringify(run)])).rows[0].ok).toBe(true);
    const older={...run,id:"80000000-0000-4000-8000-000000000002",computed_at:"2026-10-05T20:02:00Z",event_watermark:"2026-10-05T18:00:00Z",features:{value:1},input_snapshot_hash:"b".repeat(64)};
    expect((await db.query<Record<string, unknown>>("select store_intelligence_feature_run($1::jsonb) ok",[JSON.stringify(older)])).rows[0].ok).toBe(false);
    expect((await db.query<Record<string, unknown>>("select run_id,revision from intelligence_feature_snapshots")).rows[0]).toEqual({run_id:run.id,revision:1});
    expect((await db.query<Record<string, unknown>>("select count(*)::int n from intelligence_engine_runs")).rows[0].n).toBe(2);
    await expect(db.query<Record<string, unknown>>("select store_intelligence_feature_run($1::jsonb)",[JSON.stringify({...run,features:{value:99}})])).rejects.toThrow("run identity collision");
    await expect(db.query("select store_intelligence_feature_run($1::jsonb)",[JSON.stringify({...run,input_snapshot:{eventIds:[99]}})])).rejects.toThrow("run identity collision");
    const retry={...run,id:"80000000-0000-4000-8000-000000000003",computed_at:"2026-10-05T20:03:00Z"};
    expect((await db.query<{ok:boolean}>("select store_intelligence_feature_run($1::jsonb) ok",[JSON.stringify(retry)])).rows[0].ok).toBe(false);
    const revised={...retry,id:"80000000-0000-4000-8000-000000000004",input_revision:2};
    expect((await db.query<{ok:boolean}>("select store_intelligence_feature_run($1::jsonb) ok",[JSON.stringify(revised)])).rows[0].ok).toBe(true);
    await db.exec("set role service_role");try{
      await expect(db.exec("update intelligence_engine_runs set features='{}'")).rejects.toThrow(/permission denied/);
      await expect(db.exec("update intelligence_feature_snapshots set computed_at=now()")).rejects.toThrow("lineage mismatch");
      await expect(db.query("update intelligence_feature_snapshots set run_id=$1,computed_at=$2,input_revision=1",[run.id,run.computed_at])).rejects.toThrow("stale feature pointer");
    }finally{await db.exec("reset role");}
  });
});
