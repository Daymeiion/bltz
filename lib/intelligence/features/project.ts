import { z } from "zod";
import {
  FEATURE_VERSION, QUALIFIED_SESSION_DEFINITION, SEVEN_DAYS_MS,
  featureScopeKey, featureSubjectKey,
  type FeatureComparison, type FeatureCoverage, type FeatureIntentGroup,
  type FeatureMetric, type FeatureMetrics, type FeatureProjectionEvent,
  type FeatureProjectionInput, type FeatureWindow, type FeatureWindowProjection,
  type IntelligenceFeatureSnapshot, type MetricState, type TrustedDistributionTouch,
} from "./contracts";

const uuid = z.string().uuid();
const timestamp = z.string().datetime({ offset: true });
const token = /^[a-zA-Z0-9][a-zA-Z0-9_:-]{0,119}$/;
const assetModels = new Set(["legacy_media", "legacy_video", "media_asset"]);
const channels = new Set(["direct", "search", "social", "referral", "athlete_distribution", "organization_distribution", "unknown"]);
const meaningfulActions = new Set(["media_opened", "source_reference_opened", "share_intent", "share_link_copied", "license_requested", "print_requested", "merchandise_clicked", "trading_card_clicked", "media_download_requested", "speaking_media_requested", "archive_access_requested", "video_started", "video_completed"]);
const audienceNames = new Set(["locker_viewed", "moment_opened", "distribution_link_clicked", "related_athlete_opened", "search_result_clicked", "media_impression", "media_opened", "source_reference_opened", "share_intent", "share_link_copied", "license_requested", "print_requested", "merchandise_clicked", "trading_card_clicked", "media_download_requested", "speaking_media_requested", "archive_access_requested", "video_started", "video_progress", "video_completed", "session_engaged"]);
const actorKinds = new Set(["anonymous", "authenticated", "internal", "operational"]);
const measurementBases = new Set(["unverified_client", "server_workflow", "legacy_alias", "verified_player_callback", "visibility_50pct_1s_v1", "verified_engagement"]);

