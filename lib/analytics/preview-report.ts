import "server-only";
import { z } from "zod";
import { getAnalyticsDeliveryConfiguration, type AnalyticsDeliveryConfiguration } from "./delivery/config";
import { readBoundedBody } from "./delivery/http";
import type { AnalyticsRuntimeEnvironment } from "./bltz-event";

const countRow = z.object({
  preview_id: z.string().uuid(), event_kind: z.string().regex(/^[a-z][a-z0-9_]{0,79}$/),
  media_id: z.string().regex(/^[A-Za-z0-9._-]{0,128}$/), progress: z.number().int().refine(n => [0, 25, 50, 75].includes(n)),
  event_count: z.number().int().nonnegative().safe(), tab_session_count: z.number().int().nonnegative().safe(),
  event_watermark: z.string().max(40),
}).strict();

/** Server-only read. Callers must authorize Admin access before exposing a report. */
export async function queryPreviewSprintCounts(
  previewId: string, windowStart: string, windowEnd: string,
  dependencies: { config?: AnalyticsDeliveryConfiguration; fetcher?: typeof fetch; expectedEnvironment?: AnalyticsRuntimeEnvironment } = {},
) {
  z.string().uuid().parse(previewId);
  z.string().datetime({ offset: true }).parse(windowStart);
  z.string().datetime({ offset: true }).parse(windowEnd);
  const span = Date.parse(windowEnd) - Date.parse(windowStart);
  if (span <= 0 || span > 90 * 86_400_000) throw new Error("preview_report_window_invalid");
  const config = dependencies.config ?? getAnalyticsDeliveryConfiguration();
  if (!config) throw new Error("analytics_pipeline_disabled");
  if (dependencies.expectedEnvironment && config.environment !== dependencies.expectedEnvironment) throw new Error("preview_report_environment_mismatch");
  const pipe = config.environment === "production" ? "bltz_preview_sprint_production_counts_v1" : "bltz_preview_sprint_counts_v1";
  const url = new URL(`/v0/pipes/${pipe}.json`, config.tinybirdUrl);
  url.searchParams.set("preview_id", previewId);
  // Tinybird DateTime64 parameters require a UTC SQL timestamp. Preserve milliseconds
  // and normalize caller offsets before applying the half-open report window.
  url.searchParams.set("window_start", new Date(windowStart).toISOString().replace("T", " ").replace("Z", ""));
  url.searchParams.set("window_end", new Date(windowEnd).toISOString().replace("T", " ").replace("Z", ""));
  const response = await (dependencies.fetcher ?? fetch)(url, {
    headers: { Authorization: `Bearer ${config.tinybirdQueryToken}` },
    redirect: "error", cache: "no-store", signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("preview_report_unavailable");
  const rows = z.object({ data: z.array(countRow).max(1001) }).parse(JSON.parse(await readBoundedBody(response, 512 * 1024))).data;
  const seen = new Set<string>();
  for (const row of rows) {
    const key = JSON.stringify([row.event_kind, row.media_id, row.progress]);
    if (row.preview_id !== previewId || row.tab_session_count > row.event_count || seen.has(key)) throw new Error("preview_report_scope_invalid");
    seen.add(key);
  }
  return { environment: config.environment, previewId, windowStart, windowEnd,
    rows: rows.slice(0, 1000), truncated: rows.length > 1000, sessionMeasure: "tab_sessions_not_people" as const };
}
