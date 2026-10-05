import {
  MEASURED_RULE_VERSION, featureSubjectKey,
  type FeatureComparison, type FeatureMetric, type IntelligenceFeatureSnapshot,
  type MeasuredIntelligenceSignal, type MeasuredOpportunity, type MeasuredSignalEvaluation,
  type MeasuredSignalType,
} from "./contracts";

export interface MeasuredSignalOptions {
  minimumBaseline?: number;
  minimumCurrent?: number;
  minimumIncrease?: number;
  minimumGrowth?: number;
  minimumIntentSessions?: number;
}
const opportunityTypes: Record<MeasuredSignalType, MeasuredOpportunity["type"]> = {
  locker_discovery_spike: "athlete_redistribution_review",
  moment_rediscovery: "moment_rediscovery_review",
  asset_engagement_spike: "asset_engagement_review",
  athlete_distribution_growth: "athlete_redistribution_review",
  licensing_intent_cluster: "licensing_brief_review",
  print_intent_cluster: "career_poster_review",
  measurement_coverage_failure: "measurement_repair",
};
function unavailableReasons(metric: FeatureMetric, baseline?: FeatureMetric): string[] {
  const reasons: string[] = [];
  if (metric.state === "partial") reasons.push("incomplete_current_coverage");
  if (baseline?.state === "partial") reasons.push("incomplete_baseline_coverage");
  if (metric.state === "stale" || baseline?.state === "stale") reasons.push("stale_features");
  if (metric.value === null || baseline && baseline.value === null) reasons.push("measurement_unavailable");
  return reasons;
}