function time(value: string, label: string): number {
  if (!timestamp.safeParse(value).success || !Number.isFinite(Date.parse(value))) throw new Error(`invalid_feature_${label}`);
  return Date.parse(value);
}
function iso(value: number): string { return new Date(value).toISOString(); }
function normalName(event: FeatureProjectionEvent): string {
  if (event.event_name === "media_viewed") return "media_opened";
  if (event.event_name === "locker_shared") return event.properties.method === "copy_link" ? "share_intent_alias" : "share_intent";
  return event.event_name;
}
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
function fingerprint(event: FeatureProjectionEvent): string {
  // received_at may differ in a replay envelope; the original logical occurrence cannot.
  return canonicalJson({ ...event, received_at: undefined });
}
function eventShapeValid(event: FeatureProjectionEvent): boolean {
  return event.schema_version === 1 && uuid.safeParse(event.event_id).success
    && timestamp.safeParse(event.occurred_at).success && timestamp.safeParse(event.received_at).success
    && typeof event.event_name === "string" && /^[a-z][a-z0-9_]{0,79}$/.test(event.event_name)
    && ["development", "production", "preview", "synthetic"].includes(event.environment)
    && actorKinds.has(event.actor_kind) && measurementBases.has(event.measurement_basis)
    && typeof event.audience_eligible === "boolean"
    && !!event.event_version && typeof event.event_version === "string" && event.event_version.length <= 160
    && !!event.producer && typeof event.producer === "string" && event.producer.length <= 160
    && !!event.properties && typeof event.properties === "object"
    && !Array.isArray(event.properties)
    && (!event.subject_player_id || uuid.safeParse(event.subject_player_id).success)
    && (!event.session_id || uuid.safeParse(event.session_id).success)
    && (!event.moment_id || uuid.safeParse(event.moment_id).success)
    && (!!event.asset_id === !!event.asset_model)
    && (!event.asset_id || uuid.safeParse(event.asset_id).success && assetModels.has(event.asset_model!));
}
function covered(input: FeatureCoverage, window: FeatureWindow): FeatureCoverage {
  const validFraction = input.fraction !== null && Number.isFinite(input.fraction) && input.fraction >= 0 && input.fraction <= 1;
  const validBounds = input.start !== null && input.end !== null && timestamp.safeParse(input.start).success && timestamp.safeParse(input.end).success
    && Date.parse(input.start) <= Date.parse(window.start) && Date.parse(input.end) >= Date.parse(window.end);
  const complete = input.state === "complete" && validBounds && input.fraction === 1 && !!input.measurementVersion;
  return { ...input, state: input.state === "unavailable" ? "unavailable" : complete ? "complete" : "partial",
    fraction: validFraction ? input.fraction : null, instrumentedEvents: [...new Set(input.instrumentedEvents)].sort() };
}
function instrumented(coverage: FeatureCoverage, names: readonly string[]): boolean {
  return names.some(name => coverage.instrumentedEvents.includes(name));
}
function stateFor(coverage: FeatureCoverage, available: boolean, stale: boolean): MetricState {
  if (coverage.state === "unavailable") return "unavailable";
  if (!available) return "unknown";
  if (stale) return "stale";
  return coverage.state === "complete" ? "observed" : "partial";
}
function metric(value: number, coverage: FeatureCoverage, available: boolean, stale: boolean, definition: string, denominator: number | null = null): FeatureMetric {
  const state = stateFor(coverage, available, stale);
  return { value: state === "unknown" || state === "unavailable" ? null : value, state, definition, sampleSize: denominator ?? value, denominator };
}
function rate(numerator: FeatureMetric, denominator: FeatureMetric, minimum: number, definition: string): FeatureMetric {
  if (numerator.value === null || denominator.value === null) return { value: null, state: numerator.state === "unavailable" || denominator.state === "unavailable" ? "unavailable" : "unknown", definition, sampleSize: denominator.value ?? 0, denominator: denominator.value };
  const state = numerator.state !== "observed" ? numerator.state : denominator.state !== "observed" ? denominator.state : denominator.value < minimum ? "insufficient_sample" : "observed";
  return { value: state === "insufficient_sample" || denominator.value === 0 ? null : numerator.value / denominator.value, state, definition, sampleSize: denominator.value, denominator: denominator.value };
}
function assetKey(event: FeatureProjectionEvent): string | null { return event.asset_id && event.asset_model ? `${event.asset_model}:${event.asset_id}` : null; }
function propertyToken(event: FeatureProjectionEvent, key: string): string | null {
  const value = event.properties[key];
  return typeof value === "string" && token.test(value) ? value : null;
}
function trustedTouch(event: FeatureProjectionEvent, input: FeatureProjectionInput): TrustedDistributionTouch | null {
  const touch = input.trustedDistribution?.[`${event.environment}:${event.event_id}`];
  if (!touch || touch.verified !== true || !token.test(touch.linkId) || touch.subjectPlayerId !== event.subject_player_id
    || !timestamp.safeParse(touch.receivedAt).success || Date.parse(touch.receivedAt) > Date.parse(event.received_at)
    || !["locker_viewed", "moment_opened", "distribution_link_clicked"].includes(normalName(event))) return null;
  const issuerId = touch.issuer.kind === "athlete" ? touch.issuer.playerId : touch.issuer.kind === "organization" ? touch.issuer.organizationId : null;
  return issuerId && uuid.safeParse(issuerId).success ? touch : null;
}
function ranked<T>(rows: T[], score: (row: T) => number, tie: (row: T) => string): T[] {
  return rows.sort((a, b) => score(b) - score(a) || tie(a).localeCompare(tie(b))).slice(0, 5);
}

