// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { IntelligenceReviewPacketSchema, type IntelligenceReviewPacket } from "@/lib/intelligence/review/contracts";

const db = new PGlite();
// Existing canonical production athlete ID; source assertions were independently
// reviewed. This isolated fixture creates no account/athlete in any live system.
const athlete = "c5dae871-a277-4256-9a0c-17a40940ad3f";
const reviewer = "00000000-0000-4000-8000-000000000002";
const stranger = "00000000-0000-4000-8000-000000000003";
const packet: IntelligenceReviewPacket = {
  schemaVersion: 1, idempotencyKey: "usc-keith-rivers-washington-2006-review-v1",
  athleteId: athlete, expectedAthleteName: "Keith Rivers",
  identityReview: {status:"verified",matchMethod:"manual_primary_usc_linebacker_context",confidence:0.99},
  source: {key:"usc-washington-2006",name:"USC Athletics",provider:"usc_athletics",namespace:"football:college:postgame",
    externalId:null,locator:"https://usctrojans.com/news/2006/10/7/USC_vs_Washington_Quotes_10_7_2006",
    fetchedAt:"2026-09-30T12:00:00Z",normalizerVersion:"manual_review_v1"},
  rawObservation: {title:"USC vs. Washington Quotes - 10-7-2006",describedAthlete:"USC Linebacker Keith Rivers",sourcePaths:["postgame quotes"]},
  normalizedCandidate:{describedEventOn:"2006-10-07",publishedOn:"2006-10-07",careerContext:"career_era"},
  review:{reviewedAt:"2026-09-30T12:01:00Z",reason:"Dated official postgame quotes establish actual participation independently of article publication."},
  moment:{mode:"create",title:"Keith Rivers participates in USC vs. Washington",occurredOn:"2006-10-07",occurredYear:2006,
    datePrecision:"day",sport:"football",relationshipType:"participant",confidence:0.99},
  evidence:[{factType:"moment_occurrence",statement:"USC identifies Keith Rivers in the October 7, 2006 Washington postgame quotes.",
    data:{occurredOn:"2006-10-07",dateBasis:"described_event",sourcePaths:["article dated title","USC Linebacker Keith Rivers section"]},confidence:0.99,attachToMoment:true}],
};
const invoke = (input: unknown, actor = reviewer) => db.query<{receipt:Record<string,unknown>}>("select public.review_intelligence_observation($1::jsonb,$2::uuid) as receipt",[JSON.stringify(input),actor]);
const counts = async () => (await db.query("select (select count(*)::int from intelligence_ingestions) as ingestions,(select count(*)::int from intelligence_evidence) as evidence,(select count(*)::int from moments) as moments,(select count(*)::int from audit_logs) as audits")).rows[0];
let receipt: Record<string, unknown>;

beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema private; alter default privileges in schema public grant all on tables to service_role;
    create table players(id uuid primary key,name text,full_name text);
    create table sports_events(id uuid primary key);
    create table platform_role_assignments(user_id uuid,role text,revoked_at timestamptz);
    create table audit_logs(id bigint generated always as identity,actor_user_id uuid,action text,entity_type text,entity_id text,new_values jsonb,request_metadata jsonb);
    insert into players values('${athlete}','Keith Rivers',null);
    insert into platform_role_assignments values('${reviewer}','super_admin',null);`);
  await db.exec(fs.readFileSync("supabase/migrations/20260930181840_intelligence_graph_foundation.sql","utf8"));
  await db.exec(fs.readFileSync("supabase/migrations/20261001035756_intelligence_source_review.sql","utf8"));
},30000);
afterAll(async () => { await db.close(); });

describe("audited Intelligence review", () => {
  it("validates packets without equating publication to an event date", () => {
    expect(IntelligenceReviewPacketSchema.safeParse(packet).success).toBe(true);
    expect(IntelligenceReviewPacketSchema.safeParse({...packet,evidence:[{...packet.evidence[0],data:{occurredOn:"2006-10-07",dateBasis:"publication"}}]}).success).toBe(false);
    expect(IntelligenceReviewPacketSchema.safeParse({...packet,source:{...packet.source,locator:"https://example.com/?api_key=secret"}}).success).toBe(false);
    expect(IntelligenceReviewPacketSchema.safeParse({...packet,rawObservation:{authorization:"Bearer credentials"}}).success).toBe(false);
    expect(IntelligenceReviewPacketSchema.safeParse({...packet,identityReview:{...packet.identityReview,status:"candidate"}}).success).toBe(false);
  });

  it("denies both browser roles and an unassigned reviewer", async () => {
    for(const role of ["anon","authenticated"]){
      await db.exec(`set role ${role}`);
      try{await expect(invoke(packet)).rejects.toThrow(/permission denied/);}finally{await db.exec("reset role");}
    }
    await expect(invoke(packet,stranger)).rejects.toThrow("active platform reviewer required");
    await db.exec(`insert into platform_role_assignments values('${stranger}','super_admin',now())`);
    await expect(invoke(packet,stranger)).rejects.toThrow("active platform reviewer required");
    expect(await counts()).toEqual({ingestions:0,evidence:0,moments:0,audits:0});
  });

  it("atomically promotes reviewed source, occurrence, participation and reviewer audit", async () => {
    await db.exec("set role service_role");
    try{receipt=(await invoke(packet)).rows[0].receipt;}finally{await db.exec("reset role");}
    expect(receipt).toMatchObject({reviewerId:reviewer,replay:false});
    expect(await counts()).toEqual({ingestions:1,evidence:1,moments:1,audits:1});
    const evidence=(await db.query<{structured_data:Record<string,unknown>}>("select structured_data from intelligence_evidence")).rows[0];
    expect(evidence.structured_data).toMatchObject({occurredOn:"2006-10-07",dateBasis:"described_event",_review:{reviewerId:reviewer}});
    const audit=(await db.query<{actor_user_id:string;action:string}>("select actor_user_id,action from audit_logs")).rows[0];
    expect(audit).toEqual({actor_user_id:reviewer,action:"intelligence.source_review"});
  });

  it("replays identically without duplicate Moments/evidence/audits and rejects conflicting replay", async () => {
    expect((await invoke(packet)).rows[0].receipt).toMatchObject({ingestionId:receipt.ingestionId,momentId:receipt.momentId,replay:true});
    await expect(invoke({...packet,rawObservation:{...packet.rawObservation,unreviewedChange:true}})).rejects.toThrow("review idempotency conflict");
    expect(await counts()).toEqual({ingestions:1,evidence:1,moments:1,audits:1});
  });

  it("links separately sourced performance without fabricating milestone or event date", async () => {
    const performance={...packet,idempotencyKey:"usc-performance-review-v1",source:{...packet.source,key:"usc-senior-bio",locator:"https://usctrojans.com/documents/download/2015/4/30/07seniorbiosfb-final.pdf"},
      moment:{mode:"link",id:receipt.momentId},evidence:[{factType:"performance",statement:"2006 Washington prose credits Rivers with 12 tackles, 1 TFL and 2 deflections.",
        data:{statistics:{total_tackles:12,tackles_for_loss:1,pass_deflections:2},seasonYear:2006,sourcePaths:["PDF page 30 2006 paragraph"]},confidence:0.99,attachToMoment:true}]};
    expect((await invoke(performance)).rows[0].receipt.momentId).toBe(receipt.momentId);
    expect((await db.query<{n:number}>("select count(*)::int as n from moments")).rows[0].n).toBe(1);
  });

  it("retains postcareer YouTube content with unknown release dates as athlete evidence only", async () => {
    const content={...packet,idempotencyKey:"publisher-youtube-review-v1",moment:null,evidence:[{factType:"content_item",statement:"The publisher explicitly links the former NFL linebacker's interview.",
      data:{title:"Keith Rivers art interview",url:"https://www.youtube.com/watch?v=_kVz5UI_tJE",contentType:"video",publishedOn:null,releasedOn:null,describedEventOn:null,careerContext:"postcareer",identityStatus:"verified",youtubeId:"_kVz5UI_tJE"},confidence:0.98,attachToMoment:false}]};
    expect(IntelligenceReviewPacketSchema.safeParse(content).success).toBe(true);
    expect((await invoke(content)).rows[0].receipt.momentId).toBeNull();
    const row=(await db.query<{moment_id:string|null;structured_data:Record<string,unknown>}>("select moment_id,structured_data from intelligence_evidence where fact_type='content_item'")).rows[0];
    expect(row).toMatchObject({moment_id:null,structured_data:{publishedOn:null,releasedOn:null,careerContext:"postcareer"}});
  });

  it("rolls back complete promotion on invalid evidence, wrong athlete or inferred publication dates", async () => {
    const before=await counts();
    await expect(invoke({...packet,idempotencyKey:"invalid-last-evidence",evidence:[...packet.evidence,{...packet.evidence[0],confidence:2}]})).rejects.toThrow();
    await expect(invoke({...packet,idempotencyKey:"wrong-name",expectedAthleteName:"Another Keith Rivers"})).rejects.toThrow("canonical athlete identity mismatch");
    await expect(invoke({...packet,idempotencyKey:"publication-inference",evidence:[{...packet.evidence[0],data:{occurredOn:"2006-10-07",dateBasis:"publication"}}]})).rejects.toThrow("independent event occurrence evidence required");
    await expect(invoke({...packet,idempotencyKey:"unsafe-raw",rawObservation:{api_key:"credential"}})).rejects.toThrow("transport credentials rejected");
    await expect(invoke({...packet,idempotencyKey:"conflicting-source",source:{...packet.source,provider:"another_provider"}})).rejects.toThrow("source identity conflict");
    expect(await counts()).toEqual(before);
  });

  it("removes cloud default service DELETE and TRUNCATE privileges", async () => {
    const privileges=(await db.query<{deletion:boolean;truncation:boolean}>("select has_table_privilege('service_role','intelligence_ingestions','DELETE') as deletion,has_table_privilege('service_role','intelligence_ingestions','TRUNCATE') as truncation")).rows[0];
    expect(privileges).toEqual({deletion:false,truncation:false});
  });
});
