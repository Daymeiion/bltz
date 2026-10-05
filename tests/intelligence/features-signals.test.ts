import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { evaluateMeasuredSignals, projectIntelligenceFeatures } from "@/lib/intelligence/features";
import type { FeatureCoverage, FeatureProjectionEvent, FeatureProjectionInput, TrustedDistributionTouch } from "@/lib/intelligence/features";

const playerId = "10000000-0000-4000-8000-000000000001";
const distributorId = "10000000-0000-4000-8000-000000000002";
const momentId = "20000000-0000-4000-8000-000000000001";
const assetId = "30000000-0000-4000-8000-000000000001";
const asOf = "2026-10-04T00:00:00Z";
const currentAt = "2026-09-30T12:00:00Z";
const baselineAt = "2026-09-23T12:00:00Z";
const id = (number: number) => `60000000-0000-4000-8000-${number.toString().padStart(12, "0")}`;
const instrumentation = ["locker_viewed", "moment_opened", "media_opened", "share_link_copied", "license_requested", "print_requested", "distribution_link_clicked"];
const coverage = (start: string, end: string): FeatureCoverage => ({ state: "complete", start, end, fraction: 1, measurementVersion: "observations-v1", instrumentedEvents: instrumentation });
const event = (number: number, patch: Partial<FeatureProjectionEvent> = {}): FeatureProjectionEvent => ({ event_id: id(number), schema_version: 1, event_version: "legacy-v1", event_name: "locker_viewed", occurred_at: currentAt, received_at: asOf, environment: "development", surface: "public_locker", producer: "bltz_collector", actor_kind: "anonymous", measurement_basis: "unverified_client", audience_eligible: true, subject_player_id: playerId, moment_id: null, asset_id: null, asset_model: null, session_id: id(number + 1000), scope_key: "public_audience", source_channel: "unknown", properties: {}, ...patch });
const input = (events: FeatureProjectionEvent[] = [], patch: Partial<FeatureProjectionInput> = {}): FeatureProjectionInput => ({ subject: { kind: "athlete", playerId }, scope: { kind: "public_audience" }, environment: "development", events, asOf, computedAt: asOf, eventWatermark: asOf, runId: id(9000), inputSnapshotHash: "synthetic-input-v1", inputSnapshotReference: "synthetic-test:features", inputRevision: 1, coverage: { current: coverage("2026-09-27T00:00:00Z", asOf), baseline: coverage("2026-09-20T00:00:00Z", "2026-09-27T00:00:00Z") }, reviewedMomentIds: [momentId], reviewedAssetBindings: [{ playerId, assetId, assetModel: "legacy_media", momentId: null }], ...patch });
const traffic = (current = 120, baseline = 40, patch: Partial<FeatureProjectionEvent> = {}) => [...Array.from({ length: current }, (_, number) => event(number + 1, patch)), ...Array.from({ length: baseline }, (_, number) => event(number + 201, { ...patch, occurred_at: baselineAt }))];
const pack = JSON.parse(readFileSync(resolve(process.cwd(), "docs/intelligence/fixtures/BLTZ-Intelligence-Workflow-Fixtures-2026-10-04.json"), "utf8"));

