// @vitest-environment node
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ admin: vi.fn(), service: vi.fn(), environment: vi.fn(), counts: vi.fn(), viewer: vi.fn() }));
vi.mock("@/lib/preview-lockers/server", () => ({ previewAdmin: mocks.admin }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: mocks.service }));
vi.mock("@/lib/analytics/bltz-event", () => ({ getAnalyticsRuntimeEnvironment: mocks.environment }));
vi.mock("@/lib/analytics/preview-report", () => ({ queryPreviewSprintCounts: mocks.counts }));
import { loadPreviewFunnelReport } from "@/lib/analytics/preview-funnel";

const ids = Array.from({ length: 5 }, (_, index) => `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`);
const [keith, privateId, draft, testId, future] = ids;
const batchId = "20000000-0000-4000-8000-000000000001";
const now = "2026-10-11T12:00:00.000Z";
type Result = { data: unknown; count?: number | null; error: unknown };
let data: Record<string, Result>, calls: { table: string; method: string; args: unknown[] }[];
function client() {
  return { rpc(name: string, args: { p_preview_locker_id: string }) {
    calls.push({ table: "$rpc", method: name, args: [args] });
    return { abortSignal: () => mocks.viewer(args.p_preview_locker_id) };
  }, from(table: string) {
    if (table === "preview_locker_viewer_grants") throw new Error("permission denied for table preview_locker_viewer_grants");
    calls.push({ table, method: "from", args: [] });
    const builder: Record<string, unknown> = {};
    let inFilter: { field: string; values: unknown[] } | null = null;
    for (const method of ["select", "eq", "in", "gt", "gte", "lt", "lte", "order", "limit", "abortSignal"]) {
      builder[method] = (...args: unknown[]) => { calls.push({ table, method, args }); if (method === "in") inFilter = { field: args[0] as string, values: args[1] as unknown[] }; return builder; };
    }
    builder.then = (resolve: (result: Result) => unknown, reject: (error: unknown) => unknown) => {
      const result = data[table];
      const filtered = inFilter && Array.isArray(result?.data) ? { ...result, data: result.data.filter(row => inFilter!.values.includes(row[inFilter!.field])) } : result;
      return Promise.resolve(filtered).then(resolve, reject);
    };
    return builder;
  } };
}
const countRow = (kind: string, count: number, media = "", sessions = 1) => ({ preview_id: keith,
  event_kind: kind, media_id: media, progress: 0, event_count: count, tab_session_count: sessions, event_watermark: "2026-10-11 11:30:00.123" });
const outbox = (index: number, batch: string | null = batchId, at = "2026-10-11T11:00:00Z") => ({
  event_id: `30000000-0000-4000-8000-${String(index).padStart(12, "0")}`, batch_id: batch, accepted_at: at,
  envelope: { properties: { email: "never-export@example.invalid" } }, payload_hash: "must-not-export", message_id: "private-message" });

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(now); vi.clearAllMocks(); calls = [];
  data = {
    preview_lockers: { data: ids.map((id, index) => ({ id, slug: `preview-${index}`, full_name: ["Keith Rivers", "Current private", "Draft player", "Test player", "Future public"][index] })), count: 5, error: null },
    preview_locker_short_links: { data: [{ preview_id: keith, public_access_enabled: true }, { preview_id: testId, public_access_enabled: true }, { preview_id: future, public_access_enabled: true }], error: null },
    preview_conversion_campaigns: { data: [{ preview_id: testId, is_test: true }], error: null },
    analytics_delivery_outbox: { data: [outbox(1), outbox(2), outbox(3, null, "2026-10-11T10:00:00Z")], count: 3, error: null },
    analytics_delivery_batches: { data: [{ id: batchId, state: "acknowledged", acknowledged_at: "2026-10-11T11:10:00Z", event_count: 999, message_id: "private" }], error: null },
  };
  mocks.admin.mockResolvedValue({ client: client() }); mocks.service.mockImplementation(client);
  mocks.viewer.mockImplementation(async id => ({ data: id === privateId, error: null }));
  mocks.environment.mockReturnValue("production");
  mocks.counts.mockResolvedValue({ rows: [countRow("locker_view", 2)], truncated: false });
});
afterEach(() => vi.useRealTimers());

