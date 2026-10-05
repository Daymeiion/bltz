import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { canProjectFeatureSnapshot, projectIntelligenceFeatures } from "@/lib/intelligence/features";
import type { FeatureCoverage, FeatureProjectionEvent, FeatureProjectionInput, FeatureSubject } from "@/lib/intelligence/features";

// Synthetic canonical UUIDs are never inserted into live tables.
const playerId = "10000000-0000-4000-8000-000000000001";
const otherPlayer = "10000000-0000-4000-8000-000000000002";
const momentId = "20000000-0000-4000-8000-000000000001";
const assetId = "30000000-0000-4000-8000-000000000001";
const organizationId = "40000000-0000-4000-8000-000000000001";
const currentAt = "2026-09-30T12:00:00Z";
const baselineAt = "2026-09-23T12:00:00Z";
const asOf = "2026-10-04T00:00:00Z";
const id = (number: number) => `60000000-0000-4000-8000-${number.toString().padStart(12, "0")}`;
const instrumentation = ["locker_viewed", "moment_opened", "media_opened", "media_viewed", "media_impression", "video_started", "video_completed", "share_link_copied", "share_intent", "locker_shared", "license_requested", "print_requested", "distribution_link_clicked", "session_engaged"];
const coverage = (start: string, end: string): FeatureCoverage => ({ state: "complete", start, end, fraction: 1, measurementVersion: "observations-v1", instrumentedEvents: instrumentation });
const event = (number: number, patch: Partial<FeatureProjectionEvent> = {}): FeatureProjectionEvent => ({ event_id: id(number), schema_version: 1, event_version: "legacy-v1", event_name: "locker_viewed", occurred_at: currentAt, received_at: asOf, environment: "development", surface: "public_locker", producer: "bltz_collector", actor_kind: "anonymous", measurement_basis: "unverified_client", audience_eligible: true, subject_player_id: playerId, moment_id: null, asset_id: null, asset_model: null, session_id: id(number + 1000), scope_key: "public_audience", source_channel: "unknown", properties: {}, ...patch });
const input = (events: FeatureProjectionEvent[] = [], patch: Partial<FeatureProjectionInput> = {}): FeatureProjectionInput => ({ subject: { kind: "athlete", playerId }, scope: { kind: "public_audience" }, environment: "development", events, asOf, computedAt: asOf, eventWatermark: asOf, runId: id(9000), inputSnapshotHash: "synthetic-input-v1", inputSnapshotReference: "synthetic-test:features", inputRevision: 1, coverage: { current: coverage("2026-09-27T00:00:00Z", asOf), baseline: coverage("2026-09-20T00:00:00Z", "2026-09-27T00:00:00Z") }, reviewedMomentIds: [momentId], reviewedAssetBindings: [{ playerId, assetId, assetModel: "legacy_media", momentId: null }, { playerId, assetId, assetModel: "legacy_video", momentId: null }, { playerId, assetId, assetModel: "media_asset", momentId }], ...patch });
const pack = JSON.parse(readFileSync(resolve(process.cwd(), "docs/intelligence/fixtures/BLTZ-Intelligence-Workflow-Fixtures-2026-10-04.json"), "utf8"));

