import { z } from "zod";
import { FEATURE_VERSION, MEASURED_RULE_VERSION, MEASURED_SIGNAL_TYPES, SEVEN_DAYS_MS, featureSubjectSchema, featureScopeKey, type IntelligenceFeatureSnapshot, type MeasuredSignalEvaluation } from "./contracts";
import { compareFeatureMetrics } from "./project";

const dateTime = z.string().datetime({ offset: true });
const count = z.number().int().nonnegative();
const fraction = z.number().min(0).max(1);
const measurementState = z.enum(["observed", "unknown", "unavailable", "partial", "stale", "insufficient_sample"]);
const metric = z.object({ value: z.number().nonnegative().nullable(), state: measurementState, definition: z.string().min(1).max(500), sampleSize: count, denominator: count.nullable() }).strict().superRefine((row, context) => {
  if ((row.state === "unknown" || row.state === "unavailable" || row.state === "insufficient_sample") && row.value !== null) context.addIssue({ code: "custom", message: "unmeasured_metric_must_be_null" });
  if (row.state === "observed" && row.value === null) context.addIssue({ code: "custom", message: "observed_metric_requires_value" });
});
const scope = z.discriminatedUnion("kind", [z.object({ kind: z.literal("public_audience") }).strict(), z.object({ kind: z.literal("internal_admin") }).strict(), z.object({ kind: z.literal("organization"), organizationId: z.string().uuid() }).strict()]);
const window = z.object({ start: dateTime, end: dateTime }).strict().refine(row => Date.parse(row.end) - Date.parse(row.start) === SEVEN_DAYS_MS, "seven_day_window_required");
const coverage = z.object({ state: z.enum(["complete", "partial", "unavailable"]), start: dateTime.nullable(), end: dateTime.nullable(), fraction: fraction.nullable(), measurementVersion: z.string().min(1).max(160).nullable(), instrumentedEvents: z.array(z.string().regex(/^[a-z][a-z0-9_]{0,79}$/)).max(100) }).strict();
const asset = z.object({ id: z.string().uuid(), model: z.enum(["legacy_media", "legacy_video", "media_asset"]) }).strict();
const intentGroup = z.object({ asset, intendedUse: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_:-]{0,119}$/), distinctSessions: count }).strict();
const metrics = z.object({ eligibleDistinctSessions: metric, lockerSessions: metric, momentSessions: metric, qualifiedSessions: metric, lockerOpens: metric, momentOpens: metric, mediaOpens: metric, mediaExposures: metric, matchedMediaOpens: metric, mediaOpenRate: metric, videoStarts: metric, videoCompletions: metric, videoCompletionRate: metric, shareIntents: metric, licenseIntents: metric, printIntents: metric, athleteDistributedSessions: metric, athleteDistributedQualifiedSessions: metric, organizationDistributedSessions: metric }).strict().superRefine((rows, context) => {
  for (const [name, row] of Object.entries(rows)) {
    if (row.value !== null && (name.endsWith("Rate") ? row.value > 1 : !Number.isInteger(row.value))) context.addIssue({ code: "custom", path: [name, "value"], message: "invalid_metric_unit" });
  }
});
const projection = z.object({ window, coverage, metrics, topMoments: z.array(z.object({ id: z.string().uuid(), opens: count }).strict()).max(5), topAssets: z.array(z.object({ asset, opens: count }).strict()).max(5), topChannels: z.array(z.object({ channel: z.enum(["direct", "search", "social", "referral", "athlete_distribution", "organization_distribution", "unknown"]), distinctSessions: count }).strict()).max(5), distributionIssuers: z.array(z.object({ kind: z.enum(["athlete", "organization"]), id: z.string().uuid(), subjectPlayerId: z.string().uuid(), distinctSessions: count }).strict()).max(5), licensingGroups: z.array(intentGroup).max(5), printGroups: z.array(intentGroup).max(5), verifiedPlaybackSample: z.object({ autoplayStarts: count, userInitiatedStarts: count, unknownAutoplayStarts: count }).strict() }).strict().superRefine((row, context) => {
  if (row.coverage.state === "complete" && (!row.coverage.start || !row.coverage.end || !row.coverage.measurementVersion || row.coverage.fraction !== 1 || Date.parse(row.coverage.start) > Date.parse(row.window.start) || Date.parse(row.coverage.end) < Date.parse(row.window.end))) context.addIssue({ code: "custom", message: "complete_coverage_requires_bounds_and_version" });
  for (const [name, item] of Object.entries(row.metrics)) {
    if ((item.state === "observed" || item.state === "insufficient_sample") && row.coverage.state !== "complete") context.addIssue({ code: "custom", path: ["metrics", name], message: "observed_metric_requires_complete_coverage" });
    if (item.state === "partial" && row.coverage.state !== "partial") context.addIssue({ code: "custom", path: ["metrics", name], message: "partial_metric_requires_partial_coverage" });
    if (row.coverage.state === "unavailable" && item.state !== "unavailable") context.addIssue({ code: "custom", path: ["metrics", name], message: "unavailable_coverage_withholds_metrics" });
  }
  for (const [name, numerator, denominator] of [["mediaOpenRate", "matchedMediaOpens", "mediaExposures"], ["videoCompletionRate", "videoCompletions", "videoStarts"]] as const) {
    const rate = row.metrics[name], top = row.metrics[numerator].value, bottom = row.metrics[denominator].value;
    if (rate.state === "observed" && (top === null || bottom === null || bottom <= 0 || rate.denominator !== bottom || rate.sampleSize !== bottom || Math.abs(rate.value! - top / bottom) > 1e-9)) context.addIssue({ code: "custom", path: ["metrics", name], message: "rate_denominator_mismatch" });
  }
});
const comparison = z.object({ absoluteChange: z.number().nullable(), growthFraction: z.number().nullable(), state: measurementState, activity: z.enum(["new_activity", "continuing_activity", "no_activity", "unknown"]), suppressionReasons: z.array(z.string().regex(/^[a-z][a-z0-9_]{0,119}$/)).max(30) }).strict();
const deliveryHealth = z.object({ expectedActivity: z.boolean(), expectedCadenceSeconds: z.number().positive(), monitoringStartedAt: dateTime, lastAcknowledgedAt: dateTime.nullable() }).strict();

