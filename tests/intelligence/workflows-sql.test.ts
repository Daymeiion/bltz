// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const db = new PGlite();
const actor = "00000000-0000-4000-8000-000000000001";
const assignee = "00000000-0000-4000-8000-000000000002";
const player = "00000000-0000-4000-8000-000000000003";
const otherPlayer = "00000000-0000-4000-8000-000000000004";
const moment = "00000000-0000-4000-8000-000000000005";
const source = "00000000-0000-4000-8000-000000000006";
const evidence = "00000000-0000-4000-8000-000000000007";
const media = "00000000-0000-4000-8000-000000000008";
const unrelatedMedia = "00000000-0000-4000-8000-000000000009";
const video = "00000000-0000-4000-8000-000000000010";
const run = "00000000-0000-4000-8000-000000000011";

type Result = { record: Record<string, unknown>; duplicate: boolean };
async function command(input: Record<string, unknown>, actorId = actor): Promise<Result> {
  const value = { commandId: randomUUID(), reason: "Reviewed supporting evidence", ...input };
  const result = await db.query<{ value: Result }>("select public.mutate_intelligence_workflow($1::uuid,$2::jsonb) as value", [actorId, JSON.stringify(value)]);
  return result.rows[0].value;
}
async function scopedCommand(environment: string | null, input: Record<string, unknown>, actorId = actor): Promise<Result> {
  const value = { commandId: randomUUID(), reason: "Reviewed supporting evidence", ...input };
  const result = await db.query<{ value: Result }>("select public.mutate_intelligence_workflow_in_environment($1::uuid,$2::jsonb,$3::text) as value", [actorId, JSON.stringify(value), environment]);
  return result.rows[0].value;
}
async function scopedRead(environment: string) {
  const result = await db.query<{ value: { opportunities: Array<Record<string,unknown>>; activations: Array<Record<string,unknown>>; momentAssetLinks: Array<Record<string,unknown>>; history: Array<Record<string,unknown>> } }>(
    "select public.read_intelligence_workflows_in_environment($1::uuid,$2::text) as value", [player, environment]);
  return result.rows[0].value;
}
function opportunity(extra: Record<string, unknown> = {}) {
  return { action: "register_opportunity", opportunityKey: "graph:anniversary:athlete:moment", playerId: player, momentId: moment,
    runId: null, ruleVersion: "v1", signalKeys: ["graph:anniversary:moment"], evidenceIds: [evidence],
    inputSnapshot: { basis: "reviewed_evidence", evidenceIds: [evidence], asOf: "2026-10-05" },
    title: "Review anniversary", explanation: "Documented Moment anniversary", expiresAt: null, ...extra };
}
async function draft(opportunityId: unknown) {
  return command({ action: "create_activation", opportunityId, title: "Alumni retrospective", description: "Draft editorial review only",
    proposedBrands: [{ name: "Proposed example brand", status: "proposed" }], intendedUse: "internal_review", releaseAt: null });
}
async function link(extra: Record<string, unknown> = {}) {
  return command({ action: "review_asset_link", playerId: player, momentId: moment, legacyMediaId: media, legacyVideoId: null,
    status: "verified", evidenceIds: [evidence], ...extra });
}
async function reviewedDraft() {
  const op = await command(opportunity());
  await command({ action: "review_opportunity", id: op.record.id, expectedRevision: 1, state: "ready", readinessBlockers: [], assigneeId: assignee });
  await command({ action: "review_opportunity", id: op.record.id, expectedRevision: 2, state: "accepted" });
  const assetLink = await link();
  const activation = await draft(op.record.id);
  const edited = await command({ action: "edit_activation", id: activation.record.id, expectedRevision: 1, title: "Alumni retrospective",
    description: "Draft editorial review only", proposedBrands: [], intendedUse: "internal_review", releaseAt: null, assetLinkIds: [assetLink.record.id] });
  const reviewed = await command({ action: "transition_activation", id: activation.record.id, expectedRevision: 2, state: "awaiting_approvals" });
  return { op, assetLink, activation: reviewed, edited };
}

beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema private; create schema auth; grant usage on schema private,auth to service_role;
    create table auth.users(id uuid primary key); create table players(id uuid primary key); create table sports_events(id uuid primary key);
    create table media(id uuid primary key,player_id uuid not null,kind text,license_status text,public_locker_approved boolean,license_kind text);
    create table videos(id uuid primary key,player_id uuid);
    create table analytics_events(id uuid primary key default gen_random_uuid(),client_event_id uuid unique,event_name text,user_id uuid,athlete_id uuid,session_id uuid,source text,page text,properties jsonb,occurred_at timestamptz);
    grant select on auth.users,media,videos,players to service_role;`);
  for (const file of ["20260930181840_intelligence_graph_foundation.sql", "20261005183837_intelligence_measured_delivery.sql", "20261005184406_intelligence_review_workflows.sql", "20261005231344_production_review_environment.sql"]) {
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  }
  await db.exec(`insert into auth.users values('${actor}'),('${assignee}'); insert into players values('${player}'),('${otherPlayer}');
    insert into intelligence_sources(id,source_key,name,provider) values('${source}','archive','Reviewed archive','archive');
    insert into moments(id,title,status) values('${moment}','Reviewed career Moment','verified');
    insert into moment_athletes(moment_id,player_id,relationship_type,status) values('${moment}','${player}','participant','verified');
    insert into intelligence_evidence(id,player_id,moment_id,source_id,fact_type,statement,status) values('${evidence}','${player}','${moment}','${source}','moment','Reviewed event evidence','verified');
    insert into media values('${media}','${player}','photo','approved',true,'legacy_display'),('${unrelatedMedia}','${otherPlayer}','photo','approved',true,'legacy_display');
    insert into videos values('${video}','${player}');
    insert into intelligence_engine_runs(id,environment,player_id,moment_id,subject_kind,subject_key,scope_key,feature_version,rule_version,as_of,computed_at,event_watermark,input_revision,input_snapshot_hash,input_snapshot,features,signals)
      values('${run}','development','${player}',null,'athlete','athlete:${player}','public_audience','engagement-v1','measured-v1',now(),now(),now(),1,repeat('a',64),'{}','{}',
        '{"signals":[{"key":"measured:discovery:athlete","playerId":"${player}","momentId":null}],"opportunities":[{"key":"measured:redistribution:athlete","playerId":"${player}","momentId":null}]}');`);
}, 30000);
beforeEach(async () => {
  await db.exec(`reset role; truncate intelligence_workflow_history,intelligence_activation_assets,intelligence_activation_drafts,intelligence_moment_asset_links,intelligence_review_opportunities;
    update media set license_status='approved',public_locker_approved=true;
    update moments set status='verified'; update moment_athletes set status='verified'; update intelligence_evidence set status='verified';`);
});
afterAll(async () => { await db.close(); });

describe("production review environment isolation", () => {
  it("runs production actor validation, assignment, revisions and durable scoped history through real RPCs", async () => {
    const input = { ...opportunity(), commandId: randomUUID() };
    const registered = await scopedCommand("production", input);
    expect(registered.record).toMatchObject({ environment: "production", created_by: actor, revision: 1 });
    const reviewed = await scopedCommand("production", { action: "review_opportunity", id: registered.record.id, expectedRevision: 1, state: "in_review", assigneeId: assignee });
    expect(reviewed.record).toMatchObject({ environment: "production", state: "in_review", updated_by: actor, assignee_id: assignee, revision: 2 });
    expect(await scopedCommand("production", input)).toEqual({ record: registered.record, duplicate: true });
    await expect(scopedCommand("production", { action: "review_opportunity", id: registered.record.id, expectedRevision: 1, state: "ready" })).rejects.toThrow("revision_conflict");
    const rows = await scopedRead("production");
    expect(rows.opportunities).toHaveLength(1); expect(rows.history).toHaveLength(2);
    expect(rows.history.every(row => row.environment === "production" && row.actor_id === actor)).toBe(true);
    expect(rows.history.find(row => row.action === "review_opportunity")).toMatchObject({ revision: 2 });
    await expect(scopedCommand("production", opportunity({ opportunityKey: "unknown-actor" }), randomUUID())).rejects.toThrow("actor_required");
  });

  it("isolates identical stable keys and command IDs and keeps legacy reads development-only", async () => {
    const input = { ...opportunity(), commandId: randomUUID() };
    const dev = await command(input), prod = await scopedCommand("production", input);
    expect(dev.record.id).not.toBe(prod.record.id);
    expect(await command(input)).toEqual({ record: dev.record, duplicate: true });
    expect(await scopedCommand("production", input)).toEqual({ record: prod.record, duplicate: true });
    expect((await scopedRead("development")).opportunities.map(row => row.id)).toEqual([dev.record.id]);
    expect((await scopedRead("production")).opportunities.map(row => row.id)).toEqual([prod.record.id]);
    const legacy = await db.query<{ value: { opportunities: Array<{id:string}>; history: Array<{environment:string}> } }>("select public.read_intelligence_workflows($1::uuid) as value", [player]);
    expect(legacy.rows[0].value.opportunities.map(row => row.id)).toEqual([dev.record.id]);
    expect(legacy.rows[0].value.history.every(row => row.environment === "development")).toBe(true);
  });

  it("refuses IDs from the other environment before mutation or new audit entries", async () => {
    const dev = await command(opportunity());
    const production = await scopedCommand("production", opportunity());
    for (const [environment, id] of [["production", dev.record.id], ["development", production.record.id]] as const) {
      await expect(scopedCommand(environment, { action: "review_opportunity", id, expectedRevision: 1, state: "in_review" })).rejects.toThrow("query returned no rows");
      await expect(scopedCommand(environment, { action: "create_activation", opportunityId: id, title: "Wrong scope", description: "No draft may cross environments", proposedBrands: [], intendedUse: "internal_review" })).rejects.toThrow("query returned no rows");
    }
    expect((await scopedRead("development")).history).toHaveLength(1);
    expect((await scopedRead("production")).history).toHaveLength(1);
    expect((await db.query("select state,revision from intelligence_review_opportunities")).rows).toEqual([{ state: "candidate", revision: 1 }, { state: "candidate", revision: 1 }]);
  });

  it("keeps production activation assets and audit relationships in their parent environment", async () => {
    const prodOp = await scopedCommand("production", opportunity());
    const production = await scopedCommand("production", { action: "create_activation", opportunityId: prodOp.record.id, title: "Production review", description: "Internal draft only", proposedBrands: [], intendedUse: "internal_review" });
    const devLink = await link();
    const prodLink = await scopedCommand("production", { action: "review_asset_link", playerId: player, momentId: moment, legacyMediaId: media, status: "verified", evidenceIds: [evidence] });
    const edit = { action: "edit_activation", id: production.record.id, expectedRevision: 1, title: "Production review", description: "Internal draft only", proposedBrands: [], intendedUse: "internal_review" };
    await expect(scopedCommand("production", { ...edit, assetLinkIds: [devLink.record.id] })).rejects.toThrow("activation_asset_context_mismatch");
    const updated = await scopedCommand("production", { ...edit, assetLinkIds: [prodLink.record.id] });
    expect(updated.record).toMatchObject({ environment: "production", revision: 2, metrics: null });
    expect((await scopedRead("production")).activations[0]).toMatchObject({ asset_link_ids: [prodLink.record.id], publishing_allowed: false });
    await expect(db.query("insert into intelligence_activation_assets(environment,activation_id,moment_asset_link_id) values('development',$1,$2)", [production.record.id, devLink.record.id])).rejects.toThrow();
    await expect(db.query("insert into intelligence_workflow_history(environment,activation_id,command_id,actor_id,action,reason,revision,request_hash,after_snapshot) values('development',$1,$2,$3,'forged','Must fail',1,repeat('a',32),'{}')", [production.record.id, randomUUID(), actor])).rejects.toThrow("foreign key");
    await expect(db.query("update intelligence_activation_drafts set environment='development' where id=$1", [production.record.id])).rejects.toThrow(/immutable/);
    await expect(scopedCommand("development", { action: "transition_activation", id: production.record.id, expectedRevision: 2, state: "paused" })).rejects.toThrow("query returned no rows");
    for (const state of ["approved", "scheduled", "live", "completed"]) {
      await expect(scopedCommand("production", { action: "transition_activation", id: production.record.id, expectedRevision: 2, state })).rejects.toThrow("rights_and_publishing_adapter_unavailable");
    }
    expect((await scopedRead("production")).activations[0]).toMatchObject({ state: "draft", revision: 2, metrics: null, publishing_allowed: false });
  });

  it("requires preserved engine lineage from the same environment", async () => {
    const candidate = opportunity({ momentId: null, runId: run, ruleVersion: "measured-v1", opportunityKey: "measured:redistribution:athlete", signalKeys: ["measured:discovery:athlete"], evidenceIds: [] });
    await expect(scopedCommand("production", candidate)).rejects.toThrow("engine_run_context_mismatch");
    const prodRun = randomUUID();
    await db.query(`insert into intelligence_engine_runs(id,environment,player_id,moment_id,subject_kind,subject_key,scope_key,feature_version,rule_version,as_of,computed_at,event_watermark,input_revision,input_snapshot_hash,input_snapshot,features,signals)
      select $1,'production',player_id,moment_id,subject_kind,subject_key,scope_key,feature_version,rule_version,as_of,computed_at,event_watermark,input_revision,input_snapshot_hash,input_snapshot,features,signals from intelligence_engine_runs where id=$2`, [prodRun, run]);
    expect((await scopedCommand("production", { ...candidate, runId: prodRun })).record).toMatchObject({ environment: "production", run_id: prodRun, moment_id: null });
    await expect(command({ ...candidate, runId: prodRun })).rejects.toThrow("engine_run_context_mismatch");
  });

  it("resolves production review clearance fresh and isolates link-rejection invalidation", async () => {
    const production = await scopedCommand("production", opportunity());
    await scopedCommand("production", { action: "review_opportunity", id: production.record.id, expectedRevision: 1, state: "ready", readinessBlockers: [] });
    await scopedCommand("production", { action: "review_opportunity", id: production.record.id, expectedRevision: 2, state: "accepted" });
    const assetInput = { action: "review_asset_link", playerId: player, momentId: moment, legacyMediaId: media, status: "verified", evidenceIds: [evidence] };
    const prodLink = await scopedCommand("production", assetInput), devLink = await command(assetInput);
    const activation = await scopedCommand("production", { action: "create_activation", opportunityId: production.record.id, title: "Editorial review", description: "No publishing rights", intendedUse: "internal_review", proposedBrands: [] });
    await scopedCommand("production", { action: "edit_activation", id: activation.record.id, expectedRevision: 1, title: "Editorial review", description: "No publishing rights", intendedUse: "internal_review", proposedBrands: [], assetLinkIds: [prodLink.record.id] });
    await scopedCommand("production", { action: "transition_activation", id: activation.record.id, expectedRevision: 2, state: "awaiting_approvals" });
    expect((await scopedRead("production")).activations[0]).toMatchObject({ revision: 3, current_media_review_valid: true, publishing_allowed: false });
    await command({ ...assetInput, id: devLink.record.id, expectedRevision: 1, status: "rejected" });
    expect((await scopedRead("production")).activations[0]).toMatchObject({ revision: 3, current_media_review_valid: true });
    await db.exec("update media set license_status='revoked'");
    expect((await scopedRead("production")).activations[0]).toMatchObject({ revision: 3, current_media_review_valid: false, publishing_allowed: false });
    await scopedCommand("production", { ...assetInput, id: prodLink.record.id, expectedRevision: 1, status: "rejected" });
    const rows = await scopedRead("production");
    expect(rows.activations[0]).toMatchObject({ revision: 4, state: "draft", review_approved_revision: null, current_media_review_valid: false });
    expect(rows.history.find(row => row.action === "asset_link_review_invalidated")).toMatchObject({ environment: "production", actor_id: actor, activation_id: activation.record.id, revision: 4 });
    expect((await scopedRead("development")).history.every(row => row.activation_id !== activation.record.id)).toBe(true);
  });

  it("rejects invalid scopes and denies both scoped RPCs to browser roles", async () => {
    for (const environment of [null, "preview", "synthetic", ""]) {
      await expect(scopedCommand(environment, opportunity())).rejects.toThrow("invalid_workflow_environment");
      await expect(db.query("select read_intelligence_workflows_in_environment($1,$2)", [player, environment])).rejects.toThrow("invalid_workflow_environment");
    }
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await expect(scopedCommand("production", opportunity())).rejects.toThrow("permission denied");
      await expect(scopedRead("production")).rejects.toThrow("permission denied");
      await db.exec("reset role");
    }
  });
});

describe("durable internal development workflow SQL", () => {
  it("persists actor, assignment and history atomically; engine refresh preserves dismissal", async () => {
    const registered = await command(opportunity());
    const dismissed = await command({ action: "review_opportunity", id: registered.record.id, expectedRevision: 1, state: "dismissed", assigneeId: assignee });
    const refreshed = await command(opportunity({ title: "Refreshed candidate title" }));
    expect(refreshed.duplicate).toBe(true);
    expect(refreshed.record).toMatchObject({ id: registered.record.id, state: "dismissed", revision: 2, assignee_id: assignee });
    expect(dismissed.record.updated_by).toBe(actor);
    const history = (await db.query<{ actor_id: string; action: string }>("select actor_id,action from intelligence_workflow_history order by created_at,id")).rows;
    expect(history).toHaveLength(3);
    expect(history.every((entry) => entry.actor_id === actor)).toBe(true);
    await expect(command({ action: "review_opportunity", id: registered.record.id, expectedRevision: 2, state: "accepted" })).rejects.toThrow("terminal_review_decision_preserved");
  });

  it("rejects stale optimistic revisions without changing state or adding audit", async () => {
    const registered = await command(opportunity());
    await command({ action: "review_opportunity", id: registered.record.id, expectedRevision: 1, state: "in_review" });
    await expect(command({ action: "review_opportunity", id: registered.record.id, expectedRevision: 1, state: "accepted" })).rejects.toThrow("revision_conflict");
    await expect(command({ action: "review_opportunity", id: registered.record.id, state: "accepted" })).rejects.toThrow("revision_conflict");
    expect((await db.query("select state,revision from intelligence_review_opportunities")).rows).toEqual([{ state: "in_review", revision: 2 }]);
    expect((await db.query("select count(*)::int as count from intelligence_workflow_history")).rows[0]).toEqual({ count: 2 });
  });

  it("replays one command without duplicate mutation and rejects command-ID reuse for different data", async () => {
    const input = { ...opportunity(), commandId: randomUUID() };
    const first = await command(input);
    expect(await command(input)).toEqual({ record: first.record, duplicate: true });
    await expect(command({ ...input, title: "Different command" })).rejects.toThrow("command_identity_collision");
    expect((await db.query("select count(*)::int as count from intelligence_workflow_history")).rows[0]).toEqual({ count: 1 });
  });

  it("requires explicit ready review before acceptance and never clears blockers implicitly", async () => {
    const registered = await command(opportunity());
    await expect(command({ action: "review_opportunity", id: registered.record.id, expectedRevision: 1, state: "accepted", readinessBlockers: [] })).rejects.toThrow("opportunity_ready_required");
    await expect(command({ action: "review_opportunity", id: registered.record.id, expectedRevision: 1, state: "ready" })).rejects.toThrow("readiness_blocked");
    expect((await db.query("select state,revision,readiness_blockers from intelligence_review_opportunities")).rows).toEqual([{ state: "candidate", revision: 1, readiness_blockers: ["permissions_and_measurement_review_required"] }]);
    await command({ action: "review_opportunity", id: registered.record.id, expectedRevision: 1, state: "ready", readinessBlockers: [] });
    await expect(command({ action: "review_opportunity", id: registered.record.id, expectedRevision: 2, state: "accepted", readinessBlockers: ["rights_unknown"] })).rejects.toThrow("readiness_blocked");
    const accepted = await command({ action: "review_opportunity", id: registered.record.id, expectedRevision: 2, state: "accepted" });
    expect(accepted.record).toMatchObject({ state: "accepted", revision: 3, readiness_blockers: [] });
    const retryInput = { action: "review_opportunity", commandId: randomUUID(), id: registered.record.id, expectedRevision: 3, state: "accepted" };
    const repeated = await command(retryInput);
    expect(await command(retryInput)).toEqual({ record: repeated.record, duplicate: true });
    expect((await db.query("select count(*)::int as count from intelligence_workflow_history")).rows[0]).toEqual({ count: 4 });
  });

  it("retains expired decisions and blocks acceptance after the deadline", async () => {
    const registered = await command(opportunity({ expiresAt: "2020-01-01T00:00:00Z" }));
    await expect(command({ action: "review_opportunity", id: registered.record.id, expectedRevision: 1, state: "accepted" })).rejects.toThrow("opportunity_expired");
    await command({ action: "review_opportunity", id: registered.record.id, expectedRevision: 1, state: "expired" });
    expect((await command(opportunity())).record.state).toBe("expired");
    await expect(draft(registered.record.id)).rejects.toThrow("opportunity_not_actionable");
  });

  it("requires reviewed canonical Moment/evidence context and a matching engine run", async () => {
    await expect(command(opportunity({ playerId: otherPlayer }))).rejects.toThrow("verified_moment_relationship_required");
    await expect(command(opportunity({ evidenceIds: [randomUUID()] }))).rejects.toThrow("verified_evidence_context_required");
    await expect(command(opportunity({ playerId: otherPlayer, momentId: null, evidenceIds: [], runId: run }))).rejects.toThrow("engine_run_context_mismatch");
    await expect(command(opportunity({ momentId: null, evidenceIds: [], runId: null }))).rejects.toThrow("input_lineage_required");
  });

  it("checks qualified legacy asset XOR, ownership and verified Moment association", async () => {
    await expect(link({ legacyVideoId: video })).rejects.toThrow();
    await expect(link({ legacyMediaId: null, legacyVideoId: null })).rejects.toThrow();
    await expect(link({ legacyMediaId: unrelatedMedia })).rejects.toThrow("asset_athlete_relationship_required");
    await db.exec("update moment_athletes set status='candidate'");
    await expect(link()).rejects.toThrow("verified_moment_relationship_required");
    expect((await db.query("select count(*)::int as count from intelligence_moment_asset_links")).rows[0]).toEqual({ count: 0 });
  });

  it("preserves athlete-level measured lineage without inventing a Moment or signal", async () => {
    const measured = opportunity({ opportunityKey: "measured:redistribution:athlete", signalKeys: ["measured:discovery:athlete"],
      momentId: null, evidenceIds: [], runId: run, ruleVersion: "measured-v1", inputSnapshot: { runId: run } });
    expect((await command(measured)).record).toMatchObject({ moment_id: null, run_id: run });
    await expect(command({ ...measured, opportunityKey: "invented:opportunity" })).rejects.toThrow("engine_signal_lineage_mismatch");
    await expect(command({ ...measured, opportunityKey: "measured:redistribution:athlete:other", signalKeys: ["invented:signal"] })).rejects.toThrow("engine_signal_lineage_mismatch");
    await expect(command({ ...measured, opportunityKey: "measured:redistribution:athlete", momentId: moment })).rejects.toThrow("opportunity_identity_collision");
  });

  it("rolls back invalid proposed partnership and illustrative metrics; drafts retain unknown metrics", async () => {
    const registered = await command(opportunity());
    await expect(command({ action: "create_activation", opportunityId: registered.record.id, title: "Draft", description: "Review", intendedUse: "internal_review", proposedBrands: [{ name: "Unconfirmed brand", status: "confirmed" }] })).rejects.toThrow("brand_is_proposal_only");
    expect((await db.query("select count(*)::int as count from intelligence_activation_drafts")).rows[0]).toEqual({ count: 0 });
    const activation = await draft(registered.record.id);
    expect(activation.record.metrics).toBeNull();
    await expect(db.exec(`update intelligence_activation_drafts set metrics='{"reach":100000}' where id='${activation.record.id}'`)).rejects.toThrow();
    expect((await db.query("select count(*)::int as count from intelligence_workflow_history")).rows[0]).toEqual({ count: 2 });
  });

  it("invalidates editorial approvals after substantive metadata/asset/use edits", async () => {
    const { activation, assetLink } = await reviewedDraft();
    expect(activation.record).toMatchObject({ state: "awaiting_approvals", revision: 3, review_approved_revision: 3, metrics: null });
    const edited = await command({ action: "edit_activation", id: activation.record.id, expectedRevision: 3, title: "Changed title", description: "Changed usage plan",
      intendedUse: "print", proposedBrands: [{ name: "Another proposed brand", status: "proposed" }], releaseAt: "2026-11-01T12:00:00Z", assetLinkIds: [assetLink.record.id] });
    expect(edited.record).toMatchObject({ state: "draft", revision: 4, review_approved_revision: null, intended_use: "print", metrics: null });
  });

  it("synchronously withholds current approval after legacy revocation, independent of analytics", async () => {
    const { activation } = await reviewedDraft();
    await db.exec(`update media set public_locker_approved=false,license_status='rejected' where id='${media}'`);
    const read = (await db.query<{ value: { activations: Array<Record<string, unknown>> } }>("select read_intelligence_workflows($1::uuid) as value", [player])).rows[0].value;
    expect(read.activations[0]).toMatchObject({ current_media_review_valid: false, publishing_allowed: false });
    await expect(command({ action: "transition_activation", id: activation.record.id, expectedRevision: 3, state: "awaiting_approvals" })).rejects.toThrow("current_asset_review_required");
  });

  it("never grants publication from legacy display flags", async () => {
    const { activation } = await reviewedDraft();
    for (const state of ["approved", "scheduled", "live", "completed"]) {
      await expect(command({ action: "transition_activation", id: activation.record.id, expectedRevision: 3, state })).rejects.toThrow("rights_and_publishing_adapter_unavailable");
    }
    expect((await db.query("select state,revision from intelligence_activation_drafts")).rows).toEqual([{ state: "awaiting_approvals", revision: 3 }]);
  });

  it("rejecting a reviewed association atomically invalidates affected drafts with actor/history", async () => {
    const { activation, assetLink } = await reviewedDraft();
    await link({ id: assetLink.record.id, expectedRevision: 1, status: "rejected" });
    const rows = (await db.query("select state,revision,review_approved_revision,updated_by from intelligence_activation_drafts")).rows;
    expect(rows).toEqual([{ state: "draft", revision: 4, review_approved_revision: null, updated_by: actor }]);
    const history = (await db.query("select action,actor_id from intelligence_workflow_history where activation_id=$1 and revision=4", [activation.record.id])).rows;
    expect(history).toEqual([{ action: "asset_link_review_invalidated", actor_id: actor }]);
  });

  it("qualified legacy video references are not treated as rights-cleared assets", async () => {
    const assetLink = await link({ legacyMediaId: null, legacyVideoId: video });
    const eligible = (await db.query("select private.intelligence_workflow_asset_display_eligible($1::uuid) as allowed", [assetLink.record.id])).rows[0];
    expect(eligible).toEqual({ allowed: false });
  });

  it("denies all browser access and service history updates/deletion while permitting service RPC", async () => {
    const tables = ["intelligence_review_opportunities", "intelligence_activation_drafts", "intelligence_activation_assets", "intelligence_moment_asset_links", "intelligence_workflow_history"];
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      try {
        for (const table of tables) {
          await expect(db.query(`select * from ${table}`)).rejects.toThrow(/permission denied/);
          await expect(db.exec(`delete from ${table}`)).rejects.toThrow(/permission denied/);
        }
        await expect(command(opportunity())).rejects.toThrow(/permission denied/);
        await expect(db.query("select read_intelligence_workflows($1::uuid)", [player])).rejects.toThrow(/permission denied/);
      } finally { await db.exec("reset role"); }
    }
    await db.exec("set role service_role");
    try {
      expect((await command(opportunity())).record.player_id).toBe(player);
      await expect(db.exec("update intelligence_workflow_history set reason='rewrite'")).rejects.toThrow(/permission denied/);
      await expect(db.exec("delete from intelligence_workflow_history")).rejects.toThrow(/permission denied/);
    } finally { await db.exec("reset role"); }
    const rls = (await db.query<{ relrowsecurity: boolean }>("select relrowsecurity from pg_class where relname=any($1::text[])", [tables])).rows;
    expect(rls).toHaveLength(5);
    expect(rls.every((row) => row.relrowsecurity)).toBe(true);
  });
});
