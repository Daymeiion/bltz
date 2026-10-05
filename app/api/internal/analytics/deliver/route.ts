import { NextResponse } from "next/server";
import { getAnalyticsDeliveryConfiguration } from "@/lib/analytics/delivery/config";
import { analyticsDeliveryJobSchema } from "@/lib/analytics/delivery/contracts";
import { verifyAnalyticsWorkerSignature } from "@/lib/analytics/delivery/authentication";
import { AnalyticsBodyLimitError, readBoundedBody } from "@/lib/analytics/delivery/http";
import { deliverAnalyticsJob } from "@/lib/analytics/delivery/pipeline";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const config = getAnalyticsDeliveryConfiguration();
    if (!config) return NextResponse.json({ error: "analytics_pipeline_disabled" }, { status: 404 });
    let rawBody: string;
    try { rawBody = await readBoundedBody(request, 4096); }
    catch (error) {
      return NextResponse.json({ error: "invalid_job_body" }, { status: error instanceof AnalyticsBodyLimitError ? 413 : 400 });
    }
    // Exact raw bytes and the configured destination are checked before parsing or any registry access.
    if (!await verifyAnalyticsWorkerSignature(config, request, rawBody)) return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
    let value: unknown;
    try { value = JSON.parse(rawBody); } catch { return NextResponse.json({ error: "invalid_job" }, { status: 400 }); }
    const parsed = analyticsDeliveryJobSchema.safeParse(value);
    if (!parsed.success || parsed.data.environment !== config.environment) return NextResponse.json({ error: "invalid_job" }, { status: 400 });
    const result = await deliverAnalyticsJob(config, parsed.data);
    return NextResponse.json(result, { status: result.state === "retry" || result.state === "not_acquired" ? 503 : 200 });
  } catch { return NextResponse.json({ error: "analytics_delivery_unavailable" }, { status: 503 }); }
}
