import "server-only";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { previewAdmin } from "@/lib/preview-lockers/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAnalyticsRuntimeEnvironment, type AnalyticsRuntimeEnvironment } from "./bltz-event";
import { queryPreviewSprintCounts } from "./preview-report";

const LIMIT = 1000;
const DAY = 86_400_000;
const PRIVATE_STATUS_LIMIT = 100;
const PRIVATE_STATUS_CONCURRENCY = 4;
const PRIVATE_STATUS_DEADLINE_MS = 5_000;
const states = ["queued", "pending", "published", "processing", "retry", "acknowledged", "quarantined", "dead_letter", "unknown"] as const;
type DeliveryState = typeof states[number];
export type PreviewFunnelOption = { id: string; label: string; slug: string; access: "public" | "private" | "unshared" | "unavailable" };
export type PreviewFunnelReport = {
  generatedAt: string; windowStart: string; windowEnd: string; environment: AnalyticsRuntimeEnvironment | null;
  previews: PreviewFunnelOption[]; previewsTruncated: boolean; selectedPreview: PreviewFunnelOption | null;
  selectionStatus: "ready" | "empty" | "invalid" | "unshared" | "unavailable";
  activity: { status: "available" | "unavailable"; reason: string | null; truncated: boolean; eventWatermark: string | null;
    metrics: { eventKind: string; eventCount: number; tabSessionCount: number | null }[] };
  delivery: { status: "available" | "unavailable"; reason: string | null; truncated: boolean;
    acceptedEventsTotal: number | null; sampledEvents: number; eventCountsByState: Record<DeliveryState, number>;
    acceptedAtWatermark: string | null; acknowledgedAtWatermark: string | null; oldestPendingAgeSeconds: number | null;
    basis: "latest_1000_preview_outbox_events";
    watermarkBasis: "highest_delivery_acknowledgment_not_contiguous_event_coverage" };
};

const previewSchema = z.object({ id: z.uuid(), full_name: z.string(), slug: z.string() });
const linkSchema = z.object({ preview_id: z.uuid(), public_access_enabled: z.boolean() });
const campaignSchema = z.object({ preview_id: z.uuid(), is_test: z.boolean() });
const outboxSchema = z.object({ event_id: z.uuid(), batch_id: z.uuid().nullable(), accepted_at: z.string().datetime({ offset: true }) });
const batchSchema = z.object({ id: z.uuid(), state: z.enum(["pending", "published", "processing", "retry", "acknowledged", "quarantined", "dead_letter"]),
  acknowledged_at: z.string().datetime({ offset: true }).nullable() });
const timeout = () => AbortSignal.timeout(10_000);
const emptyCounts = () => Object.fromEntries(states.map(state => [state, 0])) as Record<DeliveryState, number>;

/** No envelopes, contacts, tokens, URLs or provider errors cross this Admin report boundary. */
function emptyReport(now: Date, windowStart: string, windowEnd: string, environment: AnalyticsRuntimeEnvironment | null): PreviewFunnelReport {
  return { generatedAt: now.toISOString(), windowStart, windowEnd, environment, previews: [], previewsTruncated: false,
    selectedPreview: null, selectionStatus: "empty",
    activity: { status: "unavailable", reason: "no_preview_selected", truncated: false, eventWatermark: null, metrics: [] },
    delivery: { status: "unavailable", reason: "no_preview_selected", truncated: false, acceptedEventsTotal: null, sampledEvents: 0,
      eventCountsByState: emptyCounts(), acceptedAtWatermark: null, acknowledgedAtWatermark: null, oldestPendingAgeSeconds: null,
      basis: "latest_1000_preview_outbox_events", watermarkBasis: "highest_delivery_acknowledgment_not_contiguous_event_coverage" } };
}