function projectWindow(events: readonly FeatureProjectionEvent[], window: FeatureWindow, coverage: FeatureCoverage, input: FeatureProjectionInput, stale: boolean, contextReady: boolean): FeatureWindowProjection {
  const rows = events.filter(event => Date.parse(event.occurred_at) >= Date.parse(window.start) && Date.parse(event.occurred_at) < Date.parse(window.end));
  const sessions = new Set<string>();
  const lockerSessions = new Set<string>();
  const momentSessions = new Set<string>();
  const entries = new Set<string>();
  const actions = new Set<string>();
  const validatedEngagement = new Set<string>();
  const athleteDistributed = new Set<string>();
  const organizationDistributed = new Set<string>();
  const byChannel = new Map<string, Set<string>>();
  const byIssuer = new Map<string, { touch: TrustedDistributionTouch; sessions: Set<string> }>();
  const byMoment = new Map<string, number>();
  const byAsset = new Map<string, { event: FeatureProjectionEvent; opens: number }>();
  const exposures = new Map<string, number>();
  const matchedOpens = new Set<string>();
  const starts = new Map<string, FeatureProjectionEvent>();
  const completions = new Set<string>();
  const licenseGroups = new Map<string, { event: FeatureProjectionEvent; intendedUse: string; sessions: Set<string> }>();
  const printGroups = new Map<string, { event: FeatureProjectionEvent; intendedUse: string; sessions: Set<string> }>();
  let lockerOpens = 0, momentOpens = 0, mediaOpens = 0, shareIntents = 0, licenseIntents = 0, printIntents = 0;

  // Establish episode starts first so equal timestamps and arbitrary delivery
  // ordering cannot change exposure or playback matching.
  for (const event of rows) {
    const asset = assetKey(event);
    const exposure = propertyToken(event, "exposure_id");
    const exposureKey = asset && exposure ? `${event.session_id}:${asset}:${exposure}` : null;
    if (normalName(event) === "media_impression" && exposureKey && event.measurement_basis === "visibility_50pct_1s_v1") exposures.set(exposureKey, Math.min(exposures.get(exposureKey) ?? Infinity, Date.parse(event.occurred_at)));
    const playback = propertyToken(event, "playback_id");
    const playbackKey = asset && playback ? `${event.session_id}:${asset}:${playback}` : null;
    if (normalName(event) === "video_started" && playbackKey && event.measurement_basis === "verified_player_callback") {
      const existing = starts.get(playbackKey);
      if (!existing || Date.parse(event.occurred_at) < Date.parse(existing.occurred_at) || event.occurred_at === existing.occurred_at && event.event_id.localeCompare(existing.event_id) < 0) starts.set(playbackKey, event);
    }
  }

  // Stable ordering makes matching independent of transport order and replay order.
  for (const event of [...rows].sort((a, b) => Date.parse(a.occurred_at) - Date.parse(b.occurred_at) || a.event_id.localeCompare(b.event_id))) {
    const name = normalName(event);
    const session = event.session_id!;
    const asset = assetKey(event);
    sessions.add(session);
    if (name === "locker_viewed" || name === "moment_opened" || name === "distribution_link_clicked") entries.add(session);
    if (meaningfulActions.has(name)) actions.add(session);
    if (name === "session_engaged" && event.measurement_basis === "verified_engagement" && event.producer !== "browser") validatedEngagement.add(session);
    const touch = trustedTouch(event, input);
    if (touch) {
      const issuerId = touch.issuer.kind === "athlete" ? touch.issuer.playerId : touch.issuer.organizationId;
      const key = `${touch.issuer.kind}:${issuerId}`;
      const group = byIssuer.get(key) ?? { touch, sessions: new Set<string>() };
      group.sessions.add(session); byIssuer.set(key, group);
      (touch.issuer.kind === "athlete" ? athleteDistributed : organizationDistributed).add(session);
    }
    const reportedChannel = channels.has(event.source_channel) ? event.source_channel : "unknown";
    const channel = touch ? `${touch.issuer.kind}_distribution` : reportedChannel.endsWith("_distribution") ? "unknown" : reportedChannel;
    const channelSessions = byChannel.get(channel) ?? new Set<string>(); channelSessions.add(session); byChannel.set(channel, channelSessions);
    if (name === "locker_viewed") { lockerOpens += 1; lockerSessions.add(session); }
    if (name === "moment_opened") { momentOpens += 1; momentSessions.add(session); if (event.moment_id) byMoment.set(event.moment_id, (byMoment.get(event.moment_id) ?? 0) + 1); }
    if (name === "media_opened") {
      mediaOpens += 1;
      if (asset) { const group = byAsset.get(asset) ?? { event, opens: 0 }; group.opens += 1; byAsset.set(asset, group); }
    }
    const exposureId = propertyToken(event, "exposure_id");
    const exposureKey = asset && exposureId ? `${session}:${asset}:${exposureId}` : null;
    if (name === "media_impression" && exposureKey && event.measurement_basis === "visibility_50pct_1s_v1") exposures.set(exposureKey, Math.min(exposures.get(exposureKey) ?? Infinity, Date.parse(event.occurred_at)));
    if (name === "media_opened" && exposureKey && exposures.has(exposureKey) && exposures.get(exposureKey)! <= Date.parse(event.occurred_at)) matchedOpens.add(exposureKey);
    const playbackId = propertyToken(event, "playback_id");
    const playbackKey = asset && playbackId ? `${session}:${asset}:${playbackId}` : null;
    if (name === "video_started" && playbackKey && event.measurement_basis === "verified_player_callback" && !starts.has(playbackKey)) starts.set(playbackKey, event);
    if (name === "video_completed" && playbackKey && event.measurement_basis === "verified_player_callback" && starts.has(playbackKey) && Date.parse(starts.get(playbackKey)!.occurred_at) <= Date.parse(event.occurred_at)) completions.add(playbackKey);
    if (name === "share_intent" || name === "share_link_copied") shareIntents += 1;
    if (name === "license_requested" || name === "print_requested") {
      const intendedUse = propertyToken(event, "intended_use") ?? propertyToken(event, "requested_use");
      if (intendedUse) {
        if (name === "license_requested") licenseIntents += 1; else printIntents += 1;
        if (asset) {
          const groups = name === "license_requested" ? licenseGroups : printGroups;
          const key = `${asset}:${intendedUse}`;
          const group = groups.get(key) ?? { event, intendedUse, sessions: new Set<string>() };
          group.sessions.add(session); groups.set(key, group);
        }
      }
    }
  }
  const qualified = new Set([...entries].filter(session => actions.has(session)));
  for (const session of validatedEngagement) qualified.add(session);
  const has = (names: string[]) => contextReady && instrumented(coverage, names);
  const anyAudience = contextReady && coverage.instrumentedEvents.some(name => audienceNames.has(name) || name === "media_viewed" || name === "locker_shared");
  const qualificationAvailable = has(["session_engaged"]) || has(["locker_viewed", "moment_opened", "distribution_link_clicked"]) && coverage.instrumentedEvents.some(name => meaningfulActions.has(name) || name === "media_viewed" || name === "locker_shared");
  const create = (value: number, names: string[], definition: string) => metric(value, coverage, has(names), stale, definition);
  const metrics: FeatureMetrics = {
    eligibleDistinctSessions: metric(sessions.size, coverage, anyAudience, stale, "distinct eligible tab sessions in this scope/window; not people"),
    lockerSessions: create(lockerSessions.size, ["locker_viewed"], "distinct eligible tab sessions with an actual Locker entry; not qualified sessions or people"),
    momentSessions: create(momentSessions.size, ["moment_opened"], "distinct eligible tab sessions with an actual reviewed Moment open; not people"),
    qualifiedSessions: metric(qualified.size, coverage, qualificationAvailable, stale, QUALIFIED_SESSION_DEFINITION),
    lockerOpens: create(lockerOpens, ["locker_viewed"], "deduplicated logical Locker entries; retains measurement-version semantics"),
    momentOpens: create(momentOpens, ["moment_opened"], "opens with an explicit reviewed athlete-Moment association"),
    mediaOpens: create(mediaOpens, ["media_opened", "media_viewed"], "explicit selection/detail opens; not exposure or playback"),
    mediaExposures: create(exposures.size, ["media_impression"], "50% visible for one continuous foreground second, once per exposure episode; visibility_50pct_1s_v1"),
    matchedMediaOpens: metric(matchedOpens.size, coverage, has(["media_impression"]) && has(["media_opened", "media_viewed"]), stale, "opens matched to the same preceding session/asset/exposure episode"),
    mediaOpenRate: { value: null, state: "unknown", definition: "matched opened exposure episodes / eligible exposure episodes", sampleSize: 0, denominator: null },
    videoStarts: create(starts.size, ["video_started"], "verified player callbacks, once per playback ID; autoplay cohorts remain separate"),
    videoCompletions: metric(completions.size, coverage, has(["video_started"]) && has(["video_completed"]), stale, "verified completions matched to a preceding start in the same window/playback"),
    videoCompletionRate: { value: null, state: "unknown", definition: "matched verified completions / verified playback starts", sampleSize: 0, denominator: null },
    shareIntents: create(shareIntents, ["share_intent", "share_link_copied", "locker_shared"], "share/copy intent; legacy copy alias excluded; no confirmed posting or distribution"),
    licenseIntents: create(licenseIntents, ["license_requested"], "explicit license requests with a declared requested use; no purchase inferred"),
    printIntents: create(printIntents, ["print_requested"], "explicit print requests with a declared requested use; no fulfillment inferred"),
    athleteDistributedSessions: metric(athleteDistributed.size, coverage, has(["locker_viewed", "moment_opened", "distribution_link_clicked"]) && input.trustedDistribution !== undefined, stale, "distinct sessions arriving through server-verified athlete-issued links; distributor differs from subject"),
    athleteDistributedQualifiedSessions: metric([...athleteDistributed].filter(session => qualified.has(session)).length, coverage, qualificationAvailable && has(["locker_viewed", "moment_opened", "distribution_link_clicked"]) && input.trustedDistribution !== undefined, stale, `server-verified athlete-issued arrival sessions that satisfy: ${QUALIFIED_SESSION_DEFINITION}`),
    organizationDistributedSessions: metric(organizationDistributed.size, coverage, has(["locker_viewed", "moment_opened", "distribution_link_clicked"]) && input.trustedDistribution !== undefined, stale, "distinct sessions arriving through server-verified organization-issued links; no membership or rights inferred"),
  };
  metrics.mediaOpenRate = rate(metrics.matchedMediaOpens, metrics.mediaExposures, input.minimumRateDenominator ?? 100, metrics.mediaOpenRate.definition);
  if (metrics.mediaOpens.value !== null && metrics.mediaOpens.value > 0 && metrics.matchedMediaOpens.value === 0) metrics.mediaOpenRate = { ...metrics.mediaOpenRate, value: null, state: "unknown" };
  metrics.videoCompletionRate = rate(metrics.videoCompletions, metrics.videoStarts, input.minimumPlaybackDenominator ?? 30, metrics.videoCompletionRate.definition);
  const intentGroups = (groups: typeof licenseGroups): FeatureIntentGroup[] => ranked([...groups.values()].map(group => ({ asset: { id: group.event.asset_id!, model: group.event.asset_model! }, intendedUse: group.intendedUse, distinctSessions: group.sessions.size })), row => row.distinctSessions, row => `${row.asset.model}:${row.asset.id}:${row.intendedUse}`);
  const playback = [...starts.values()];
  return {
    window, coverage, metrics,
    topMoments: ranked([...byMoment].map(([id, opens]) => ({ id, opens })), row => row.opens, row => row.id),
    topAssets: ranked([...byAsset.values()].map(({ event, opens }) => ({ asset: { id: event.asset_id!, model: event.asset_model! }, opens })), row => row.opens, row => `${row.asset.model}:${row.asset.id}`),
    topChannels: ranked([...byChannel].map(([channel, values]) => ({ channel, distinctSessions: values.size })), row => row.distinctSessions, row => row.channel),
    distributionIssuers: ranked([...byIssuer.values()].map(({ touch, sessions: values }) => ({ kind: touch.issuer.kind, id: touch.issuer.kind === "athlete" ? touch.issuer.playerId : touch.issuer.organizationId, subjectPlayerId: touch.subjectPlayerId, distinctSessions: values.size })), row => row.distinctSessions, row => `${row.kind}:${row.id}`),
    licensingGroups: intentGroups(licenseGroups), printGroups: intentGroups(printGroups),
    verifiedPlaybackSample: { autoplayStarts: playback.filter(event => event.properties.autoplay === true).length, userInitiatedStarts: playback.filter(event => event.properties.autoplay === false).length, unknownAutoplayStarts: playback.filter(event => typeof event.properties.autoplay !== "boolean").length },
  };
}