/** Strict read DTO: arbitrary persisted JSON is never cast into a feature snapshot. */
export const intelligenceFeatureSnapshotSchema = z.object({
  schemaVersion: z.literal(1), featureVersion: z.literal(FEATURE_VERSION), subject: featureSubjectSchema, scope,
  scopeKey: z.string().max(100), environment: z.enum(["development", "production"]), current: projection, baseline: projection,
  comparisons: z.object({ eligibleDistinctSessions: comparison, lockerSessions: comparison, momentSessions: comparison, qualifiedSessions: comparison, lockerOpens: comparison, momentOpens: comparison, mediaOpens: comparison, athleteDistributedSessions: comparison, athleteDistributedQualifiedSessions: comparison }).strict(),
  quality: z.object({ state: measurementState, stale: z.boolean(), comparable: z.boolean(), exclusions: z.record(z.string().regex(/^[a-z][a-z0-9_]{0,119}$/), count), logicalEventCount: count, duplicateDeliveries: count, ambiguousEventIds: count, reviewedMomentContext: z.boolean(), reviewedAssetContext: z.boolean(), distributionRegistryAvailable: z.boolean() }).strict(),
  provenance: z.object({ runId: z.string().uuid(), inputSnapshotHash: z.string().min(1).max(160), inputSnapshotReference: z.string().min(1).max(512), inputRevision: z.number().int().positive(), eventWatermark: dateTime, asOf: dateTime, computedAt: dateTime, measurementVersions: z.object({ current: z.string().min(1).max(160).nullable(), baseline: z.string().min(1).max(160).nullable() }).strict() }).strict(),
  deliveryHealth: deliveryHealth.nullable(),
}).strict().superRefine((row, context) => {
  if (row.scopeKey !== featureScopeKey(row.scope)) context.addIssue({ code: "custom", message: "scope_key_mismatch" });
  if (Date.parse(row.current.window.end) !== Date.parse(row.provenance.asOf) || Date.parse(row.baseline.window.end) !== Date.parse(row.current.window.start)) context.addIssue({ code: "custom", message: "comparable_window_bounds_required" });
  if (Date.parse(row.provenance.computedAt) < Date.parse(row.provenance.asOf) || Date.parse(row.provenance.eventWatermark) > Date.parse(row.provenance.computedAt)) context.addIssue({ code: "custom", message: "invalid_snapshot_time_order" });
  if (row.provenance.measurementVersions.current !== row.current.coverage.measurementVersion || row.provenance.measurementVersions.baseline !== row.baseline.coverage.measurementVersion) context.addIssue({ code: "custom", message: "measurement_version_lineage_mismatch" });
  if (row.quality.comparable && (row.current.coverage.state !== "complete" || row.baseline.coverage.state !== "complete" || row.current.coverage.measurementVersion !== row.baseline.coverage.measurementVersion || JSON.stringify([...row.current.coverage.instrumentedEvents].sort()) !== JSON.stringify([...row.baseline.coverage.instrumentedEvents].sort()))) context.addIssue({ code: "custom", message: "incomparable_snapshot_claim" });
  for (const [name, compared] of Object.entries(row.comparisons)) {
    const derived = compareFeatureMetrics(row.current.metrics[name as keyof typeof row.comparisons], row.baseline.metrics[name as keyof typeof row.comparisons], row.quality.comparable);
    if (compared.state !== derived.state || compared.activity !== derived.activity || JSON.stringify([...compared.suppressionReasons].sort()) !== JSON.stringify([...derived.suppressionReasons].sort()) || compared.absoluteChange !== derived.absoluteChange || compared.growthFraction !== derived.growthFraction) context.addIssue({ code: "custom", path: ["comparisons", name], message: "comparison_projection_mismatch" });
    const current = row.current.metrics[name as keyof typeof row.comparisons].value, baseline = row.baseline.metrics[name as keyof typeof row.comparisons].value;
    if (compared.absoluteChange !== null && (current === null || baseline === null || compared.absoluteChange !== current - baseline)) context.addIssue({ code: "custom", path: ["comparisons", name], message: "absolute_change_mismatch" });
    if (compared.growthFraction !== null && (compared.state !== "observed" || !row.quality.comparable || current === null || baseline === null || baseline <= 0 || Math.abs(compared.growthFraction - (current - baseline) / baseline) > 1e-9)) context.addIssue({ code: "custom", path: ["comparisons", name], message: "growth_denominator_mismatch" });
  }
  if (row.quality.stale && [row.current, row.baseline].some(part => Object.values(part.metrics).some(item => item.state === "observed" || item.state === "partial"))) context.addIssue({ code: "custom", message: "stale_snapshot_cannot_claim_current_metrics" });
  if (row.deliveryHealth && (Date.parse(row.deliveryHealth.monitoringStartedAt) > Date.parse(row.provenance.computedAt) || row.deliveryHealth.lastAcknowledgedAt !== null && Date.parse(row.deliveryHealth.lastAcknowledgedAt) > Date.parse(row.provenance.computedAt))) context.addIssue({ code: "custom", message: "invalid_delivery_health_time" });
  for (const part of [row.current, row.baseline]) if (part.distributionIssuers.some(issuer => issuer.subjectPlayerId !== row.subject.playerId)) context.addIssue({ code: "custom", message: "distribution_subject_mismatch" });
});

