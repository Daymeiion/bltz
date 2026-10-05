import { describe, expect, it } from "vitest";
import { evaluateMeasuredSignals, intelligenceFeatureSnapshotSchema, markFeatureSnapshotStale, measuredSignalEvaluationSchema, parseIntelligenceFeatureSnapshot, parseMeasuredSignalEvaluation, projectIntelligenceFeatures } from "@/lib/intelligence/features";
import type { FeatureProjectionEvent, IntelligenceFeatureSnapshot } from "@/lib/intelligence/features";

const playerId = "10000000-0000-4000-8000-000000000001";
const asOf = "2026-10-04T00:00:00Z";
const instrumentation = ["locker_viewed"];
const id = (number: number) => `60000000-0000-4000-8000-${number.toString().padStart(12, "0")}`;
function snapshot(): IntelligenceFeatureSnapshot {
  const events: FeatureProjectionEvent[] = Array.from({ length: 60 }, (_, number) => ({ event_id: id(number), schema_version: 1, event_version: "legacy-v1", event_name: "locker_viewed", occurred_at: number < 40 ? "2026-09-30T12:00:00Z" : "2026-09-23T12:00:00Z", received_at: asOf, environment: "development", surface: "public_locker", producer: "bltz_collector", actor_kind: "anonymous", measurement_basis: "unverified_client", audience_eligible: true, subject_player_id: playerId, moment_id: null, asset_id: null, asset_model: null, session_id: id(number + 1000), scope_key: "public_audience", source_channel: "unknown", properties: {} }));
  return projectIntelligenceFeatures({ subject: { kind: "athlete", playerId }, scope: { kind: "public_audience" }, environment: "development", events, asOf, computedAt: asOf, eventWatermark: asOf, runId: id(9000), inputSnapshotHash: "synthetic-v1", inputSnapshotReference: "synthetic-test:contract", inputRevision: 1, coverage: { current: { state: "complete", start: "2026-09-27T00:00:00Z", end: asOf, fraction: 1, measurementVersion: "observations-v1", instrumentedEvents: instrumentation }, baseline: { state: "complete", start: "2026-09-20T00:00:00Z", end: "2026-09-27T00:00:00Z", fraction: 1, measurementVersion: "observations-v1", instrumentedEvents: instrumentation } } });
}
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));