export function compareFeatureMetrics(current: FeatureMetric, baseline: FeatureMetric, comparable: boolean): FeatureComparison {
  const suppressionReasons: string[] = [];
  if (current.state === "partial") suppressionReasons.push("incomplete_current_coverage");
  if (baseline.state === "partial") suppressionReasons.push("incomplete_baseline_coverage");
  if (!comparable) suppressionReasons.push("incomparable_measurement");
  if ([current.state, baseline.state].includes("stale")) suppressionReasons.push("stale_features");
  const known = current.value !== null && baseline.value !== null;
  const usable = comparable && current.state === "observed" && baseline.state === "observed" && known;
  const state: MetricState = [current.state, baseline.state].includes("unavailable") ? "unavailable" : !known ? "unknown" : [current.state, baseline.state].includes("stale") ? "stale" : usable ? baseline.value === 0 ? "insufficient_sample" : "observed" : "partial";
  if (known && baseline.value === 0) suppressionReasons.push("zero_baseline");
  return { absoluteChange: known ? current.value! - baseline.value! : null,
    growthFraction: usable && baseline.value! > 0 ? (current.value! - baseline.value!) / baseline.value! : null, state,
    activity: !known ? "unknown" : baseline.value === 0 ? current.value! > 0 ? "new_activity" : "no_activity" : "continuing_activity", suppressionReasons };
}