async function readOptions(db: SupabaseClient, requestedPreviewId?: string) {
  const previews = await db.from("preview_lockers").select("id,full_name,slug", { count: "exact" })
    .order("updated_at", { ascending: false }).order("id").limit(LIMIT).abortSignal(timeout());
  if (previews.error || previews.count === null) throw new Error("preview_options_unavailable");
  const rows = z.array(previewSchema).max(LIMIT).parse(previews.data ?? []);
  const publicIds = new Set<string>(), privateIds = new Set<string>(), testIds = new Set<string>(), checkedIds = new Set<string>();
  for (let offset = 0; offset < rows.length; offset += 100) {
    const ids = rows.slice(offset, offset + 100).map(row => row.id);
    const [links, campaigns] = await Promise.all([
      db.from("preview_locker_short_links").select("preview_id,public_access_enabled").in("preview_id", ids).abortSignal(timeout()),
      db.from("preview_conversion_campaigns").select("preview_id,is_test").in("preview_id", ids).abortSignal(timeout()),
    ]);
    if ([links, campaigns].some(result => result.error)) throw new Error("preview_options_unavailable");
    for (const link of z.array(linkSchema).max(100).parse(links.data ?? [])) {
      if (!ids.includes(link.preview_id)) throw new Error("preview_options_scope_invalid");
      if (link.public_access_enabled) publicIds.add(link.preview_id);
    }
    for (const campaign of z.array(campaignSchema).max(100).parse(campaigns.data ?? [])) {
      if (!ids.includes(campaign.preview_id)) throw new Error("preview_options_scope_invalid");
      if (campaign.is_test) testIds.add(campaign.preview_id);
    }
  }
  // Grant-table SELECT is intentionally revoked even for authenticated Admin.
  // The existing authorized wrapper returns assignment status only, no viewer identity.
  // It does not expose assigned_at; neither preview creation nor this bool proves current 48h access.
  const privateCandidates = rows.filter(row => !testIds.has(row.id) && !publicIds.has(row.id));
  privateCandidates.sort((a, b) => Number(b.id === requestedPreviewId) - Number(a.id === requestedPreviewId));
  const bounded = privateCandidates.slice(0, PRIVATE_STATUS_LIMIT);
  const deadline = Date.now() + PRIVATE_STATUS_DEADLINE_MS;
  for (let offset = 0; offset < bounded.length && Date.now() < deadline; offset += PRIVATE_STATUS_CONCURRENCY) {
    await Promise.all(bounded.slice(offset, offset + PRIVATE_STATUS_CONCURRENCY).map(async row => {
      try {
        const remaining = deadline - Date.now();
        if (remaining <= 0) return;
        const result = await db.rpc("preview_locker_has_viewer", { p_preview_locker_id: row.id })
          .abortSignal(AbortSignal.timeout(remaining));
        if (Date.now() >= deadline || result.error || typeof result.data !== "boolean") return;
        checkedIds.add(row.id);
        if (result.data) privateIds.add(row.id);
      } catch { /* Unknown assignment is unavailable, not unpublished, and cannot hide public previews. */ }
    }));
  }
  return { options: rows.filter(row => !testIds.has(row.id)).map(row => ({ id: row.id, label: row.full_name, slug: row.slug,
    access: publicIds.has(row.id) ? "public" as const : privateIds.has(row.id) ? "private" as const
      : checkedIds.has(row.id) ? "unshared" as const : "unavailable" as const })),
    truncated: previews.count > rows.length };
}

function normalizeWatermark(value: string) {
  const timestamp = value.replace(" ", "T");
  const parsed = new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(timestamp) ? timestamp : `${timestamp}Z`);
  if (!Number.isFinite(parsed.getTime())) throw new Error("preview_report_watermark_invalid");
  return parsed.toISOString();
}

async function readActivity(previewId: string, report: PreviewFunnelReport): Promise<PreviewFunnelReport["activity"]> {
  try {
    const result = await queryPreviewSprintCounts(previewId, report.windowStart, report.windowEnd, { expectedEnvironment: report.environment! });
    const grouped = new Map<string, { eventKind: string; eventCount: number; tabSessionCount: number | null }>();
    let eventWatermark: string | null = null;
    for (const row of result.rows) {
      const watermark = normalizeWatermark(row.event_watermark);
      if (!eventWatermark || watermark > eventWatermark) eventWatermark = watermark;
      const previous = grouped.get(row.event_kind);
      // Session sets overlap between media/progress groups. Summing them would inflate sessions.
      if (previous) { previous.eventCount += row.event_count; previous.tabSessionCount = null; }
      else grouped.set(row.event_kind, { eventKind: row.event_kind, eventCount: row.event_count, tabSessionCount: row.tab_session_count });
    }
    return { status: "available", reason: null, truncated: result.truncated, eventWatermark,
      metrics: [...grouped.values()].sort((a, b) => a.eventKind.localeCompare(b.eventKind)) };
  } catch { return { ...report.activity, reason: "preview_activity_unavailable" }; }
}

