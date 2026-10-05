import { z } from "zod";

export const FEATURE_VERSION = "engagement-v1" as const;
export const MEASURED_RULE_VERSION = "measured-v1" as const;
export const SEVEN_DAYS_MS = 7 * 86_400_000;
export const QUALIFIED_SESSION_DEFINITION = "tab session with a subject entry and a meaningful action, or server-validated engaged session; not a person";

export const featureSubjectSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("athlete"), playerId: z.string().uuid() }).strict(),
  z.object({ kind: z.literal("moment"), playerId: z.string().uuid(), momentId: z.string().uuid() }).strict(),
  z.object({ kind: z.literal("asset"), playerId: z.string().uuid(), assetId: z.string().uuid(), assetModel: z.enum(["legacy_media", "legacy_video", "media_asset"]) }).strict(),
]);
export type FeatureSubject = z.infer<typeof featureSubjectSchema>;
export type FeatureAssetModel = "legacy_media" | "legacy_video" | "media_asset";
export type FeatureEnvironment = "development" | "production";
export type FeatureScope = { kind: "public_audience" } | { kind: "internal_admin" } | { kind: "organization"; organizationId: string };
export type MetricState = "observed" | "unknown" | "unavailable" | "partial" | "stale" | "insufficient_sample";
export type CoverageState = "complete" | "partial" | "unavailable";

/** Structural subset of BLTZEvent. Only a validated collector/server may supply these events. */
export interface FeatureProjectionEvent {
  event_id: string;
  schema_version: number;
  event_version: string;
  event_name: string;
  occurred_at: string;
  received_at: string;
  environment: string;
  surface: string;
  producer: string;
  actor_kind: string;
  measurement_basis: string;
  audience_eligible: boolean;
  subject_player_id: string | null;
  moment_id: string | null;
  asset_id: string | null;
  asset_model: FeatureAssetModel | null;
  session_id: string | null;
  scope_key: string;
  source_channel: string;
  properties: Record<string, unknown>;
}

export interface FeatureWindow { start: string; end: string }
export interface FeatureCoverage {
  state: CoverageState;
  start: string | null;
  end: string | null;
  fraction: number | null;
  /** Includes the definition/instrumentation revision, not just the envelope version. */
  measurementVersion: string | null;
  instrumentedEvents: string[];
}
export interface FeatureMetric {
  value: number | null;
  state: MetricState;
  definition: string;
  sampleSize: number;
  denominator: number | null;
}
export interface FeatureComparison {
  absoluteChange: number | null;
  growthFraction: number | null;
  state: MetricState;
  activity: "new_activity" | "continuing_activity" | "no_activity" | "unknown";
  suppressionReasons: string[];
}
export interface AssetIdentity { id: string; model: FeatureAssetModel }
export interface FeatureIntentGroup {
  asset: AssetIdentity;
  intendedUse: string;
  distinctSessions: number;
}
export interface FeatureMetrics {
  eligibleDistinctSessions: FeatureMetric;
  lockerSessions: FeatureMetric;
  momentSessions: FeatureMetric;
  qualifiedSessions: FeatureMetric;
  lockerOpens: FeatureMetric;
  momentOpens: FeatureMetric;
  mediaOpens: FeatureMetric;
  mediaExposures: FeatureMetric;
  matchedMediaOpens: FeatureMetric;
  mediaOpenRate: FeatureMetric;
  videoStarts: FeatureMetric;
  videoCompletions: FeatureMetric;
  videoCompletionRate: FeatureMetric;
  shareIntents: FeatureMetric;
  licenseIntents: FeatureMetric;
  printIntents: FeatureMetric;
  athleteDistributedSessions: FeatureMetric;
  /** Trusted arrivals that also satisfy QUALIFIED_SESSION_DEFINITION. */
  athleteDistributedQualifiedSessions: FeatureMetric;
  organizationDistributedSessions: FeatureMetric;
}
export interface FeatureWindowProjection {
  window: FeatureWindow;
  coverage: FeatureCoverage;
  metrics: FeatureMetrics;
  topMoments: Array<{ id: string; opens: number }>;
  topAssets: Array<{ asset: AssetIdentity; opens: number }>;
  topChannels: Array<{ channel: string; distinctSessions: number }>;
  distributionIssuers: Array<{ kind: "athlete" | "organization"; id: string; subjectPlayerId: string; distinctSessions: number }>;
  licensingGroups: FeatureIntentGroup[];
  printGroups: FeatureIntentGroup[];
  verifiedPlaybackSample: { autoplayStarts: number; userInitiatedStarts: number; unknownAutoplayStarts: number };
}
export interface TrustedDistributionTouch {
  /** Server registry verification, never a browser-supplied properties flag. */
  verified: true;
  linkId: string;
  issuer: { kind: "athlete"; playerId: string } | { kind: "organization"; organizationId: string };
  subjectPlayerId: string;
  receivedAt: string;
}
export interface ReviewedAssetBinding {
  playerId: string;
  assetId: string;
  assetModel: FeatureAssetModel;
  momentId: string | null;
}
export interface FeatureDeliveryHealth {
  expectedActivity: boolean;
  /** Cadence comes from the delivery schedule/registry, not event absence. */
  expectedCadenceSeconds: number;
  monitoringStartedAt: string;
  lastAcknowledgedAt: string | null;
}
export interface FeatureProjectionInput {
  subject: FeatureSubject;
  scope: FeatureScope;
  environment: FeatureEnvironment;
  events: readonly FeatureProjectionEvent[];
  asOf: string;
  computedAt: string;
  eventWatermark: string;
  runId: string;
  inputSnapshotHash: string;
  inputSnapshotReference: string;
  inputRevision: number;
  currentWindow?: FeatureWindow;
  baselineWindow?: FeatureWindow;
  coverage: { current: FeatureCoverage; baseline: FeatureCoverage };
  staleAfterSeconds?: number;
  minimumRateDenominator?: number;
  minimumPlaybackDenominator?: number;
  /** Reviewed athlete-Moment associations for this player. */
  reviewedMomentIds?: readonly string[];
  reviewedAssetBindings?: readonly ReviewedAssetBinding[];
  /** Map keyed by environment:event_id, obtained from an authenticated link registry. */
  trustedDistribution?: Readonly<Record<string, TrustedDistributionTouch>>;
  deliveryHealth?: FeatureDeliveryHealth;
}
export interface IntelligenceFeatureSnapshot {
  schemaVersion: 1;
  featureVersion: typeof FEATURE_VERSION;
  subject: FeatureSubject;
  scope: FeatureScope;
  scopeKey: string;
  environment: FeatureEnvironment;
  current: FeatureWindowProjection;
  baseline: FeatureWindowProjection;
  comparisons: Record<"eligibleDistinctSessions" | "lockerSessions" | "momentSessions" | "qualifiedSessions" | "lockerOpens" | "momentOpens" | "mediaOpens" | "athleteDistributedSessions" | "athleteDistributedQualifiedSessions", FeatureComparison>;
  quality: {
    state: MetricState;
    stale: boolean;
    comparable: boolean;
    exclusions: Record<string, number>;
    logicalEventCount: number;
    duplicateDeliveries: number;
    ambiguousEventIds: number;
    reviewedMomentContext: boolean;
    reviewedAssetContext: boolean;
    distributionRegistryAvailable: boolean;
  };
  provenance: {
    runId: string;
    inputSnapshotHash: string;
    inputSnapshotReference: string;
    inputRevision: number;
    eventWatermark: string;
    asOf: string;
    computedAt: string;
    measurementVersions: { current: string | null; baseline: string | null };
  };
  deliveryHealth: FeatureDeliveryHealth | null;
}