describe("authorized preview Admin funnel", () => {
  it("requires Admin authorization on direct helper calls before service, registry or Tinybird access", async () => {
    mocks.admin.mockRejectedValue(new Error("forbidden"));
    await expect(loadPreviewFunnelReport({ previewId: keith })).rejects.toThrow("forbidden");
    expect(calls).toEqual([]); expect(mocks.service).not.toHaveBeenCalled(); expect(mocks.counts).not.toHaveBeenCalled();
  });

  it("discovers future public lockers and assigned private invitations without accessing the revoked grant table", async () => {
    const report = await loadPreviewFunnelReport();
    expect(report.selectedPreview?.id).toBe(keith);
    expect(report.previews.map(row => [row.id, row.access])).toEqual([[keith, "public"], [privateId, "private"], [draft, "unshared"], [future, "public"]]);
    expect(report.selectionStatus).toBe("ready");
    expect(calls.some(call => call.table === "preview_locker_viewer_grants")).toBe(false);
    expect(calls.filter(call => call.table === "$rpc").map(call => call.args)).toEqual([[{ p_preview_locker_id: privateId }], [{ p_preview_locker_id: draft }]]);
    expect(report.windowEnd).toBe(now); expect(Date.parse(report.windowEnd) - Date.parse(report.windowStart)).toBe(90 * 86400000);
    expect(mocks.counts).toHaveBeenCalledWith(keith, report.windowStart, now, { expectedEnvironment: "production" });
  });

  it.each([draft, testId, "not-a-preview"]) ("does not query privileged activity for an unpublished, test or unknown selection %s", async previewId => {
    const report = await loadPreviewFunnelReport({ previewId });
    expect(report.selectionStatus).toBe(previewId === draft ? "unshared" : "invalid");
    expect(report.activity.status).toBe("unavailable"); expect(report.delivery.acceptedEventsTotal).toBeNull();
    expect(mocks.service).not.toHaveBeenCalled(); expect(mocks.counts).not.toHaveBeenCalled();
  });

  it("preserves public reporting when a private assignment check fails and marks that option unavailable", async () => {
    mocks.viewer.mockResolvedValue({ data: null, error: new Error("permission error with private detail") });
    const report = await loadPreviewFunnelReport();
    expect(report.selectionStatus).toBe("ready"); expect(report.selectedPreview?.id).toBe(keith);
    expect(report.previews.find(row => row.id === privateId)?.access).toBe("unavailable");
    mocks.service.mockClear(); mocks.counts.mockClear();
    const selected = await loadPreviewFunnelReport({ previewId: privateId });
    expect(selected.selectionStatus).toBe("unavailable"); expect(selected.activity.reason).toBe("preview_assignment_unavailable");
    expect(mocks.service).not.toHaveBeenCalled(); expect(mocks.counts).not.toHaveBeenCalled();
    expect(JSON.stringify(selected)).not.toContain("private detail");
  });

  it("caps private checks at 100 while retaining public lockers and checking the explicitly selected private preview first", async () => {
    const more = Array.from({ length: 105 }, (_, index) => ({ id: `40000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`, full_name: `Private ${index}`, slug: `private-${index}` }));
    data.preview_lockers = { data: [data.preview_lockers.data instanceof Array ? data.preview_lockers.data[0] : null, ...more], count: 106, error: null };
    data.preview_locker_short_links.data = [{ preview_id: keith, public_access_enabled: true }];
    data.preview_conversion_campaigns.data = [];
    mocks.viewer.mockResolvedValue({ data: true, error: null });
    const report = await loadPreviewFunnelReport({ previewId: more[104].id });
    expect(mocks.viewer).toHaveBeenCalledTimes(100); expect(mocks.viewer.mock.calls[0][0]).toBe(more[104].id);
    expect(report.selectionStatus).toBe("ready"); expect(report.selectedPreview?.access).toBe("private");
    expect(report.previews.filter(row => row.access === "unavailable")).toHaveLength(5);
    expect(report.previews[0]).toMatchObject({ id: keith, access: "public" });
  });

  it("stops private discovery after the five-second budget and still renders public Keith", async () => {
    mocks.viewer.mockImplementation(async () => {
      vi.setSystemTime(Date.now() + 5_001);
      return { data: true, error: null };
    });
    const report = await loadPreviewFunnelReport();
    expect(mocks.viewer).toHaveBeenCalledTimes(1);
    expect(report.selectionStatus).toBe("ready"); expect(report.selectedPreview?.id).toBe(keith);
    expect(report.previews.find(row => row.id === privateId)?.access).toBe("unavailable");
    expect(report.previews.find(row => row.id === draft)?.access).toBe("unavailable");
    expect(report.activity.status).toBe("available");
  });

  it("does not silently choose a different player when option discovery is incomplete", async () => {
    data.preview_locker_short_links.error = new Error("token=private provider failure");
    const report = await loadPreviewFunnelReport({ previewId: keith });
    expect(report.selectionStatus).toBe("unavailable"); expect(report.activity.reason).toBe("preview_options_unavailable");
    expect(JSON.stringify(report)).not.toContain("token="); expect(mocks.service).not.toHaveBeenCalled();
  });

  it("distinguishes disabled analytics and provider errors from genuine zero activity", async () => {
    mocks.environment.mockReturnValue(null);
    const disabled = await loadPreviewFunnelReport();
    expect(disabled.activity).toMatchObject({ status: "unavailable", reason: "analytics_pipeline_disabled" });
    expect(disabled.delivery.acceptedEventsTotal).toBeNull(); expect(mocks.service).not.toHaveBeenCalled();
    mocks.environment.mockReturnValue("production"); mocks.counts.mockRejectedValue(new Error("sensitive upstream error"));
    const unavailable = await loadPreviewFunnelReport();
    expect(unavailable.activity.reason).toBe("preview_activity_unavailable"); expect(unavailable.delivery.status).toBe("available");
    mocks.counts.mockResolvedValue({ rows: [], truncated: false });
    data.analytics_delivery_outbox = { data: [], count: 0, error: null };
    const empty = await loadPreviewFunnelReport();
    expect(empty.activity.status).toBe("available"); expect(empty.activity.metrics).toEqual([]);
    expect(empty.delivery).toMatchObject({ status: "available", acceptedEventsTotal: 0, sampledEvents: 0 });
  });

  it("does not inflate sessions across media/progress groups and preserves Tinybird truncation", async () => {
    mocks.counts.mockResolvedValue({ rows: [countRow("photo_open", 2, "photo-a"), countRow("photo_open", 3, "photo-b"), countRow("locker_view", 4)], truncated: true });
    const report = await loadPreviewFunnelReport();
    expect(report.activity).toMatchObject({ truncated: true, eventWatermark: "2026-10-11T11:30:00.123Z" });
    expect(report.activity.metrics).toEqual([{ eventKind: "locker_view", eventCount: 4, tabSessionCount: 1 }, { eventKind: "photo_open", eventCount: 5, tabSessionCount: null }]);
  });

  it("counts only selected preview events even when delivery batches are shared, and exports no private metadata", async () => {
    const report = await loadPreviewFunnelReport();
    expect(report.delivery).toMatchObject({ acceptedEventsTotal: 3, sampledEvents: 3, truncated: false,
      eventCountsByState: { acknowledged: 2, queued: 1 }, acceptedAtWatermark: "2026-10-11T11:00:00Z",
      acknowledgedAtWatermark: "2026-10-11T11:10:00Z", oldestPendingAgeSeconds: 7200 });
    for (const value of ["999", "never-export", "must-not-export", "private-message", batchId]) expect(JSON.stringify(report)).not.toContain(value);
    for (const args of [["environment", "production"], ["envelope->properties->>preview_id", keith], ["envelope->>scope_key", "preview_sprint"], ["envelope->>event_version", "preview-sprint-v1"]]) {
      expect(calls.some(call => call.table === "analytics_delivery_outbox" && call.method === "eq" && JSON.stringify(call.args) === JSON.stringify(args))).toBe(true);
    }
    expect(calls.filter(call => call.table === "analytics_delivery_batches" && call.method === "select").map(call => call.args[0])).toEqual(["id,state,acknowledged_at"]);
  });

  it("uses exact total to report partial status counts even when Supabase caps rows at 1000", async () => {
    data.analytics_delivery_outbox = { data: Array.from({ length: 1000 }, (_, index) => outbox(index + 1)), count: 1200, error: null };
    data.preview_lockers.count = 1500;
    const report = await loadPreviewFunnelReport();
    expect(report.previewsTruncated).toBe(true);
    expect(report.delivery).toMatchObject({ truncated: true, acceptedEventsTotal: 1200, sampledEvents: 1000, eventCountsByState: { acknowledged: 1000 } });
    expect(report.delivery.basis).toBe("latest_1000_preview_outbox_events");
  });

  it("reports incomplete delivery registry as unavailable rather than claiming missing batches were delivered", async () => {
    data.analytics_delivery_batches.data = [];
    const report = await loadPreviewFunnelReport();
    expect(report.delivery).toMatchObject({ status: "unavailable", reason: "preview_delivery_unavailable", acceptedEventsTotal: null });
  });

  it("rejects oversized, reversed and future report windows before querying databases", async () => {
    for (const input of [ { windowStart: "2026-01-01T00:00:00Z", windowEnd: now },
      { windowStart: now, windowEnd: "2026-10-01T00:00:00Z" }, { windowEnd: "2026-10-12T12:00:00Z" } ]) {
      await expect(loadPreviewFunnelReport(input)).rejects.toThrow("preview_report_window_invalid");
    }
    expect(calls).toEqual([]); expect(mocks.service).not.toHaveBeenCalled(); expect(mocks.counts).not.toHaveBeenCalled();
  });
});
