import { z } from "zod";
import fixtureDocument from "@/docs/intelligence/fixtures/BLTZ-Intelligence-Workflow-Fixtures-2026-10-04.json";
import { evaluateIntelligenceSignals } from "@/lib/intelligence/signals/evaluate";
import type { IntelligenceOpportunity, IntelligenceSignal } from "@/lib/intelligence/signals/types";
import { resolveMediaPermissions } from "@/lib/intelligence/workflows/permissions";
import { canProjectFeatureSnapshot, projectIntelligenceFeatures } from "./project";
import { evaluateMeasuredSignals } from "./signals";
import type { FeatureCoverage, FeatureProjectionEvent, FeatureProjectionInput, IntelligenceFeatureSnapshot, MeasuredIntelligenceSignal, MeasuredSignalEvaluation, TrustedDistributionTouch } from "./contracts";

const scenarioIds = ["anniversary_blocked_media", "measured_discovery_to_activation_draft", "zero_baseline_and_partial_coverage", "license_distribution_conversion_and_refund", "rights_revocation_after_approval", "duplicate_delivery_and_stale_feature_job"] as const;
export type SyntheticWorkflowScenarioId = typeof scenarioIds[number];
type DisplayValue = string | number | boolean | null | string[];
type SyntheticFeatureSnapshot = Omit<IntelligenceFeatureSnapshot, "environment"> & { environment: "synthetic" };
type SyntheticMeasuredEvaluation = Omit<MeasuredSignalEvaluation, "signals"> & { signals: Array<Omit<MeasuredIntelligenceSignal, "environment"> & { environment: "synthetic" }> };
type SyntheticCareerEvaluation = { signals: Array<IntelligenceSignal & { environment: "synthetic" }>; opportunities: IntelligenceOpportunity[] };
export interface SyntheticWorkflowCheck { name: string; expected: DisplayValue; actual: DisplayValue; passed: boolean | null; basis: "executed_pure_code" | "arithmetic_simulation" | "contract_expectation" }
export interface SyntheticWorkflowExample {
  schemaVersion: 1;
  id: SyntheticWorkflowScenarioId;
  synthetic: true;
  environment: "synthetic";
  label: "Synthetic example";
  isolation: "isolated_development_only";
  mayPersist: false;
  excludeFrom: string[];
  title: string;
  description: string;
  asOf: string;
  playerId: string;
  athleteName: string;
  organizationName: string;
  subjectNamespace: string;
  snapshot: SyntheticFeatureSnapshot | null;
  evaluation: SyntheticMeasuredEvaluation | null;
  careerEvaluation: SyntheticCareerEvaluation | null;
  outcome: Record<string, DisplayValue>;
  expectedOutcome: Record<string, DisplayValue>;
  checks: SyntheticWorkflowCheck[];
  assumptions: string[];
  activation: { id: string; title: string; state: "draft" | "expected_paused"; proposedBrands: Array<{ name: string; status: "proposed" }>; releaseAt: string | null; reach: null; impressions: null; publishingAllowed: false; persisted: false } | null;
}