/** Deterministic review candidates only; traffic does not establish rights or commercial readiness. */
export function evaluateMeasuredSignals(snapshot: IntelligenceFeatureSnapshot, options: MeasuredSignalOptions = {}): MeasuredSignalEvaluation {
  const minimumBaseline = options.minimumBaseline ?? 20;
  const minimumCurrent = options.minimumCurrent ?? 40;
  const minimumIncrease = options.minimumIncrease ?? 20;
  const minimumGrowth = options.minimumGrowth ?? 1;
  const minimumIntent = options.minimumIntentSessions ?? 3;
  for (const value of [minimumBaseline, minimumCurrent, minimumIncrease, minimumIntent]) if (!Number.isInteger(value) || value < 1) throw new Error("invalid_measured_signal_sample_gate");
  if (!Number.isFinite(minimumGrowth) || minimumGrowth <= 0) throw new Error("invalid_measured_signal_growth_gate");
  const signals: MeasuredIntelligenceSignal[] = [];
  const opportunities: MeasuredOpportunity[] = [];
  const suppressed: MeasuredSignalEvaluation["suppressed"] = [];
  const addSuppression = (type: MeasuredSignalType, reasons: string[]) => suppressed.push({ type, reasons: [...new Set(reasons)] });
  function emit(type: MeasuredSignalType, metric: FeatureMetric, trigger: MeasuredIntelligenceSignal["trigger"], explanation: string, identitySuffix = "") {
    // Condition identity is stable across feature refreshes. Storage owns
    // expiration/reopening policy; a new run cannot resurrect a dismissal.
    const key = `${MEASURED_RULE_VERSION}:${type}:${snapshot.environment}:${snapshot.scopeKey}:${featureSubjectKey(snapshot.subject)}${identitySuffix}`;
    const operational = type === "measurement_coverage_failure";
    const signal: MeasuredIntelligenceSignal = {
      key, type, ruleVersion: MEASURED_RULE_VERSION, subject: snapshot.subject, playerId: snapshot.subject.playerId,
      momentId: snapshot.subject.kind === "moment" ? snapshot.subject.momentId : null,
      scope: snapshot.scope, environment: snapshot.environment, editorialPriority: operational ? 90 : type.includes("intent") ? 65 : 70,
      confidence: null, commercialReadiness: operational ? "not_applicable" : "research_needed",
      explanation, evaluationWindow: snapshot.current.window, trigger,
      measurementQuality: { state: metric.state, coverageFraction: snapshot.current.coverage.fraction, sampleSize: metric.sampleSize, basis: metric.definition },
      lineage: { featureVersion: snapshot.featureVersion, runId: snapshot.provenance.runId, inputSnapshotHash: snapshot.provenance.inputSnapshotHash, inputSnapshotReference: snapshot.provenance.inputSnapshotReference, eventWatermark: snapshot.provenance.eventWatermark },
      status: "candidate",
    };
    signals.push(signal);
    // A coverage defect is an operational signal, not a commercial opportunity.
    if (!operational) opportunities.push({ key: `opportunity:${key}`, type: opportunityTypes[type], subject: snapshot.subject, playerId: signal.playerId, momentId: signal.momentId, signalKeys: [key], status: "candidate", readiness: "research_needed", blockers: ["intended_use_permission", "athlete_preferences", "reviewed_activation_context"] });
  }
  function spike(type: MeasuredSignalType, name: keyof IntelligenceFeatureSnapshot["comparisons"], extraReasons: string[] = []) {
    const current = snapshot.current.metrics[name], baseline = snapshot.baseline.metrics[name];
    const comparison: FeatureComparison = snapshot.comparisons[name];
    const reasons = [...extraReasons, ...unavailableReasons(current, baseline), ...comparison.suppressionReasons];
    if (snapshot.scope.kind === "internal_admin") reasons.push("internal_scope_not_audience");
    if (!snapshot.quality.comparable) reasons.push("incomparable_measurement");
    if (snapshot.current.coverage.measurementVersion !== snapshot.baseline.coverage.measurementVersion) reasons.push("measurement_version_changed");
    if (current.value !== null && baseline.value !== null && (current.value < minimumCurrent || baseline.value < minimumBaseline)) reasons.push("insufficient_sample");
    if (comparison.growthFraction === null && !reasons.length) reasons.push("growth_unavailable");
    if (reasons.length) return addSuppression(type, reasons);
    if (comparison.absoluteChange! < minimumIncrease || comparison.growthFraction! < minimumGrowth) return addSuppression(type, ["threshold_not_met"]);
    emit(type, current, { metric: name, current: current.value, baseline: baseline.value, absoluteChange: comparison.absoluteChange, growthFraction: comparison.growthFraction }, `${current.value} compared with ${baseline.value} in adjacent seven-day windows: +${comparison.absoluteChange} and +${Math.round(comparison.growthFraction! * 100)}%. ${current.definition}. This is a review condition, not revenue or clearance.`);
  }
  if (snapshot.subject.kind === "athlete") spike("locker_discovery_spike", "lockerSessions");
  else addSuppression("locker_discovery_spike", ["athlete_subject_required"]);
  if (snapshot.subject.kind === "moment") spike("moment_rediscovery", "momentSessions", snapshot.quality.reviewedMomentContext ? [] : ["reviewed_moment_context_required"]);
  else addSuppression("moment_rediscovery", ["moment_subject_required"]);
  if (snapshot.subject.kind === "asset") spike("asset_engagement_spike", "mediaOpens", snapshot.quality.reviewedAssetContext ? [] : ["reviewed_asset_context_required"]);
  else addSuppression("asset_engagement_spike", ["asset_subject_required"]);
  if (snapshot.subject.kind === "athlete") spike("athlete_distribution_growth", "athleteDistributedQualifiedSessions", snapshot.quality.distributionRegistryAvailable ? [] : ["trusted_distribution_registry_required"]);
  else addSuppression("athlete_distribution_growth", ["athlete_subject_required"]);

  function intent(type: "licensing_intent_cluster" | "print_intent_cluster") {
    const metric = type === "licensing_intent_cluster" ? snapshot.current.metrics.licenseIntents : snapshot.current.metrics.printIntents;
    const groups = type === "licensing_intent_cluster" ? snapshot.current.licensingGroups : snapshot.current.printGroups;
    const reasons = unavailableReasons(metric);
    if (metric.state !== "observed") reasons.push("complete_intent_coverage_required");
    if (snapshot.scope.kind === "internal_admin") reasons.push("internal_scope_not_audience");
    if (type === "print_intent_cluster" && snapshot.subject.kind !== "asset") reasons.push("asset_subject_required");
    if (!groups.length) reasons.push("qualified_asset_and_intended_use_required");
    if (reasons.length) return addSuppression(type, reasons);
    const qualifying = groups.filter(group => group.distinctSessions >= minimumIntent);
    if (!qualifying.length) return addSuppression(type, ["insufficient_sample"]);
    for (const group of qualifying) emit(type, { ...metric, sampleSize: group.distinctSessions }, { metric: "compatible_use_distinct_sessions", current: group.distinctSessions, baseline: null, absoluteChange: null, growthFraction: null, asset: group.asset, intendedUse: group.intendedUse }, `${group.distinctSessions} distinct eligible tab sessions requested ${group.intendedUse} for ${group.asset.model}:${group.asset.id} in seven days. Requests establish intent only; permissions, buyer identity, vendor economics and purchases require separate verification.`, `:${group.asset.model}:${group.asset.id}:${group.intendedUse}`);
  }
  intent("licensing_intent_cluster"); intent("print_intent_cluster");
  const health = snapshot.deliveryHealth;
  const cadenceExceeded = health?.expectedActivity === true && Date.parse(snapshot.provenance.computedAt) - Date.parse(health.lastAcknowledgedAt ?? health.monitoringStartedAt) > health.expectedCadenceSeconds * 1000;
  const coverageFailed = snapshot.current.coverage.state !== "complete" || snapshot.baseline.coverage.state !== "complete";
  if (coverageFailed || cadenceExceeded || snapshot.quality.stale) {
    const reasons = [coverageFailed ? "incomplete_observation_coverage" : "", cadenceExceeded ? "expected_acknowledgment_overdue" : "", snapshot.quality.stale ? "feature_watermark_stale" : ""].filter(Boolean);
    const metric = snapshot.current.metrics.eligibleDistinctSessions;
    emit("measurement_coverage_failure", metric, { metric: "measurement_health", current: null, baseline: null, absoluteChange: null, growthFraction: null }, `Measurement requires operational review: ${reasons.join(", ")}. Event absence does not establish reduced athlete demand or missing media.`);
  } else addSuppression("measurement_coverage_failure", [health ? "measurement_health_within_expected_cadence" : "no_measurement_failure_observed_no_cadence_claim"]);
  return { signals, opportunities, suppressed };
}