describe("versioned intelligence feature projections", () => {
  it("reconciles supplied 120/40 session example without relabeling sessions as qualified people", () => {
    const scenario = pack.scenarios.find((item: { id: string }) => item.id === "measured_discovery_to_activation_draft");
    const events = [...Array.from({ length: scenario.input.current_window.sessions }, (_, number) => event(number + 1)), ...Array.from({ length: scenario.input.baseline_window.sessions }, (_, number) => event(number + 201, { occurred_at: baselineAt }))];
    const snapshot = projectIntelligenceFeatures(input(events));
    expect(snapshot.current.metrics.eligibleDistinctSessions).toMatchObject({ value: 120, state: "observed" });
    expect(snapshot.current.metrics.qualifiedSessions.value).toBe(0);
    expect(snapshot.comparisons.lockerSessions).toMatchObject({ absoluteChange: scenario.expected.absolute_increase, growthFraction: scenario.expected.growth, state: "observed" });
    expect(snapshot.current.metrics.eligibleDistinctSessions.definition).toContain("not people");
  });

  it("deduplicates a lost-ack replay beyond queue deduplication before aggregation", () => {
    const scenario = pack.scenarios.find((item: { id: string }) => item.id === "duplicate_delivery_and_stale_feature_job");
    const row = event(1, { event_id: scenario.input.event_id });
    const snapshot = projectIntelligenceFeatures(input(Array.from({ length: scenario.input.raw_delivery_count }, () => ({ ...row }))));
    expect(snapshot.quality.logicalEventCount).toBe(scenario.expected.logical_event_count);
    expect(snapshot.quality.duplicateDeliveries).toBe(2);
    expect(snapshot.current.metrics.lockerOpens.value).toBe(1);
  });

  it("quarantines conflicting event identity instead of choosing a favorable payload", () => {
    const row = event(1);
    const snapshot = projectIntelligenceFeatures(input([row, { ...row, event_name: "media_opened" }, { ...row }]));
    expect(snapshot.quality.ambiguousEventIds).toBe(1);
    expect(snapshot.current.metrics.eligibleDistinctSessions.value).toBe(0);
    expect(snapshot.quality.exclusions.ambiguous_event_identity).toBe(1);
  });

  it("separates environment, synthetic, preview, operations and internal activity", () => {
    const events = [event(1), event(1, { environment: "production" }), event(1, { environment: "synthetic" }), event(2, { surface: "preview" }), event(3, { surface: "internal_lab", actor_kind: "internal" }), event(4, { actor_kind: "operational" }), event(5, { audience_eligible: false }), event(6, { subject_player_id: otherPlayer })];
    const snapshot = projectIntelligenceFeatures(input(events));
    expect(snapshot.current.metrics.lockerOpens.value).toBe(1);
    expect(snapshot.quality.exclusions).toMatchObject({ other_environment: 2, ineligible_audience_activity: 4, other_player: 1 });
  });

  it("never mixes public and organization scoped sessions", () => {
    const tenant = event(2, { scope_key: `organization:${organizationId}` });
    const publicSnapshot = projectIntelligenceFeatures(input([event(1), tenant]));
    const tenantSnapshot = projectIntelligenceFeatures(input([event(1), tenant], { scope: { kind: "organization", organizationId } }));
    expect(publicSnapshot.current.metrics.lockerOpens.value).toBe(1);
    expect(tenantSnapshot.current.metrics.lockerOpens.value).toBe(1);
    expect(publicSnapshot.scopeKey).not.toBe(tenantSnapshot.scopeKey);
    const internal = projectIntelligenceFeatures(input([event(1, { scope_key: "internal_admin" })], { scope: { kind: "internal_admin" } }));
    expect(internal.current.metrics.lockerOpens.value).toBe(0);
  });

  it("uses equal half-open windows and a bounded delivery watermark", () => {
    const events = [event(1, { occurred_at: "2026-09-20T00:00:00Z" }), event(2, { occurred_at: "2026-09-27T00:00:00Z" }), event(3, { occurred_at: asOf }), event(4, { received_at: "2026-10-04T00:00:01Z" }), event(5, { occurred_at: "2026-09-19T23:59:59Z" })];
    const snapshot = projectIntelligenceFeatures(input(events));
    expect(snapshot.baseline.metrics.lockerOpens.value).toBe(1);
    expect(snapshot.current.metrics.lockerOpens.value).toBe(1);
    expect(snapshot.quality.exclusions).toMatchObject({ outside_window: 2, beyond_delivery_watermark: 1 });
    expect(() => projectIntelligenceFeatures(input([], { currentWindow: { start: baselineAt, end: asOf } }))).toThrow("equal_adjacent_seven_day_windows_required");
  });

  it("qualifies only entry plus meaningful action or server-validated engagement", () => {
    const events = [event(1), event(2), event(3, { event_name: "media_opened", session_id: event(2).session_id }), event(4, { event_name: "media_opened" }), event(5, { event_name: "session_engaged", measurement_basis: "verified_engagement", producer: "engagement_validator" }), event(6, { event_name: "session_engaged", measurement_basis: "unverified_client" })];
    const snapshot = projectIntelligenceFeatures(input(events));
    expect(snapshot.current.metrics.eligibleDistinctSessions.value).toBe(4);
    expect(snapshot.current.metrics.qualifiedSessions.value).toBe(2);
    expect(snapshot.current.metrics.lockerSessions.value).toBe(2);
    expect(snapshot.quality.exclusions.unverified_measurement).toBe(1);
  });

  it("distinguishes complete zero, missing instrumentation, partial, unavailable and stale", () => {
    const known = projectIntelligenceFeatures(input());
    expect(known.current.metrics.lockerOpens).toMatchObject({ value: 0, state: "observed" });
    const missing = input(); missing.coverage.current.instrumentedEvents = ["locker_viewed"];
    expect(projectIntelligenceFeatures(missing).current.metrics.videoStarts).toMatchObject({ value: null, state: "unknown" });
    const partial = input(); partial.coverage.current = { ...partial.coverage.current, state: "partial", fraction: 0.5 };
    expect(projectIntelligenceFeatures(partial).current.metrics.lockerOpens).toMatchObject({ value: 0, state: "partial" });
    const unavailable = input(); unavailable.coverage.current.state = "unavailable";
    expect(projectIntelligenceFeatures(unavailable).current.metrics.lockerOpens).toMatchObject({ value: null, state: "unavailable" });
    const stale = projectIntelligenceFeatures(input([], { eventWatermark: "2026-10-03T23:00:00Z" }));
    expect(stale.quality.stale).toBe(true);
    expect(stale.current.metrics.lockerOpens).toMatchObject({ value: 0, state: "stale" });
    expect(known.current.metrics.mediaOpenRate).toMatchObject({ value: null, state: "insufficient_sample" });
  });

  it("does not infer full coverage from successful rows or contradictory coverage assertions", () => {
    const missingBounds = input([event(1)]); missingBounds.coverage.current = { ...missingBounds.coverage.current, start: null, end: null, fraction: null };
    const snapshot = projectIntelligenceFeatures(missingBounds);
    expect(snapshot.current.metrics.lockerOpens).toMatchObject({ value: 1, state: "partial" });
    expect(snapshot.quality.comparable).toBe(false);
    const changed = input([event(1)]); changed.coverage.baseline.measurementVersion = "older-definition";
    expect(projectIntelligenceFeatures(changed).comparisons.lockerSessions.growthFraction).toBeNull();
  });

  it("keeps legacy media opening distinct from playback and copy alias distinct from distribution", () => {
    const events = [event(1, { event_name: "media_viewed" }), event(2, { event_name: "share_link_copied" }), event(3, { event_name: "locker_shared", properties: { method: "copy_link" } })];
    const options = input(events); options.coverage.current.instrumentedEvents = ["media_viewed", "share_link_copied", "locker_shared"]; options.coverage.baseline.instrumentedEvents = [...options.coverage.current.instrumentedEvents];
    const snapshot = projectIntelligenceFeatures(options);
    expect(snapshot.current.metrics.mediaOpens.value).toBe(1);
    expect(snapshot.current.metrics.shareIntents.value).toBe(1);
    expect(snapshot.current.metrics.videoStarts.value).toBeNull();
    expect(snapshot.current.metrics.mediaExposures.value).toBeNull();
    expect(snapshot.current.metrics.athleteDistributedSessions.value).toBeNull();
  });

  it("requires exact reviewed Moment and qualified asset context", () => {
    const rows = [event(1, { event_name: "moment_opened", moment_id: momentId }), event(2, { event_name: "media_opened", asset_id: assetId, asset_model: "legacy_media" })];
    const missing = projectIntelligenceFeatures(input(rows, { reviewedMomentIds: [], reviewedAssetBindings: [] }));
    expect(missing.current.metrics.eligibleDistinctSessions.value).toBe(0);
    expect(missing.quality.exclusions).toMatchObject({ unreviewed_moment_context: 1, unreviewed_asset_context: 1 });
    const subject: FeatureSubject = { kind: "moment", playerId, momentId };
    expect(projectIntelligenceFeatures(input(rows, { subject, reviewedMomentIds: [] })).quality.reviewedMomentContext).toBe(false);
  });

  it("deduplicates exposure episodes and only calculates a rate for matched episodes", () => {
    const rows = Array.from({ length: 100 }, (_, index) => event(index + 1, { event_name: "media_impression", asset_id: assetId, asset_model: "legacy_media", measurement_basis: "visibility_50pct_1s_v1", properties: { exposure_id: `episode-${index}` } }));
    const opens = rows.slice(0, 40).map((row, index) => event(index + 201, { event_name: "media_opened", asset_id: assetId, asset_model: "legacy_media", session_id: row.session_id, properties: row.properties }));
    rows.push({ ...rows[0], event_id: id(501) });
    const snapshot = projectIntelligenceFeatures(input([...opens.reverse(), ...rows]));
    expect(snapshot.current.metrics.mediaExposures.value).toBe(100);
    expect(snapshot.current.metrics.matchedMediaOpens.value).toBe(40);
    expect(snapshot.current.metrics.mediaOpenRate).toMatchObject({ value: 0.4, denominator: 100, sampleSize: 100, state: "observed" });
    const unmatched = opens.map(row => ({ ...row, properties: {} }));
    expect(projectIntelligenceFeatures(input([...unmatched, ...rows])).current.metrics.mediaOpenRate).toMatchObject({ value: null, state: "unknown" });
  });

  it("does not match an open before exposure or playback completion before its start", () => {
    const later = "2026-09-30T12:01:00Z";
    const rows = [event(1, { event_name: "media_opened", asset_id: assetId, asset_model: "legacy_media", properties: { exposure_id: "a" } }), event(2, { event_name: "media_impression", asset_id: assetId, asset_model: "legacy_media", session_id: event(1).session_id, measurement_basis: "visibility_50pct_1s_v1", occurred_at: later, properties: { exposure_id: "a" } }), event(3, { event_name: "video_completed", asset_id: assetId, asset_model: "legacy_video", measurement_basis: "verified_player_callback", properties: { playback_id: "play-a" } }), event(4, { event_name: "video_started", asset_id: assetId, asset_model: "legacy_video", measurement_basis: "verified_player_callback", occurred_at: later, session_id: event(3).session_id, properties: { playback_id: "play-a" } })];
    const snapshot = projectIntelligenceFeatures(input(rows));
    expect(snapshot.current.metrics.matchedMediaOpens.value).toBe(0);
    expect(snapshot.current.metrics.videoStarts.value).toBe(1);
    expect(snapshot.current.metrics.videoCompletions.value).toBe(0);
  });

  it("uses actual playback callbacks and keeps autoplay cohorts separate", () => {
    const start = event(1, { event_name: "video_started", asset_id: assetId, asset_model: "legacy_video", measurement_basis: "verified_player_callback", properties: { playback_id: "first", autoplay: false } });
    const rows = [start, { ...start, event_id: id(2) }, event(3, { event_name: "video_completed", asset_id: assetId, asset_model: "legacy_video", measurement_basis: "verified_player_callback", session_id: start.session_id, properties: { playback_id: "first" } }), event(4, { event_name: "video_started", asset_id: assetId, asset_model: "legacy_video", measurement_basis: "unverified_client", properties: { playback_id: "second" } }), event(5, { event_name: "video_started", asset_id: assetId, asset_model: "legacy_video", measurement_basis: "verified_player_callback", properties: { playback_id: "third", autoplay: true } })];
    const snapshot = projectIntelligenceFeatures(input(rows));
    expect(snapshot.current.metrics.videoStarts.value).toBe(2);
    expect(snapshot.current.metrics.videoCompletions.value).toBe(1);
    expect(snapshot.current.metrics.videoCompletionRate).toMatchObject({ value: null, denominator: 2, state: "insufficient_sample" });
    expect(snapshot.current.verifiedPlaybackSample).toEqual({ autoplayStarts: 1, userInitiatedStarts: 1, unknownAutoplayStarts: 0 });
  });

  it("retains model-qualified asset identity, reviewed Moments and unknown channels in top contexts", () => {
    const rows = [event(1, { event_name: "media_opened", asset_id: assetId, asset_model: "legacy_media", source_channel: "https://private.invalid/?email=hidden" }), event(2, { event_name: "media_opened", asset_id: assetId, asset_model: "legacy_video", source_channel: "search" }), event(3, { event_name: "moment_opened", moment_id: momentId })];
    const snapshot = projectIntelligenceFeatures(input(rows));
    expect(snapshot.current.topAssets).toHaveLength(2);
    expect(snapshot.current.topAssets.map(row => row.asset.model)).toEqual(["legacy_media", "legacy_video"]);
    expect(snapshot.current.topMoments).toEqual([{ id: momentId, opens: 1 }]);
    expect(snapshot.current.topChannels).toContainEqual({ channel: "unknown", distinctSessions: 2 });
    expect(JSON.stringify(snapshot)).not.toContain("email=hidden");
  });

  it("rejects synthetic live projections, invalid canonical identities and unsupported computation order", () => {
    expect(() => projectIntelligenceFeatures(input([], { environment: "synthetic" as "development" }))).toThrow("live_feature_environment_required");
    expect(() => projectIntelligenceFeatures(input([], { subject: { kind: "athlete", playerId: "provider-id" } }))).toThrow();
    expect(() => projectIntelligenceFeatures(input([], { computedAt: baselineAt }))).toThrow("invalid_feature_computation_order");
    expect(() => projectIntelligenceFeatures(input([], { inputRevision: 0 }))).toThrow("feature_input_lineage_required");
  });

  it("retains fresher snapshots against late jobs and separates serving keys", () => {
    const scenario = pack.scenarios.find((item: { id: string }) => item.id === "duplicate_delivery_and_stale_feature_job");
    const stored = projectIntelligenceFeatures(input([], { asOf: "2026-10-04T20:00:00Z", computedAt: "2026-10-04T20:00:00Z", eventWatermark: scenario.input.stored_feature_watermark }));
    const incoming = { ...stored, provenance: { ...stored.provenance, eventWatermark: scenario.input.incoming_feature_watermark, inputRevision: 2 } };
    expect(canProjectFeatureSnapshot(stored, incoming)).toBe(scenario.expected.old_feature_write_allowed);
    expect(canProjectFeatureSnapshot(stored, stored)).toBe(false);
    expect(canProjectFeatureSnapshot(stored, { ...stored, provenance: { ...stored.provenance, inputRevision: 2 } })).toBe(true);
    expect(canProjectFeatureSnapshot(stored, { ...stored, environment: "production" })).toBe(false);
    expect(canProjectFeatureSnapshot(stored, { ...stored, subject: { kind: "athlete", playerId: otherPlayer } })).toBe(false);
    expect(canProjectFeatureSnapshot(stored, { ...stored, provenance: { ...stored.provenance, asOf: "2026-10-03T20:00:00Z", eventWatermark: "2026-10-04T20:00:00Z" } })).toBe(false);
  });

  it("preserves input immutability and deterministic output despite transport ordering", () => {
    const supplied = input([event(1), event(2, { occurred_at: baselineAt })]);
    const before = JSON.stringify(supplied);
    const snapshot = projectIntelligenceFeatures(supplied);
    expect(JSON.stringify(supplied)).toBe(before);
    expect(projectIntelligenceFeatures({ ...supplied, events: [...supplied.events].reverse() })).toEqual(snapshot);
  });
});