const pack = z.object({ synthetic: z.literal(true), artifact_kind: z.literal("synthetic_expected_result_specification"), environment: z.literal("isolated_development_only"), exclude_from: z.array(z.string()), labels: z.object({ athlete: z.string(), organization: z.string(), brand: z.string(), provider: z.string() }), ids: z.object({ player_id: z.string().uuid().startsWith("10000000-"), moment_id: z.string().uuid().startsWith("20000000-"), asset_id: z.string().uuid().startsWith("30000000-"), activation_id: z.string().uuid().startsWith("40000000-") }), scenarios: z.array(z.object({ id: z.enum(scenarioIds), as_of: z.string().datetime({ offset: true }), input: z.record(z.string(), z.unknown()), expected: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(z.string())])) })).length(6) }).parse(fixtureDocument);
type Scenario = typeof pack.scenarios[number];
const eventId = (number: number) => `60000000-0000-4000-8000-${number.toString().padStart(12, "0")}`;
const iso = (number: number) => new Date(number).toISOString();
const sevenDays = 7 * 86_400_000;
const instrumentation = ["locker_viewed", "moment_opened", "media_opened", "share_link_copied", "license_requested", "print_requested"];
const names: Record<SyntheticWorkflowScenarioId, [string, string]> = {
  anniversary_blocked_media: ["Anniversary with missing media", "A real deterministic calendar rule runs on wholly synthetic reviewed career evidence; missing media and permissions remain blockers."],
  measured_discovery_to_activation_draft: ["Measured discovery to a blocked draft", "A synthetic increase from 40 to 120 eligible tab sessions produces a review candidate; a local draft does not establish a partnership or reach."],
  zero_baseline_and_partial_coverage: ["Zero baseline and partial coverage", "Unknown baseline coverage suppresses growth ranking instead of producing an infinite percentage or a commercial opportunity."],
  license_distribution_conversion_and_refund: ["Commission and reversal arithmetic", "Isolated contract arithmetic tests the supplied assumptions. This does not authenticate a provider, record an allocation or execute a payout."],
  rights_revocation_after_approval: ["Revocation requires immediate blocking", "The shared permission boundary blocks use of a revoked asset. Pausing a scheduled release and recording governance history are contract expectations, not executed fixture writes."],
  duplicate_delivery_and_stale_feature_job: ["Repeated delivery and an older feature job", "The actual pure projector deduplicates logical events and the snapshot fence rejects a delayed write."],
};
function check(name: string, expected: DisplayValue, actual: DisplayValue, basis: SyntheticWorkflowCheck["basis"] = "executed_pure_code"): SyntheticWorkflowCheck {
  return { name, expected, actual, passed: basis === "contract_expectation" ? null : Array.isArray(expected) && Array.isArray(actual) ? expected.every(item => actual.includes(item)) : JSON.stringify(expected) === JSON.stringify(actual), basis };
}
function event(number: number, asOf: string, patch: Partial<FeatureProjectionEvent> = {}): FeatureProjectionEvent {
  return { event_id: eventId(number), schema_version: 1, event_version: "legacy-v1", event_name: "locker_viewed", occurred_at: iso(Date.parse(asOf) - 86_400_000), received_at: asOf, environment: "development", surface: "public_locker", producer: "synthetic_fixture_adapter", actor_kind: "anonymous", measurement_basis: "unverified_client", audience_eligible: true, subject_player_id: pack.ids.player_id, moment_id: null, asset_id: null, asset_model: null, session_id: eventId(number + 10_000), scope_key: "public_audience", source_channel: "unknown", properties: {}, ...patch };
}
function coverage(start: string, end: string, complete = true): FeatureCoverage {
  return { state: complete ? "complete" : "partial", start, end, fraction: complete ? 1 : null, measurementVersion: "synthetic-observations-v1", instrumentedEvents: [...instrumentation] };
}
function projectionInput(scenario: Scenario, events: FeatureProjectionEvent[]): FeatureProjectionInput {
  const end = Date.parse(scenario.as_of), start = iso(end - sevenDays), prior = iso(end - 2 * sevenDays);
  return { subject: { kind: "athlete", playerId: pack.ids.player_id }, scope: { kind: "public_audience" }, environment: "development", events, asOf: scenario.as_of, computedAt: scenario.as_of, eventWatermark: scenario.as_of, runId: eventId(900_000 + scenarioIds.indexOf(scenario.id)), inputSnapshotHash: `synthetic-fixture:${scenario.id}:v1`, inputSnapshotReference: `synthetic-fixture:${scenario.id}`, inputRevision: 1, coverage: { current: coverage(start, scenario.as_of), baseline: coverage(prior, start) }, reviewedMomentIds: [pack.ids.moment_id], reviewedAssetBindings: [{ playerId: pack.ids.player_id, assetId: pack.ids.asset_id, assetModel: "media_asset", momentId: pack.ids.moment_id }] };
}
function syntheticSnapshot(snapshot: IntelligenceFeatureSnapshot): SyntheticFeatureSnapshot { return { ...snapshot, environment: "synthetic" }; }
function syntheticEvaluation(evaluation: MeasuredSignalEvaluation): SyntheticMeasuredEvaluation {
  const key = (value: string) => `synthetic:${value.replace(":development:", ":synthetic:")}`;
  return { signals: evaluation.signals.map(signal => ({ ...signal, key: key(signal.key), environment: "synthetic" })), opportunities: evaluation.opportunities.map(opportunity => ({ ...opportunity, key: key(opportunity.key), signalKeys: opportunity.signalKeys.map(key) })), suppressed: evaluation.suppressed };
}
function base(scenario: Scenario): SyntheticWorkflowExample {
  return { schemaVersion: 1, id: scenario.id, synthetic: true, environment: "synthetic", label: "Synthetic example", isolation: "isolated_development_only", mayPersist: false, excludeFrom: [...pack.exclude_from, "live_counts", "partner_reports", "event_delivery"], title: names[scenario.id][0], description: names[scenario.id][1], asOf: scenario.as_of, playerId: pack.ids.player_id, athleteName: pack.labels.athlete, organizationName: pack.labels.organization, subjectNamespace: `synthetic:${scenario.id}`, snapshot: null, evaluation: null, careerEvaluation: null, outcome: {}, expectedOutcome: { ...scenario.expected }, checks: [], assumptions: ["All identities, evidence, sessions, brands and outcomes in this example are synthetic.", "No database query, event publication, financial storage or provider request is performed."], activation: null };
}

