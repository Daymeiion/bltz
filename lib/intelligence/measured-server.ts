import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { getAnalyticsRuntimeEnvironment, type AnalyticsRuntimeEnvironment } from "@/lib/analytics/bltz-event";
import { queryFeatureEvents } from "@/lib/analytics/delivery/tinybird";
import { authorizeIntelligenceLab } from "./lab-server";
import { evaluateMeasuredSignals, featureSubjectKey, projectIntelligenceFeatures, SEVEN_DAYS_MS, markFeatureSnapshotStale, parseIntelligenceFeatureSnapshot,
  type IntelligenceFeatureSnapshot, type MeasuredSignalEvaluation, type FeatureCoverage } from "./features";
import { canonicalInputJson, measuredInputHash } from "./measured-integrity";

export interface WorkspaceMeasuredData {
  state: "ready" | "unavailable"; environment: AnalyticsRuntimeEnvironment | null; reason: string | null;
  snapshot: IntelligenceFeatureSnapshot | null; evaluation: MeasuredSignalEvaluation | null;
  refreshAllowed?: boolean;
}
export const unavailableMeasurements = (reason = "Measurement is not configured.", refreshAllowed = false, environment: AnalyticsRuntimeEnvironment | null = null): WorkspaceMeasuredData => ({ state: "unavailable",environment,reason,snapshot:null,evaluation:null,refreshAllowed });

/** Authorization precedes service construction even when called outside the workspace. */
export async function loadMeasuredIntelligence(playerId: string, momentId?: string): Promise<WorkspaceMeasuredData> {
  await authorizeIntelligenceLab();
  z.string().uuid().parse(playerId);if(momentId)z.string().uuid().parse(momentId);
  const environment=getAnalyticsRuntimeEnvironment();
  if(!environment)return unavailableMeasurements();
  const db=createServiceClient();
  const subject=momentId?{kind:"moment" as const,playerId,momentId}:{kind:"athlete" as const,playerId};
  const {data:pointer,error}=await db.from("intelligence_feature_snapshots").select("run_id").eq("environment",environment).eq("subject_key",featureSubjectKey(subject)).eq("scope_key","public_audience").eq("feature_version","engagement-v1").maybeSingle();
  if(error||!pointer)return unavailableMeasurements("No measured feature snapshot is available.", true, environment);
  const {data:run,error:runError}=await db.from("intelligence_engine_runs").select("id,input_snapshot,input_snapshot_hash,features,player_id,moment_id,environment,scope_key").eq("id",pointer.run_id).eq("player_id",playerId).eq("environment",environment).eq("scope_key","public_audience").maybeSingle();
  if(runError||!run)return unavailableMeasurements("Feature lineage is unavailable.", true, environment);
  try {
    // Recompute from preserved typed inputs, rather than trust arbitrary output JSON.
    const { measuredInputSchema }=await import("./measured-validation");
    const input=measuredInputSchema.parse(run.input_snapshot);
    if(run.player_id!==playerId||run.environment!==environment||run.scope_key!=="public_audience"||run.moment_id!==(momentId??null)
      ||input.subject.playerId!==playerId||featureSubjectKey(input.subject)!==featureSubjectKey(subject)||input.scope.kind!=="public_audience"||input.environment!==environment
      ||input.events.some(event=>event.environment!==environment)
      ||input.runId!==run.id||input.inputSnapshotHash!==run.input_snapshot_hash||measuredInputHash(input)!==input.inputSnapshotHash)throw new Error("scope or integrity mismatch");
    const preserved=parseIntelligenceFeatureSnapshot(run.features);
    const reproduced=projectIntelligenceFeatures(input);
    if(canonicalInputJson(preserved)!==canonicalInputJson(reproduced))throw new Error("feature output mismatch");
    // Reading never advances an engine run's computation timestamp or watermark.
    const snapshot=markFeatureSnapshotStale(preserved,new Date().toISOString());
    return {state:"ready",environment,reason:null,snapshot,evaluation:evaluateMeasuredSignals(snapshot),refreshAllowed:true};
  }catch{return unavailableMeasurements("Feature inputs could not be validated; metrics are withheld.", true, environment);}
}

/** Explicit gated refresh; no serverless post-response work or hidden schedule. */
export async function refreshMeasuredIntelligence(playerId:string):Promise<{runId:string;projected:boolean}> {
  await authorizeIntelligenceLab();z.string().uuid().parse(playerId);
  const environment=getAnalyticsRuntimeEnvironment();
  if(!environment)throw new Error("development_measurement_disabled");
  const db=createServiceClient();
  const {data:player,error:playerError}=await db.from("players").select("id").eq("id",playerId).maybeSingle();
  if(playerError||!player)throw new Error("measurement_subject_unavailable");
  const now=new Date().toISOString(),start=new Date(Date.parse(now)-2*SEVEN_DAYS_MS).toISOString();
  const queried=await queryFeatureEvents(playerId,start,now,{expectedEnvironment:environment});
  if(!queried.events.length)throw new Error("measurement_has_no_observed_events");
  if(queried.events.some(event=>event.environment!==environment))throw new Error("measurement_environment_mismatch");
  const computedAt=new Date().toISOString();
  // No instrumentation/retention/cadence attestation exists yet. A successful
  // query cannot establish complete coverage; growth signals remain suppressed.
  const coverage:FeatureCoverage={state:"partial",start:null,end:null,fraction:null,measurementVersion:"legacy-v1",instrumentedEvents:["locker_viewed","film_room_opened","photo_gallery_opened","share_link_copied","share_intent"]};
  const runId=randomUUID();
  const watermark=queried.events.reduce((last,event)=>Date.parse(event.received_at)>Date.parse(last)?event.received_at:last,queried.events[0].received_at);
  const draft={subject:{kind:"athlete" as const,playerId},scope:{kind:"public_audience" as const},environment,events:queried.events,asOf:now,computedAt,eventWatermark:watermark,
    runId,inputSnapshotReference:`intelligence_engine_runs:${runId}`,inputRevision:1,coverage:{current:coverage,baseline:coverage},queryTruncated:queried.truncated};
  const hash=measuredInputHash(draft);
  const {measuredInputSchema}=await import("./measured-validation");
  const input=measuredInputSchema.parse({...draft,inputSnapshotHash:hash});
  if(new TextEncoder().encode(canonicalInputJson(input)).byteLength>3*1024*1024)throw new Error("feature_input_too_large");
  const snapshot=projectIntelligenceFeatures(input),evaluation=evaluateMeasuredSignals(snapshot);
  const {data:projected,error}=await db.rpc("store_intelligence_feature_run",{p_run:{id:runId,environment,player_id:playerId,moment_id:null,subject_kind:"athlete",subject_key:featureSubjectKey(input.subject),scope_key:"public_audience",feature_version:snapshot.featureVersion,rule_version:"measured-v1",as_of:now,computed_at:computedAt,event_watermark:watermark,input_revision:input.inputRevision,input_snapshot_hash:hash,input_snapshot:input,features:snapshot,signals:evaluation}});
  if(error)throw new Error("feature_persistence_unavailable");return {runId,projected:projected===true};
}