/** Pure deterministic projection; caller supplies authorized events and independently proven coverage. */
export function projectIntelligenceFeatures(input: FeatureProjectionInput): IntelligenceFeatureSnapshot {
  featureSubjectKey(input.subject);
  const scopeKey = featureScopeKey(input.scope);
  if (!["development", "production"].includes(input.environment)) throw new Error("live_feature_environment_required");
  if (input.events.length > 100_000) throw new Error("feature_event_bound_exceeded");
  if (!uuid.safeParse(input.runId).success || !input.inputSnapshotHash || input.inputSnapshotHash.length > 160 || !input.inputSnapshotReference || input.inputSnapshotReference.length > 512 || !Number.isInteger(input.inputRevision) || input.inputRevision < 1) throw new Error("feature_input_lineage_required");
  const asOf = time(input.asOf, "as_of"), computedAt = time(input.computedAt, "computed_at"), watermark = time(input.eventWatermark, "watermark");
  if (computedAt < asOf || watermark > computedAt) throw new Error("invalid_feature_computation_order");
  const currentWindow = input.currentWindow ?? { start: iso(asOf - SEVEN_DAYS_MS), end: iso(asOf) };
  const baselineWindow = input.baselineWindow ?? { start: iso(asOf - 2 * SEVEN_DAYS_MS), end: iso(asOf - SEVEN_DAYS_MS) };
  const currentStart = time(currentWindow.start, "window_start"), currentEnd = time(currentWindow.end, "window_end");
  const baselineStart = time(baselineWindow.start, "baseline_start"), baselineEnd = time(baselineWindow.end, "baseline_end");
  if (currentEnd !== asOf || currentEnd - currentStart !== SEVEN_DAYS_MS || baselineEnd - baselineStart !== SEVEN_DAYS_MS || baselineEnd !== currentStart) throw new Error("equal_adjacent_seven_day_windows_required");
  for (const minimum of [input.minimumRateDenominator ?? 100, input.minimumPlaybackDenominator ?? 30]) if (!Number.isInteger(minimum) || minimum < 1) throw new Error("invalid_feature_minimum_sample");
  const staleAfter = input.staleAfterSeconds ?? 900;
  if (!Number.isFinite(staleAfter) || staleAfter < 1) throw new Error("invalid_feature_staleness");
  if (input.deliveryHealth && (!Number.isFinite(input.deliveryHealth.expectedCadenceSeconds) || input.deliveryHealth.expectedCadenceSeconds <= 0 || time(input.deliveryHealth.monitoringStartedAt, "monitoring_start") > computedAt || input.deliveryHealth.lastAcknowledgedAt !== null && time(input.deliveryHealth.lastAcknowledgedAt, "last_acknowledgment") > computedAt)) throw new Error("invalid_feature_delivery_health");
  const stale = computedAt - watermark > staleAfter * 1000;
  const currentCoverage = covered(input.coverage.current, currentWindow), baselineCoverage = covered(input.coverage.baseline, baselineWindow);
  const comparable = currentCoverage.state === "complete" && baselineCoverage.state === "complete"
    && currentCoverage.measurementVersion === baselineCoverage.measurementVersion
    && canonicalJson(currentCoverage.instrumentedEvents) === canonicalJson(baselineCoverage.instrumentedEvents);
  const exclusions: Record<string, number> = {};
  const exclude = (reason: string) => { exclusions[reason] = (exclusions[reason] ?? 0) + 1; };
  const logical = new Map<string, { event: FeatureProjectionEvent; fingerprint: string }>();
  const ambiguous = new Set<string>();
  let duplicateDeliveries = 0;
  for (const event of input.events) {
    if (!eventShapeValid(event)) { exclude("invalid_event_contract"); continue; }
    const key = `${event.environment}:${event.event_id}`;
    let identity: string;
    try { identity = fingerprint(event); } catch { exclude("invalid_event_contract"); continue; }
    const existing = logical.get(key);
    if (existing && identity !== existing.fingerprint) ambiguous.add(key);
    else if (existing) {
      duplicateDeliveries += 1;
      if (Date.parse(event.received_at) < Date.parse(existing.event.received_at)) logical.set(key, { event, fingerprint: identity });
    }
    else logical.set(key, { event, fingerprint: identity });
  }
  const reviewedMomentIds = new Set(input.reviewedMomentIds ?? []);
  const assetBindings = input.reviewedAssetBindings ?? [];
  const reviewedMomentContext = input.subject.kind !== "moment" || reviewedMomentIds.has(input.subject.momentId);
  const reviewedAssetContext = input.subject.kind !== "asset" || assetBindings.some(binding => binding.playerId === input.subject.playerId && binding.assetId === (input.subject.kind === "asset" ? input.subject.assetId : null) && binding.assetModel === (input.subject.kind === "asset" ? input.subject.assetModel : null));
  const events: FeatureProjectionEvent[] = [];
  for (const [key, { event }] of logical) {
    if (ambiguous.has(key)) { exclude("ambiguous_event_identity"); continue; }
    if (event.environment !== input.environment) { exclude("other_environment"); continue; }
    if (event.scope_key !== scopeKey) { exclude("other_scope"); continue; }
    if (!event.audience_eligible || event.measurement_basis === "legacy_alias" || !["public_locker", "organization_console"].includes(event.surface) || ["internal", "operational", "bot", "synthetic"].includes(event.actor_kind)) { exclude("ineligible_audience_activity"); continue; }
    if (input.scope.kind === "internal_admin") { exclude("internal_scope_not_audience"); continue; }
    if (event.subject_player_id !== input.subject.playerId) { exclude("other_player"); continue; }
    if (!event.session_id) { exclude("missing_tab_session"); continue; }
    if (Date.parse(event.received_at) > watermark) { exclude("beyond_delivery_watermark"); continue; }
    if (Date.parse(event.occurred_at) >= currentEnd || Date.parse(event.occurred_at) < baselineStart) { exclude("outside_window"); continue; }
    if (event.moment_id && !reviewedMomentIds.has(event.moment_id)) { exclude("unreviewed_moment_context"); continue; }
    if (input.subject.kind === "moment" && (event.moment_id !== input.subject.momentId || !reviewedMomentContext)) { exclude("other_moment"); continue; }
    if (event.asset_id && !assetBindings.some(binding => binding.playerId === input.subject.playerId && binding.assetId === event.asset_id && binding.assetModel === event.asset_model && (event.moment_id === null || binding.momentId === event.moment_id))) { exclude("unreviewed_asset_context"); continue; }
    if (input.subject.kind === "asset" && (event.asset_id !== input.subject.assetId || event.asset_model !== input.subject.assetModel || !reviewedAssetContext)) { exclude("other_asset"); continue; }
    const name = normalName(event);
    if (!audienceNames.has(name)) { exclude("not_audience_measurement"); continue; }
    if ((name.startsWith("video_") || name === "media_impression") && (!event.asset_id || !propertyToken(event, name === "media_impression" ? "exposure_id" : "playback_id"))) { exclude("measurement_episode_context_required"); continue; }
    if ((name.startsWith("video_") && event.measurement_basis !== "verified_player_callback") || (name === "media_impression" && event.measurement_basis !== "visibility_50pct_1s_v1") || (name === "session_engaged" && (event.measurement_basis !== "verified_engagement" || event.producer === "browser"))) { exclude("unverified_measurement"); continue; }
    const relevantCoverage = Date.parse(event.occurred_at) >= currentStart ? currentCoverage : baselineCoverage;
    if (!instrumented(relevantCoverage, [event.event_name, name])) { exclude("outside_instrumentation_contract"); continue; }
    events.push(event);
  }
  const contextReady = reviewedMomentContext && reviewedAssetContext;
  const current = projectWindow(events, currentWindow, currentCoverage, input, stale, contextReady);
  const baseline = projectWindow(events, baselineWindow, baselineCoverage, input, stale, contextReady);
  const comparisons = Object.fromEntries((["eligibleDistinctSessions", "lockerSessions", "momentSessions", "qualifiedSessions", "lockerOpens", "momentOpens", "mediaOpens", "athleteDistributedSessions", "athleteDistributedQualifiedSessions"] as const).map(name => [name, compareFeatureMetrics(current.metrics[name], baseline.metrics[name], comparable)])) as IntelligenceFeatureSnapshot["comparisons"];
  return { schemaVersion: 1, featureVersion: FEATURE_VERSION, subject: { ...input.subject }, scope: { ...input.scope }, scopeKey, environment: input.environment, current, baseline, comparisons,
    quality: { state: !contextReady ? "unknown" : currentCoverage.state === "unavailable" ? "unavailable" : stale ? "stale" : currentCoverage.state === "complete" ? "observed" : "partial", stale, comparable, exclusions, logicalEventCount: events.length, duplicateDeliveries, ambiguousEventIds: ambiguous.size, reviewedMomentContext, reviewedAssetContext, distributionRegistryAvailable: input.trustedDistribution !== undefined },
    provenance: { runId: input.runId, inputSnapshotHash: input.inputSnapshotHash, inputSnapshotReference: input.inputSnapshotReference, inputRevision: input.inputRevision, eventWatermark: iso(watermark), asOf: iso(asOf), computedAt: iso(computedAt), measurementVersions: { current: currentCoverage.measurementVersion, baseline: baselineCoverage.measurementVersion } },
    deliveryHealth: input.deliveryHealth ? { ...input.deliveryHealth } : null };
}

/** Storage must apply this comparison atomically; this pure check does not acquire a lock. */
export function canProjectFeatureSnapshot(stored: IntelligenceFeatureSnapshot | null, incoming: IntelligenceFeatureSnapshot): boolean {
  if (!stored) return true;
  if (stored.featureVersion !== incoming.featureVersion || stored.environment !== incoming.environment || stored.scopeKey !== incoming.scopeKey || featureSubjectKey(stored.subject) !== featureSubjectKey(incoming.subject)) return false;
  const incomingWatermark = time(incoming.provenance.eventWatermark, "watermark"), storedWatermark = time(stored.provenance.eventWatermark, "watermark");
  const incomingAsOf = time(incoming.provenance.asOf, "as_of"), storedAsOf = time(stored.provenance.asOf, "as_of");
  if (incomingWatermark < storedWatermark || incomingAsOf < storedAsOf) return false;
  if (incomingWatermark === storedWatermark && incomingAsOf === storedAsOf) return incoming.provenance.inputRevision > stored.provenance.inputRevision;
  return true;
}