describe("measured deterministic detectors", () => {
  it("evaluates the supplied discovery fixture with actual generated events and feature lineage", () => {
    const scenario = pack.scenarios.find((item: { id: string }) => item.id === "measured_discovery_to_activation_draft");
    const result = evaluateMeasuredSignals(projectIntelligenceFeatures(input(traffic(scenario.input.current_window.sessions, scenario.input.baseline_window.sessions))));
    const signal = result.signals.find(item => item.type === scenario.expected.proposed_signal_type);
    expect(signal).toMatchObject({ momentId: null, confidence: null, commercialReadiness: "research_needed", trigger: { current: 120, baseline: 40, absoluteChange: scenario.expected.absolute_increase, growthFraction: scenario.expected.growth }, lineage: { featureVersion: "engagement-v1", inputSnapshotReference: "synthetic-test:features" }, editorialPriority: 70 });
    expect(signal?.explanation).toContain("+200%");
    expect(result.opportunities[0]).toMatchObject({ type: scenario.expected.opportunity, signalKeys: [signal?.key], readiness: "research_needed", momentId: null });
    expect(result.opportunities[0].blockers).toContain("intended_use_permission");
    expect(JSON.stringify(result)).not.toMatch(/earnings|partnership|impressions/);
  });

  it("suppresses zero-baseline partial data without infinity or commercial opportunity", () => {
    const scenario = pack.scenarios.find((item: { id: string }) => item.id === "zero_baseline_and_partial_coverage");
    const supplied = input(traffic(scenario.input.current_sessions, scenario.input.baseline_sessions));
    supplied.coverage.baseline = { ...supplied.coverage.baseline, state: "partial", fraction: 0.5 };
    const snapshot = projectIntelligenceFeatures(supplied);
    const result = evaluateMeasuredSignals(snapshot);
    expect(snapshot.comparisons.lockerSessions.growthFraction).toBe(scenario.expected.growth);
    expect(snapshot.comparisons.lockerSessions.activity).toBe(scenario.expected.activity_label);
    expect(result.signals.filter(item => item.type === "locker_discovery_spike")).toHaveLength(scenario.expected.engagement_spike_signal_count);
    expect(result.opportunities).toHaveLength(scenario.expected.opportunity_count);
    expect(result.suppressed.find(item => item.type === "locker_discovery_spike")?.reasons).toEqual(expect.arrayContaining(scenario.expected.suppression_reasons));
    expect(result.signals.some(item => item.type === "measurement_coverage_failure")).toBe(true);
    expect(JSON.stringify(snapshot)).not.toContain("Infinity");
  });

  it.each([[40, 20, true], [39, 20, false], [40, 19, false], [60, 40, false], [80, 40, true]])("applies volume-qualified equal-window gates (%s/%s)", (current, baseline, expected) => {
    const result = evaluateMeasuredSignals(projectIntelligenceFeatures(input(traffic(current as number, baseline as number))));
    expect(result.signals.some(item => item.type === "locker_discovery_spike")).toBe(expected);
  });

  it("does not call asset-only sessions a Locker discovery spike", () => {
    const result = evaluateMeasuredSignals(projectIntelligenceFeatures(input(traffic(120, 40, { event_name: "media_opened", asset_id: assetId, asset_model: "legacy_media" }))));
    expect(result.signals.some(item => item.type === "locker_discovery_spike")).toBe(false);
  });

  it("implements reviewed Moment and qualified asset detectors without inventing a Moment for an athlete", () => {
    const moment = evaluateMeasuredSignals(projectIntelligenceFeatures(input(traffic(120, 40, { event_name: "moment_opened", moment_id: momentId }), { subject: { kind: "moment", playerId, momentId } })));
    expect(moment.signals.find(item => item.type === "moment_rediscovery")).toMatchObject({ momentId, subject: { kind: "moment", momentId } });
    const asset = evaluateMeasuredSignals(projectIntelligenceFeatures(input(traffic(120, 40, { event_name: "media_opened", asset_id: assetId, asset_model: "legacy_media" }), { subject: { kind: "asset", playerId, assetId, assetModel: "legacy_media" } })));
    expect(asset.signals.find(item => item.type === "asset_engagement_spike")).toMatchObject({ momentId: null, subject: { kind: "asset", assetId } });
    const invalid = evaluateMeasuredSignals(projectIntelligenceFeatures(input(traffic(120, 40, { event_name: "moment_opened", moment_id: momentId }), { subject: { kind: "moment", playerId, momentId }, reviewedMomentIds: [] })));
    expect(invalid.signals.some(item => item.type === "moment_rediscovery")).toBe(false);
  });

  it("requires authenticated distribution provenance and preserves distributor versus subject", () => {
    const rows = traffic(120, 40);
    const trustedDistribution: Record<string, TrustedDistributionTouch> = {};
    const signedCurrent = rows.slice(0, 72), signedBaseline = rows.slice(120, 140);
    for (const row of [...signedCurrent, ...signedBaseline]) trustedDistribution[`development:${row.event_id}`] = { verified: true, linkId: "synthetic-link", issuer: { kind: "athlete", playerId: distributorId }, subjectPlayerId: playerId, receivedAt: row.received_at };
    const snapshot = projectIntelligenceFeatures(input(rows, { trustedDistribution }));
    expect(snapshot.current.metrics.athleteDistributedSessions.value).toBe(72);
    expect(snapshot.current.metrics.athleteDistributedSessions.value! / snapshot.current.metrics.lockerSessions.value!).toBe(0.6);
    expect(snapshot.current.distributionIssuers).toEqual([{ kind: "athlete", id: distributorId, subjectPlayerId: playerId, distinctSessions: 72 }]);
    expect(snapshot.current.metrics.athleteDistributedQualifiedSessions.value).toBe(0);
    expect(evaluateMeasuredSignals(snapshot).signals.some(item => item.type === "athlete_distribution_growth")).toBe(false);
    const actions = [...signedCurrent, ...signedBaseline].map((row, index) => ({ ...row, event_id: id(2000 + index), event_name: "share_link_copied" }));
    const engaged = projectIntelligenceFeatures(input([...rows, ...actions], { trustedDistribution }));
    expect(engaged.current.metrics.athleteDistributedQualifiedSessions.value).toBe(72);
    expect(evaluateMeasuredSignals(engaged).signals.find(item => item.type === "athlete_distribution_growth")?.trigger.metric).toBe("athleteDistributedQualifiedSessions");
    const forged = rows.map(row => ({ ...row, source_channel: "athlete_distribution", properties: { verified: true, issuer_player_id: distributorId } }));
    const unsupported = projectIntelligenceFeatures(input(forged));
    expect(unsupported.current.metrics.athleteDistributedSessions.value).toBeNull();
    expect(unsupported.current.topChannels).toEqual([{ channel: "unknown", distinctSessions: 120 }]);
    expect(evaluateMeasuredSignals(unsupported).suppressed.find(item => item.type === "athlete_distribution_growth")?.reasons).toContain("trusted_distribution_registry_required");
  });

  it("rejects a touch for a different subject or a future/unverified issuer", () => {
    const row = event(1);
    const map = { [`development:${row.event_id}`]: { verified: true as const, linkId: "a", issuer: { kind: "athlete" as const, playerId: distributorId }, subjectPlayerId: distributorId, receivedAt: row.received_at } };
    expect(projectIntelligenceFeatures(input([row], { trustedDistribution: map })).current.metrics.athleteDistributedSessions.value).toBe(0);
    map[`development:${row.event_id}`].subjectPlayerId = playerId;
    map[`development:${row.event_id}`].receivedAt = "2026-10-05T00:00:00Z";
    expect(projectIntelligenceFeatures(input([row], { trustedDistribution: map })).current.metrics.athleteDistributedSessions.value).toBe(0);
  });

  it("clusters compatible asset/use intent by distinct tab sessions, not clicks", () => {
    const rows = Array.from({ length: 3 }, (_, number) => event(number + 1, { event_name: "license_requested", asset_id: assetId, asset_model: "legacy_media", properties: { requested_use: "editorial_license" } }));
    const result = evaluateMeasuredSignals(projectIntelligenceFeatures(input(rows)));
    expect(result.signals.find(item => item.type === "licensing_intent_cluster")).toMatchObject({ momentId: null, trigger: { current: 3, asset: { id: assetId, model: "legacy_media" }, intendedUse: "editorial_license" } });
    const repeated = rows.map(row => ({ ...row, session_id: rows[0].session_id }));
    expect(evaluateMeasuredSignals(projectIntelligenceFeatures(input(repeated))).signals.some(item => item.type === "licensing_intent_cluster")).toBe(false);
    const mixed = rows.map((row, number) => ({ ...row, properties: { requested_use: `distinct_use_${number}` } }));
    expect(evaluateMeasuredSignals(projectIntelligenceFeatures(input(mixed))).signals.some(item => item.type === "licensing_intent_cluster")).toBe(false);
  });

  it("does not infer a license cluster from a generic unqualified browser request", () => {
    const rows = Array.from({ length: 3 }, (_, number) => event(number + 1, { event_name: "license_requested", properties: { requested_use: "license" } }));
    const result = evaluateMeasuredSignals(projectIntelligenceFeatures(input(rows)));
    expect(result.signals.some(item => item.type === "licensing_intent_cluster")).toBe(false);
    expect(result.suppressed.find(item => item.type === "licensing_intent_cluster")?.reasons).toContain("qualified_asset_and_intended_use_required");
  });

  it("supports print intent only with asset subject and explicit use prerequisites", () => {
    const rows = Array.from({ length: 3 }, (_, number) => event(number + 1, { event_name: "print_requested", asset_id: assetId, asset_model: "legacy_media", properties: { intended_use: "career_poster" } }));
    const assetResult = evaluateMeasuredSignals(projectIntelligenceFeatures(input(rows, { subject: { kind: "asset", playerId, assetId, assetModel: "legacy_media" } })));
    expect(assetResult.signals.find(item => item.type === "print_intent_cluster")).toMatchObject({ commercialReadiness: "research_needed", trigger: { current: 3, intendedUse: "career_poster" } });
    expect(assetResult.opportunities[0]).toMatchObject({ type: "career_poster_review", readiness: "research_needed" });
    const athleteResult = evaluateMeasuredSignals(projectIntelligenceFeatures(input(rows)));
    expect(athleteResult.signals.some(item => item.type === "print_intent_cluster")).toBe(false);
  });

  it("detects scheduled missing acknowledgment without treating ordinary quiet activity as failure", () => {
    const quiet = projectIntelligenceFeatures(input());
    expect(evaluateMeasuredSignals(quiet).signals).toEqual([]);
    const health = { expectedActivity: true, expectedCadenceSeconds: 60, monitoringStartedAt: "2026-10-03T23:50:00Z", lastAcknowledgedAt: null };
    const failed = evaluateMeasuredSignals(projectIntelligenceFeatures(input([], { deliveryHealth: health })));
    expect(failed.signals[0]).toMatchObject({ type: "measurement_coverage_failure", commercialReadiness: "not_applicable", trigger: { current: null } });
    expect(failed.signals[0].explanation).toContain("expected_acknowledgment_overdue");
    expect(failed.opportunities).toEqual([]);
    expect(evaluateMeasuredSignals(projectIntelligenceFeatures(input([], { deliveryHealth: { ...health, expectedActivity: false } }))).signals).toEqual([]);
    expect(() => projectIntelligenceFeatures(input([], { deliveryHealth: { ...health, expectedCadenceSeconds: 0 } }))).toThrow("invalid_feature_delivery_health");
  });

  it("suppresses stale, changed instrumentation and partial windows before engagement ranking", () => {
    const stale = input(traffic()); stale.eventWatermark = "2026-10-03T23:00:00Z";
    const staleResult = evaluateMeasuredSignals(projectIntelligenceFeatures(stale));
    expect(staleResult.signals.filter(item => item.type !== "measurement_coverage_failure")).toEqual([]);
    const changed = input(traffic()); changed.coverage.baseline.measurementVersion = "historical-other-version";
    expect(evaluateMeasuredSignals(projectIntelligenceFeatures(changed)).suppressed.find(item => item.type === "locker_discovery_spike")?.reasons).toContain("measurement_version_changed");
  });

  it("retains stable condition/opportunity keys across feature runs and days", () => {
    const first = projectIntelligenceFeatures(input(traffic()));
    const next = { ...first, provenance: { ...first.provenance, runId: id(9001), inputRevision: 2, asOf: "2026-10-05T00:00:00Z" }, current: { ...first.current, window: { start: "2026-09-28T00:00:00Z", end: "2026-10-05T00:00:00Z" } } };
    const evaluatedFirst = evaluateMeasuredSignals(first), evaluatedNext = evaluateMeasuredSignals(next);
    expect(evaluatedNext.signals[0].key).toBe(evaluatedFirst.signals[0].key);
    expect(evaluatedNext.opportunities[0].key).toBe(evaluatedFirst.opportunities[0].key);
    expect(evaluatedNext.signals[0].lineage.runId).not.toBe(evaluatedFirst.signals[0].lineage.runId);
  });

  it("cannot amplify a spike through duplicated raw deliveries", () => {
    const current = Array.from({ length: 12 }, (_, number) => event(number + 1));
    const baseline = Array.from({ length: 20 }, (_, number) => event(number + 201, { occurred_at: baselineAt }));
    const result = evaluateMeasuredSignals(projectIntelligenceFeatures(input([...current, ...current, ...current, ...current, ...baseline])));
    expect(result.signals.some(item => item.type === "locker_discovery_spike")).toBe(false);
  });
});