const signal = z.object({
  key: z.string().min(1).max(600), type: z.enum(MEASURED_SIGNAL_TYPES), ruleVersion: z.literal(MEASURED_RULE_VERSION), subject: featureSubjectSchema,
  playerId: z.string().uuid(), momentId: z.string().uuid().nullable(), scope, environment: z.enum(["development", "production"]), editorialPriority: z.number().min(0).max(100), confidence: z.null(), commercialReadiness: z.enum(["research_needed", "not_applicable"]), explanation: z.string().min(1).max(4000), evaluationWindow: window,
  trigger: z.object({ metric: z.string().min(1).max(160), current: z.number().nonnegative().nullable(), baseline: z.number().nonnegative().nullable(), absoluteChange: z.number().nullable(), growthFraction: z.number().nullable(), asset: asset.optional(), intendedUse: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_:-]{0,119}$/).optional() }).strict(),
  measurementQuality: z.object({ state: measurementState, coverageFraction: fraction.nullable(), sampleSize: count, basis: z.string().min(1).max(500) }).strict(),
  lineage: z.object({ featureVersion: z.literal(FEATURE_VERSION), runId: z.string().uuid(), inputSnapshotHash: z.string().min(1).max(160), inputSnapshotReference: z.string().min(1).max(512), eventWatermark: dateTime }).strict(), status: z.literal("candidate"),
}).strict().superRefine((row, context) => {
  if (row.playerId !== row.subject.playerId || row.momentId !== (row.subject.kind === "moment" ? row.subject.momentId : null)) context.addIssue({ code: "custom", message: "signal_subject_mismatch" });
});
const opportunity = z.object({ key: z.string().min(1).max(620), type: z.enum(["athlete_redistribution_review", "moment_rediscovery_review", "asset_engagement_review", "licensing_brief_review", "career_poster_review", "measurement_repair"]), subject: featureSubjectSchema, playerId: z.string().uuid(), momentId: z.string().uuid().nullable(), signalKeys: z.array(z.string().min(1).max(600)).min(1).max(30), status: z.literal("candidate"), readiness: z.enum(["research_needed", "operational_review"]), blockers: z.array(z.string().regex(/^[a-z][a-z0-9_]{0,119}$/)).max(30) }).strict().superRefine((row, context) => {
  if (row.playerId !== row.subject.playerId || row.momentId !== (row.subject.kind === "moment" ? row.subject.momentId : null)) context.addIssue({ code: "custom", message: "opportunity_subject_mismatch" });
});
export const measuredSignalEvaluationSchema = z.object({ signals: z.array(signal).max(100), opportunities: z.array(opportunity).max(100), suppressed: z.array(z.object({ type: z.enum(MEASURED_SIGNAL_TYPES), reasons: z.array(z.string().regex(/^[a-z][a-z0-9_]{0,119}$/)).max(30) }).strict()).max(30) }).strict().superRefine((row, context) => {
  const keys = new Set(row.signals.map(item => item.key));
  if (keys.size !== row.signals.length || new Set(row.opportunities.map(item => item.key)).size !== row.opportunities.length) context.addIssue({ code: "custom", message: "duplicate_condition_identity" });
  for (const item of row.opportunities) if (item.signalKeys.some(key => !keys.has(key))) context.addIssue({ code: "custom", message: "missing_signal_lineage" });
});
export function parseIntelligenceFeatureSnapshot(value: unknown): IntelligenceFeatureSnapshot { return intelligenceFeatureSnapshotSchema.parse(value); }
export function parseMeasuredSignalEvaluation(value: unknown): MeasuredSignalEvaluation { return measuredSignalEvaluationSchema.parse(value); }