function buildAnniversary(scenario: Scenario): SyntheticWorkflowExample {
  const input = z.object({ moment_title: z.string(), occurred_on: z.string(), date_precision: z.literal("day"), moment_status: z.literal("verified"), association_status: z.literal("verified"), moment_confidence: z.number(), association_confidence: z.number(), occurrence_evidence: z.object({ status: z.literal("verified"), confidence: z.number(), occurred_on: z.string(), source_id: z.string().uuid(), provider: z.string(), source_label: z.string(), locator: z.string().nullable(), fetched_at: z.string() }), anniversary_window_days: z.number(), reviewed_moment_asset_count: z.number(), use_permission: z.literal("unknown"), athlete_preference: z.literal("unknown") }).parse(scenario.input);
  const result = evaluateIntelligenceSignals([{ playerId: pack.ids.player_id, momentId: pack.ids.moment_id, title: input.moment_title, occurredOn: input.occurred_on, datePrecision: input.date_precision, verificationStatus: input.moment_status, confidence: Math.min(input.moment_confidence, input.association_confidence), evidence: [{ id: eventId(800_000), sourceId: input.occurrence_evidence.source_id, sourceLabel: input.occurrence_evidence.source_label, sourceProvider: input.occurrence_evidence.provider, sourceLocator: input.occurrence_evidence.locator, sourceUrl: null, fetchedAt: input.occurrence_evidence.fetched_at, assertion: "Synthetic reviewed athlete association and exact sports occurrence", confidence: input.occurrence_evidence.confidence }] }], { asOf: scenario.as_of, anniversaryWindowDays: input.anniversary_window_days });
  const signal = result.signals[0];
  const key = (value: string) => `synthetic:${value}`;
  const outcome = { signal_type: signal.type, target_date: signal.targetDate, anniversary_years: Number(signal.data.anniversaryYears), days_until: Number(signal.data.daysUntil), editorial_priority: signal.score, confidence: signal.confidence, opportunity_type: result.opportunities[0].type, opportunity_state: result.opportunities[0].status, readiness: "research_needed", blockers: ["moment_media", "use_permission", "athlete_preferences"], activation_count: 0, earnings_cents: null };
  return { ...base(scenario), careerEvaluation: { signals: result.signals.map(item => ({ ...item, key: key(item.key), environment: "synthetic" })), opportunities: result.opportunities.map(item => ({ ...item, key: key(item.key), signalKeys: item.signalKeys.map(key) })) }, outcome, checks: Object.entries(scenario.expected).map(([name, expected]) => check(name, expected, outcome[name as keyof typeof outcome])) };
}
function buildDiscovery(scenario: Scenario): SyntheticWorkflowExample {
  const input = z.object({ current_window: z.object({ start: z.string(), end: z.string(), sessions: z.number().int().nonnegative() }), baseline_window: z.object({ start: z.string(), end: z.string(), sessions: z.number().int().nonnegative() }), signed_athlete_distributed_sessions_current: z.number().int().nonnegative(), complete_comparable_coverage: z.literal(true), measurement_version_unchanged: z.literal(true), reviewed_moment_link: z.literal(true), reviewed_asset_link: z.literal(true), use_permission: z.literal("unknown"), activation_user_action: z.literal("create_draft") }).parse(scenario.input);
  const current = Array.from({ length: input.current_window.sessions }, (_, number) => event(number + 1, scenario.as_of));
  const baseline = Array.from({ length: input.baseline_window.sessions }, (_, number) => event(number + 1001, scenario.as_of, { occurred_at: iso(Date.parse(input.baseline_window.end) - 86_400_000) }));
  const trustedDistribution: Record<string, TrustedDistributionTouch> = {};
  for (const row of current.slice(0, input.signed_athlete_distributed_sessions_current)) trustedDistribution[`development:${row.event_id}`] = { verified: true, linkId: "synthetic-athlete-link", issuer: { kind: "athlete", playerId: "10000000-0000-4000-8000-000000000002" }, subjectPlayerId: pack.ids.player_id, receivedAt: row.received_at };
  const snapshot = projectIntelligenceFeatures({ ...projectionInput(scenario, [...current, ...baseline]), trustedDistribution });
  const evaluation = evaluateMeasuredSignals(snapshot);
  const change = snapshot.comparisons.lockerSessions;
  const signal = evaluation.signals.find(item => item.type === "locker_discovery_spike")!;
  const outcome = { proposed_signal_type: signal.type, absolute_increase: change.absoluteChange, growth: change.growthFraction, growth_display: `+${Math.round(change.growthFraction! * 100)}%`, athlete_distributed_session_fraction: snapshot.current.metrics.athleteDistributedSessions.value! / snapshot.current.metrics.eligibleDistinctSessions.value!, opportunity: evaluation.opportunities.find(item => item.signalKeys.includes(signal.key))!.type, activation_state: "draft", approved_brand_agreement: false, activation_reach: null, activation_impressions: null, permission_blocker: true, publishing_allowed: false, earnings_cents: null };
  return { ...base(scenario), snapshot: syntheticSnapshot(snapshot), evaluation: syntheticEvaluation(evaluation), outcome, checks: Object.entries(scenario.expected).map(([name, expected]) => check(name, expected, outcome[name as keyof typeof outcome])), activation: { id: `synthetic:${pack.ids.activation_id}`, title: "Synthetic career redistribution draft", state: "draft", proposedBrands: [{ name: pack.labels.brand, status: "proposed" }], releaseAt: null, reach: null, impressions: null, publishingAllowed: false, persisted: false }, assumptions: [...base(scenario).assumptions, "Coverage and signed-link registry entries are explicit fixture assumptions, not observed cloud coverage.", "Only the current window supplies trusted distribution; no baseline distribution is invented."] };
}
function buildPartial(scenario: Scenario): SyntheticWorkflowExample {
  const input = z.object({ baseline_sessions: z.number().int().nonnegative(), current_sessions: z.number().int().nonnegative(), baseline_complete: z.boolean(), current_complete: z.boolean() }).parse(scenario.input);
  const rows = [...Array.from({ length: input.current_sessions }, (_, number) => event(number + 1, scenario.as_of)), ...Array.from({ length: input.baseline_sessions }, (_, number) => event(number + 1001, scenario.as_of, { occurred_at: iso(Date.parse(scenario.as_of) - sevenDays - 86_400_000) }))];
  const supplied = projectionInput(scenario, rows);
  supplied.coverage.current = coverage(supplied.coverage.current.start!, supplied.coverage.current.end!, input.current_complete);
  supplied.coverage.baseline = coverage(supplied.coverage.baseline.start!, supplied.coverage.baseline.end!, input.baseline_complete);
  const snapshot = projectIntelligenceFeatures(supplied), evaluation = evaluateMeasuredSignals(snapshot);
  const outcome = { growth: snapshot.comparisons.lockerSessions.growthFraction, activity_label: snapshot.comparisons.lockerSessions.activity, coverage_state: snapshot.baseline.coverage.state, engagement_spike_signal_count: evaluation.signals.filter(item => item.type === "locker_discovery_spike").length, suppression_reasons: evaluation.suppressed.find(item => item.type === "locker_discovery_spike")!.reasons, opportunity_count: evaluation.opportunities.length, no_infinite_percentage: Number.isFinite(snapshot.comparisons.lockerSessions.growthFraction ?? 0) };
  return { ...base(scenario), snapshot: syntheticSnapshot(snapshot), evaluation: syntheticEvaluation(evaluation), outcome, checks: Object.entries(scenario.expected).map(([name, expected]) => check(name, expected, outcome[name as keyof typeof outcome])) };
}
function buildCommerceArithmetic(scenario: Scenario): SyntheticWorkflowExample {
  const input = z.object({ currency: z.literal("USD"), eligible_net_sale_cents: z.number().int().nonnegative(), commission_rate: z.number().min(0).max(1), athlete_share_of_received_commission: z.number().min(0).max(1), bltz_variable_cost_cents: z.number().int().nonnegative(), agreement: z.string().startsWith("synthetic_"), provider_order_id: z.string().startsWith("synthetic-"), provider_order_line_id: z.string().startsWith("synthetic-"), provider_authenticated: z.literal(true), commission_actually_received: z.literal(true), payout_executed: z.literal(false), refund: z.object({ event_id: z.string().startsWith("synthetic-"), full_commission_reversal: z.literal(true), athlete_not_yet_paid: z.literal(true), variable_cost_recovered: z.literal(false), delivery_count: z.number().int().positive() }) }).parse(scenario.input);
  const commission = Math.round(input.eligible_net_sale_cents * input.commission_rate);
  const allocation = Math.round(commission * input.athlete_share_of_received_commission);
  // These are local arithmetic sets, not financial ledgers or accepted partner events.
  const orderLines = new Set([`${input.provider_order_id}:${input.provider_order_line_id}`]);
  const refundIds = new Set(Array.from({ length: input.refund.delivery_count }, () => input.refund.event_id));
  const reversedCommission = refundIds.size === 1 ? commission : 0;
  const outcome = { attribution_basis: "confirmed_tracked_conversion", vendor_retained_cents: input.eligible_net_sale_cents - commission, bltz_commission_cents: commission, allocated_athlete_cents: allocation, paid_athlete_cents: 0, bltz_contribution_before_refund_cents: commission - allocation - input.bltz_variable_cost_cents, logical_confirmed_order_lines: orderLines.size, logical_refund_reversals: refundIds.size, athlete_allocation_after_refund_cents: input.refund.athlete_not_yet_paid ? 0 : allocation, net_commission_after_refund_cents: commission - reversedCommission, bltz_contribution_after_refund_cents: commission - reversedCommission - input.bltz_variable_cost_cents, no_browser_authorized_conversion: true };
  return { ...base(scenario), outcome, checks: Object.entries(scenario.expected).map(([name, expected]) => check(name, expected, outcome[name as keyof typeof outcome], "arithmetic_simulation")), assumptions: [...base(scenario).assumptions, "Authenticated partner confirmation, actual commission receipt and signed distribution agreement are fixture assumptions only.", "15% commission and 40% participation are supplied planning inputs, not current provider rates or athlete entitlements.", "No transaction or allocation engine is invoked; no money or payout record exists."] };
}
function buildRevocation(scenario: Scenario): SyntheticWorkflowExample {
  const input = z.object({ activation_state: z.literal("scheduled"), approved_revision: z.number().int().positive(), current_revision: z.number().int().positive(), permission_now: z.literal("revoked"), release_at: z.string(), feature_refresh_pending: z.literal(true) }).parse(scenario.input);
  const decision = resolveMediaPermissions({ model: "legacy_media", associationReviewed: true, athleteRelationshipVerified: true, kind: "photo", licenseStatus: input.permission_now, publicLockerApproved: true, licenseKind: "synthetic_legacy_display" }, "public_display");
  const outcome: Record<string, DisplayValue> = { publishing_allowed: decision.allowed, permission_reason: decision.reason, activation_state: "expected_paused", actual_workflow_transition_executed: false, analytics_refresh_required_for_denial: false, rights_exception_created: false };
  const checks = Object.entries(scenario.expected).map(([name, expected]) => name === "publishing_allowed" || name === "rights_exception_created" ? check(name, expected, outcome[name]) : name === "do_not_wait_for_analytics_refresh" ? check(name, expected, !outcome.analytics_refresh_required_for_denial) : check(name, expected, null, "contract_expectation"));
  return { ...base(scenario), outcome, checks, activation: { id: `synthetic:${pack.ids.activation_id}`, title: "Synthetic revoked-use scenario", state: "expected_paused", proposedBrands: [{ name: pack.labels.brand, status: "proposed" }], releaseAt: input.release_at, reach: null, impressions: null, publishingAllowed: false, persisted: false }, assumptions: [...base(scenario).assumptions, "The current compatibility resolver denies revoked display immediately.", "A licensed scheduled poster, rights-notice ingestion, automatic pause and governance audit are not executed here; those remain explicit contract expectations."] };
}
function buildDuplicate(scenario: Scenario): SyntheticWorkflowExample {
  const input = z.object({ event_id: z.string().uuid(), raw_delivery_count: z.number().int().positive(), incoming_feature_watermark: z.string(), stored_feature_watermark: z.string(), first_insert_succeeded_but_worker_ack_lost: z.literal(true), replay_after_queue_dedup_window: z.literal(true) }).parse(scenario.input);
  const row = event(1, scenario.as_of, { event_id: input.event_id, occurred_at: iso(Date.parse(input.incoming_feature_watermark) - 60_000), received_at: input.incoming_feature_watermark });
  const incoming = projectIntelligenceFeatures({ ...projectionInput(scenario, Array.from({ length: input.raw_delivery_count }, () => ({ ...row }))), eventWatermark: input.incoming_feature_watermark, inputRevision: 2 });
  const stored: IntelligenceFeatureSnapshot = { ...incoming, provenance: { ...incoming.provenance, eventWatermark: input.stored_feature_watermark, inputRevision: 1 } };
  const writeAllowed = canProjectFeatureSnapshot(stored, incoming), evaluation = evaluateMeasuredSignals(incoming);
  const outcome: Record<string, DisplayValue> = { logical_event_count: incoming.quality.logicalEventCount, deduplicate_before_aggregation: incoming.current.metrics.lockerOpens.value === 1, reconciliation_required: true, old_feature_write_allowed: writeAllowed, feature_watermark_retained: writeAllowed ? input.incoming_feature_watermark : input.stored_feature_watermark, no_duplicate_signals: new Set(evaluation.signals.map(item => item.key)).size === evaluation.signals.length, no_duplicate_signal_or_allocation: null };
  return { ...base(scenario), snapshot: syntheticSnapshot(incoming), evaluation: syntheticEvaluation(evaluation), outcome, checks: Object.entries(scenario.expected).map(([name, expected]) => check(name, expected, outcome[name], name === "reconciliation_required" || name === "no_duplicate_signal_or_allocation" ? "contract_expectation" : "executed_pure_code")), assumptions: [...base(scenario).assumptions, "External Tinybird insert/acknowledgment is not simulated; replayed rows exercise the actual local deduplication algorithm.", "No financial allocation function is called; only signal keys are checked for uniqueness."] };
}

/** Isolated read-only examples. Never pass these synthetic DTOs to a live collector or serving store. */
export function buildSyntheticWorkflowExamples(): SyntheticWorkflowExample[] {
  const builders: Record<SyntheticWorkflowScenarioId, (scenario: Scenario) => SyntheticWorkflowExample> = { anniversary_blocked_media: buildAnniversary, measured_discovery_to_activation_draft: buildDiscovery, zero_baseline_and_partial_coverage: buildPartial, license_distribution_conversion_and_refund: buildCommerceArithmetic, rights_revocation_after_approval: buildRevocation, duplicate_delivery_and_stale_feature_job: buildDuplicate };
  return pack.scenarios.map(scenario => builders[scenario.id](scenario));
}
export function buildSyntheticWorkflowExample(id: string): SyntheticWorkflowExample | null { return buildSyntheticWorkflowExamples().find(example => example.id === id) ?? null; }