async function readDelivery(previewId: string, report: PreviewFunnelReport, now: Date): Promise<PreviewFunnelReport["delivery"]> {
  try {
    const service = createServiceClient();
    // Filter on the indexed preview identity, then apply strict definition/environment boundaries.
    // Only metadata is selected; JSON envelopes remain entirely in Postgres.
    const scope = () => service.from("analytics_delivery_outbox")
      .select("event_id,batch_id,accepted_at", { count: "exact" }).eq("environment", report.environment!)
      .eq("envelope->properties->>preview_id", previewId).eq("envelope->>scope_key", "preview_sprint")
      .eq("envelope->>event_version", "preview-sprint-v1")
      .gte("accepted_at", report.windowStart).lt("accepted_at", report.windowEnd);
    const response = await scope().order("accepted_at", { ascending: false }).order("event_id").limit(LIMIT).abortSignal(timeout());
    if (response.error || response.count === null) throw new Error("preview_delivery_unavailable");
    const rows = z.array(outboxSchema).max(LIMIT).parse(response.data ?? []);
    if (new Set(rows.map(row => row.event_id)).size !== rows.length || response.count < rows.length) throw new Error("preview_delivery_scope_invalid");
    const batchIds = [...new Set(rows.flatMap(row => row.batch_id ? [row.batch_id] : []))];
    const batches = new Map<string, z.infer<typeof batchSchema>>();
    for (let offset = 0; offset < batchIds.length; offset += 100) {
      const ids = batchIds.slice(offset, offset + 100);
      // A shared batch may contain other previews. Never use its global event_count.
      const batchResult = await service.from("analytics_delivery_batches").select("id,state,acknowledged_at")
        .eq("environment", report.environment!).in("id", ids).abortSignal(timeout());
      if (batchResult.error) throw new Error("preview_delivery_unavailable");
      for (const batch of z.array(batchSchema).max(100).parse(batchResult.data ?? [])) {
        if (!ids.includes(batch.id) || batches.has(batch.id)) throw new Error("preview_delivery_scope_invalid");
        batches.set(batch.id, batch);
      }
    }
    if (batches.size !== batchIds.length) throw new Error("preview_delivery_registry_incomplete");
    const eventCountsByState = emptyCounts();
    let acknowledgedAtWatermark: string | null = null, oldestPending: string | null = null, acceptedAtWatermark: string | null = null;
    for (const row of rows) {
      const batch = row.batch_id ? batches.get(row.batch_id)! : null;
      const state: DeliveryState = batch?.state ?? "queued";
      eventCountsByState[state]++;
      if (!acceptedAtWatermark || Date.parse(row.accepted_at) > Date.parse(acceptedAtWatermark)) acceptedAtWatermark = row.accepted_at;
      if (state === "acknowledged" && batch?.acknowledged_at && (!acknowledgedAtWatermark || Date.parse(batch.acknowledged_at) > Date.parse(acknowledgedAtWatermark))) acknowledgedAtWatermark = batch.acknowledged_at;
      if (!["acknowledged", "quarantined", "dead_letter"].includes(state) && (!oldestPending || Date.parse(row.accepted_at) < Date.parse(oldestPending))) oldestPending = row.accepted_at;
    }
    return { ...report.delivery, status: "available", reason: null, truncated: response.count > rows.length,
      acceptedEventsTotal: response.count, sampledEvents: rows.length, eventCountsByState, acceptedAtWatermark, acknowledgedAtWatermark,
      oldestPendingAgeSeconds: oldestPending ? Math.max(0, Math.floor((now.getTime() - Date.parse(oldestPending)) / 1000)) : null };
  } catch { return { ...report.delivery, reason: "preview_delivery_unavailable" }; }
}

/** Every invocation, including a direct helper call, authorizes Admin before privileged reads. */
export async function loadPreviewFunnelReport(input: { previewId?: string; windowStart?: string; windowEnd?: string } = {}): Promise<PreviewFunnelReport> {
  const { client } = await previewAdmin();
  const now = new Date();
  const windowEnd = input.windowEnd ?? now.toISOString();
  const windowStart = input.windowStart ?? new Date(Date.parse(windowEnd) - 90 * DAY).toISOString();
  z.string().datetime({ offset: true }).parse(windowStart);
  z.string().datetime({ offset: true }).parse(windowEnd);
  const span = Date.parse(windowEnd) - Date.parse(windowStart);
  if (span <= 0 || span > 90 * DAY || Date.parse(windowEnd) > now.getTime()) throw new Error("preview_report_window_invalid");
  const report = emptyReport(now, windowStart, windowEnd, getAnalyticsRuntimeEnvironment());
  try {
    const discovered = await readOptions(client as unknown as SupabaseClient, input.previewId);
    report.previews = discovered.options; report.previewsTruncated = discovered.truncated;
  } catch {
    report.selectionStatus = "unavailable";
    report.activity.reason = report.delivery.reason = "preview_options_unavailable";
    return report;
  }
  const eligible = report.previews.filter(row => row.access === "public" || row.access === "private");
  report.selectedPreview = input.previewId ? report.previews.find(row => row.id === input.previewId) ?? null
    : eligible.find(row => row.label.trim().toLowerCase() === "keith rivers") ?? eligible[0] ?? null;
  if (!report.selectedPreview) {
    report.selectionStatus = input.previewId ? "invalid" : report.previews.some(row => row.access === "unavailable") ? "unavailable" : "empty";
    return report;
  }
  if (report.selectedPreview.access === "unavailable") {
    report.selectionStatus = "unavailable"; report.activity.reason = report.delivery.reason = "preview_assignment_unavailable"; return report;
  }
  if (report.selectedPreview.access === "unshared") {
    report.selectionStatus = "unshared"; report.activity.reason = report.delivery.reason = "preview_not_shared"; return report;
  }
  report.selectionStatus = "ready";
  if (!report.environment) { report.activity.reason = report.delivery.reason = "analytics_pipeline_disabled"; return report; }
  [report.activity, report.delivery] = await Promise.all([readActivity(report.selectedPreview.id, report), readDelivery(report.selectedPreview.id, report, now)]);
  return report;
}