/** Read-time freshness changes labels only; it never creates a new measurement or advances lineage. */
export function markFeatureSnapshotStale(value: IntelligenceFeatureSnapshot, now: string, staleAfterSeconds = 900): IntelligenceFeatureSnapshot {
  const snapshot = parseIntelligenceFeatureSnapshot(value);
  dateTime.parse(now);
  if (!Number.isFinite(staleAfterSeconds) || staleAfterSeconds < 1) throw new Error("invalid_feature_staleness");
  if (Date.parse(now) - Date.parse(snapshot.provenance.computedAt) <= staleAfterSeconds * 1000) return snapshot;
  const staleMetrics = (rows: IntelligenceFeatureSnapshot["current"]["metrics"]) => Object.fromEntries(Object.entries(rows).map(([key, row]) => [key, { ...row, state: row.state === "unknown" || row.state === "unavailable" ? row.state : "stale" }])) as IntelligenceFeatureSnapshot["current"]["metrics"];
  const current = { ...snapshot.current, metrics: staleMetrics(snapshot.current.metrics) }, baseline = { ...snapshot.baseline, metrics: staleMetrics(snapshot.baseline.metrics) };
  const comparisons = Object.fromEntries(Object.keys(snapshot.comparisons).map(key => [key, compareFeatureMetrics(current.metrics[key as keyof typeof snapshot.comparisons], baseline.metrics[key as keyof typeof snapshot.comparisons], snapshot.quality.comparable)])) as IntelligenceFeatureSnapshot["comparisons"];
  return { ...snapshot, quality: { ...snapshot.quality, stale: true, state: snapshot.quality.state === "unknown" || snapshot.quality.state === "unavailable" ? snapshot.quality.state : "stale" }, current, baseline, comparisons };
}
