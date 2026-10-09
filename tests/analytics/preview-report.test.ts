// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { queryPreviewSprintCounts } from "@/lib/analytics/preview-report";
import { bltzPreviewSprintCounts, bltzPreviewSprintProductionCounts } from "@/lib/analytics/delivery/tinybird-definitions";
import type { AnalyticsDeliveryConfiguration } from "@/lib/analytics/delivery/config";

const id = "10000000-0000-4000-8000-000000000001";
const start = "2026-10-05T00:00:00Z", end = "2026-10-06T00:00:00Z";
const config = { environment: "development", tinybirdUrl: "https://api.tinybird.co", tinybirdQueryToken: "synthetic-read" } as AnalyticsDeliveryConfiguration;
const row = { preview_id: id, event_kind: "photo_open", media_id: "photo-1", progress: 0, event_count: 2, tab_session_count: 1, event_watermark: end };

describe("private preview sprint reporting", () => {
  it("deduplicates before counts and fences preview activity out of audience metrics in both environments", () => {
    const sql = bltzPreviewSprintCounts.options.nodes.map(n => n.sql).join("\n");
    expect(sql.indexOf("GROUP BY environment, event_id")).toBeLessThan(sql.indexOf("AS event_count"));
    for (const filter of ["payload_revisions = 1", "preview-sprint-v1", "preview_sprint", "envelope.10 = 0", "envelope.12 = 'preview'", "envelope.17 != 'internal'", "envelope.13 = 'server_workflow'", "'booking_confirmed', 'walkthrough_completed'"]) expect(sql).toContain(filter);
    const production = bltzPreviewSprintProductionCounts.options.nodes.map(n => n.sql).join("\n");
    expect(production).toContain("FROM bltz_events_production_v1");
    expect(production).not.toContain("bltz_events_development_v1");
    expect(sql).not.toMatch(/email|phone|feature_request|referral_token/);
  });
  it("pins the environment pipe and keeps tokens in headers; counts are explicitly tab sessions", async () => {
    const fetcher = vi.fn(async () => Response.json({ data: [row] }));
    const result = await queryPreviewSprintCounts(id, start, end, { config, fetcher });
    expect(result).toMatchObject({ rows: [row], truncated: false, sessionMeasure: "tab_sessions_not_people" });
    const [url, options] = fetcher.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.pathname).toBe("/v0/pipes/bltz_preview_sprint_counts_v1.json");
    expect(url.searchParams.get("window_start")).toBe("2026-10-05 00:00:00.000");
    expect(url.searchParams.get("window_end")).toBe("2026-10-06 00:00:00.000");
    expect(url.href).not.toContain("synthetic-read");
    expect(options.headers).toEqual({ Authorization: "Bearer synthetic-read" });
    expect(options.redirect).toBe("error");
    await queryPreviewSprintCounts(id, start, end, { config: { ...config, environment: "production" }, fetcher });
    expect((fetcher.mock.calls[1] as unknown as [URL])[0].pathname).toBe("/v0/pipes/bltz_preview_sprint_production_counts_v1.json");
  });
  it("normalizes timezone offsets without losing fractional window boundaries", async () => {
    const fetcher = vi.fn(async () => Response.json({ data: [] }));
    await queryPreviewSprintCounts(id, "2026-10-04T17:00:00.123-07:00", "2026-10-05T17:00:00.456-07:00", { config, fetcher });
    const [url] = fetcher.mock.calls[0] as unknown as [URL];
    expect(url.searchParams.get("window_start")).toBe("2026-10-05 00:00:00.123");
    expect(url.searchParams.get("window_end")).toBe("2026-10-06 00:00:00.456");
  });
  it("rejects invalid identity, unbounded windows and environment mismatch before a request", async () => {
    const fetcher = vi.fn();
    await expect(queryPreviewSprintCounts("not-a-uuid", start, end, { config, fetcher })).rejects.toThrow();
    await expect(queryPreviewSprintCounts(id, end, start, { config, fetcher })).rejects.toThrow("window_invalid");
    await expect(queryPreviewSprintCounts(id, start, "2027-10-06T00:00:00Z", { config, fetcher })).rejects.toThrow("window_invalid");
    await expect(queryPreviewSprintCounts(id, start, end, { config, fetcher, expectedEnvironment: "production" })).rejects.toThrow("environment_mismatch");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([
    { data: [{ ...row, preview_id: "10000000-0000-4000-8000-000000000002" }] },
    { data: [{ ...row, tab_session_count: 3 }] }, { data: [row, row] }, { data: [{ ...row, email: "private@example.invalid" }] },
    { data: [{ ...row, media_id: "https://private.example/media" }] },
  ])("rejects cross-preview, inconsistent, duplicate or private provider rows", async ({ data }) => {
    await expect(queryPreviewSprintCounts(id, start, end, { config, fetcher: async () => Response.json({ data }) })).rejects.toThrow();
  });
});