describe("strict feature serving contracts", () => {
  it("parses real pure-projection output and actual deterministic detector output", () => {
    const projected = snapshot();
    expect(parseIntelligenceFeatureSnapshot(JSON.parse(JSON.stringify(projected)))).toEqual(projected);
    const result = evaluateMeasuredSignals(projected);
    expect(parseMeasuredSignalEvaluation(JSON.parse(JSON.stringify(result)))).toEqual(result);
    expect(result.signals).toHaveLength(1);
  });

  it("rejects unsupported versions, synthetic live environment, arbitrary JSON and wrong scope", () => {
    const projected = snapshot();
    expect(intelligenceFeatureSnapshotSchema.safeParse({ ...projected, featureVersion: "unreviewed-version" }).success).toBe(false);
    expect(intelligenceFeatureSnapshotSchema.safeParse({ ...projected, environment: "synthetic" }).success).toBe(false);
    expect(intelligenceFeatureSnapshotSchema.safeParse({ ...projected, provider_payload: { secret: "synthetic-not-a-real-secret" } }).success).toBe(false);
    expect(intelligenceFeatureSnapshotSchema.safeParse({ ...projected, scopeKey: "internal_admin" }).success).toBe(false);
    const nested = copy(projected); Object.assign(nested.current, { private_notes: "synthetic-private-note" });
    expect(intelligenceFeatureSnapshotSchema.safeParse(nested).success).toBe(false);
  });

  it("rejects impossible complete coverage and fabricated metric states or units", () => {
    const missing = copy(snapshot()); missing.current.coverage.start = null;
    expect(intelligenceFeatureSnapshotSchema.safeParse(missing).success).toBe(false);
    const partial = copy(snapshot()); partial.current.coverage.fraction = 0.5;
    expect(intelligenceFeatureSnapshotSchema.safeParse(partial).success).toBe(false);
    const metric = copy(snapshot()); metric.current.metrics.lockerOpens = { ...metric.current.metrics.lockerOpens, state: "unknown", value: 0 };
    expect(intelligenceFeatureSnapshotSchema.safeParse(metric).success).toBe(false);
    const unit = copy(snapshot()); unit.current.metrics.lockerOpens.value = 0.5;
    expect(intelligenceFeatureSnapshotSchema.safeParse(unit).success).toBe(false);
    const missingZero = copy(snapshot()); missingZero.current.metrics.lockerOpens = { ...missingZero.current.metrics.lockerOpens, state: "observed", value: null };
    expect(intelligenceFeatureSnapshotSchema.safeParse(missingZero).success).toBe(false);
    const falselyObserved = copy(snapshot()); falselyObserved.current.coverage = { ...falselyObserved.current.coverage, state: "partial", fraction: null }; falselyObserved.quality.comparable = false;
    expect(intelligenceFeatureSnapshotSchema.safeParse(falselyObserved).success).toBe(false);
    const falseActivity = copy(snapshot()); falseActivity.comparisons.lockerSessions.activity = "new_activity";
    expect(intelligenceFeatureSnapshotSchema.safeParse(falseActivity).success).toBe(false);
  });

  it("rejects window, event watermark and measurement lineage inconsistencies", () => {
    const bounds = copy(snapshot()); bounds.current.window.start = "2026-09-26T00:00:00Z";
    expect(intelligenceFeatureSnapshotSchema.safeParse(bounds).success).toBe(false);
    const watermark = copy(snapshot()); watermark.provenance.eventWatermark = "2026-10-05T00:00:00Z";
    expect(intelligenceFeatureSnapshotSchema.safeParse(watermark).success).toBe(false);
    const versions = copy(snapshot()); versions.provenance.measurementVersions.current = "another-v1";
    expect(intelligenceFeatureSnapshotSchema.safeParse(versions).success).toBe(false);
    const incomparable = copy(snapshot()); incomparable.baseline.coverage.instrumentedEvents = ["media_opened"];
    expect(intelligenceFeatureSnapshotSchema.safeParse(incomparable).success).toBe(false);
    const percentage = copy(snapshot()); percentage.comparisons.lockerSessions.growthFraction = 9;
    expect(intelligenceFeatureSnapshotSchema.safeParse(percentage).success).toBe(false);
    const change = copy(snapshot()); change.comparisons.lockerSessions.absoluteChange = 999;
    expect(intelligenceFeatureSnapshotSchema.safeParse(change).success).toBe(false);
  });

  it("rejects cross-subject signals, fabricated evidence confidence and missing opportunity lineage", () => {
    const result = evaluateMeasuredSignals(snapshot());
    const fakeConfidence = copy(result); Object.assign(fakeConfidence.signals[0], { confidence: 0.99 });
    expect(measuredSignalEvaluationSchema.safeParse(fakeConfidence).success).toBe(false);
    const fakeMoment = copy(result); fakeMoment.signals[0].momentId = "20000000-0000-4000-8000-000000000001";
    expect(measuredSignalEvaluationSchema.safeParse(fakeMoment).success).toBe(false);
    const missing = copy(result); missing.opportunities[0].signalKeys = ["synthetic-nonexistent-signal"];
    expect(measuredSignalEvaluationSchema.safeParse(missing).success).toBe(false);
    const repeated = copy(result); repeated.signals.push(copy(repeated.signals[0]));
    expect(measuredSignalEvaluationSchema.safeParse(repeated).success).toBe(false);
  });

  it("marks read-time staleness without advancing lineage, converting missing to zero or modifying stored JSON", () => {
    const projected = snapshot();
    const before = JSON.stringify(projected);
    const stale = markFeatureSnapshotStale(projected, "2026-10-04T00:30:00Z");
    expect(stale.quality).toMatchObject({ stale: true, state: "stale" });
    expect(stale.current.metrics.lockerOpens).toMatchObject({ value: 40, state: "stale" });
    expect(stale.current.metrics.videoStarts).toMatchObject({ value: null, state: "unknown" });
    expect(stale.comparisons.athleteDistributedSessions.state).toBe("unknown");
    expect(stale.comparisons.lockerSessions).toMatchObject({ state: "stale", growthFraction: null });
    expect(stale.provenance).toEqual(projected.provenance);
    expect(JSON.stringify(projected)).toBe(before);
    expect(parseIntelligenceFeatureSnapshot(stale)).toEqual(stale);
    expect(evaluateMeasuredSignals(stale).signals.map(item => item.type)).toEqual(["measurement_coverage_failure"]);
  });

  it("preserves recent snapshots and rejects invalid read-time thresholds", () => {
    const projected = snapshot();
    expect(markFeatureSnapshotStale(projected, "2026-10-04T00:10:00Z")).toEqual(projected);
    expect(() => markFeatureSnapshotStale(projected, "2026-10-04T00:30:00Z", 0)).toThrow("invalid_feature_staleness");
    expect(() => parseIntelligenceFeatureSnapshot({})).toThrow();
  });
});