export const MEASURED_SIGNAL_TYPES = ["locker_discovery_spike", "moment_rediscovery", "asset_engagement_spike", "athlete_distribution_growth", "licensing_intent_cluster", "print_intent_cluster", "measurement_coverage_failure"] as const;
export type MeasuredSignalType = typeof MEASURED_SIGNAL_TYPES[number];
export interface MeasuredIntelligenceSignal {
  key: string;
  type: MeasuredSignalType;
  ruleVersion: typeof MEASURED_RULE_VERSION;
  subject: FeatureSubject;
  playerId: string;
  momentId: string | null;
  scope: FeatureScope;
  environment: FeatureEnvironment;
  editorialPriority: number;
  /** No evidence confidence or probability is invented from traffic counts. */
  confidence: null;
  commercialReadiness: "research_needed" | "not_applicable";
  explanation: string;
  evaluationWindow: FeatureWindow;
  trigger: { metric: string; current: number | null; baseline: number | null; absoluteChange: number | null; growthFraction: number | null; asset?: AssetIdentity; intendedUse?: string };
  measurementQuality: { state: MetricState; coverageFraction: number | null; sampleSize: number; basis: string };
  lineage: { featureVersion: string; runId: string; inputSnapshotHash: string; inputSnapshotReference: string; eventWatermark: string };
  status: "candidate";
}
export interface MeasuredOpportunity {
  key: string;
  type: "athlete_redistribution_review" | "moment_rediscovery_review" | "asset_engagement_review" | "licensing_brief_review" | "career_poster_review" | "measurement_repair";
  subject: FeatureSubject;
  playerId: string;
  momentId: string | null;
  signalKeys: string[];
  status: "candidate";
  readiness: "research_needed" | "operational_review";
  blockers: string[];
}
export interface MeasuredSignalEvaluation {
  signals: MeasuredIntelligenceSignal[];
  opportunities: MeasuredOpportunity[];
  suppressed: Array<{ type: MeasuredSignalType; reasons: string[] }>;
}

export function featureScopeKey(scope: FeatureScope): string {
  if (scope.kind === "organization") {
    if (!z.string().uuid().safeParse(scope.organizationId).success) throw new Error("invalid_feature_organization");
    return `organization:${scope.organizationId}`;
  }
  if (scope.kind !== "public_audience" && scope.kind !== "internal_admin") throw new Error("invalid_feature_scope");
  return scope.kind;
}
export function featureSubjectKey(subject: FeatureSubject): string {
  featureSubjectSchema.parse(subject);
  if (subject.kind === "moment") return `moment:${subject.playerId}:${subject.momentId}`;
  if (subject.kind === "asset") return `asset:${subject.playerId}:${subject.assetModel}:${subject.assetId}`;
  return `athlete:${subject.playerId}`;
}
