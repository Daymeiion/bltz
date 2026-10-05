import { NextResponse } from "next/server";
import { getAnalyticsDeliveryConfiguration } from "@/lib/analytics/delivery/config";
import { verifyAnalyticsDispatchSecret, verifyAnalyticsCronSecret } from "@/lib/analytics/delivery/authentication";
import { dispatchAnalyticsDelivery, dispatchAnalyticsBacklog } from "@/lib/analytics/delivery/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

/** Explicit authenticated trigger; no post-response work or implicit scheduling. */
export async function POST(request: Request) {
  try {
    const config = getAnalyticsDeliveryConfiguration();
    if (!config) return NextResponse.json({ error: "analytics_pipeline_disabled" }, { status: 404 });
    if (!verifyAnalyticsDispatchSecret(request, config.dispatchSecret)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const result = await dispatchAnalyticsDelivery(config);
    return NextResponse.json(result, { status: result.state === "retry" ? 503 : 200, headers });
  } catch { return NextResponse.json({ error: "analytics_delivery_unavailable" }, { status: 503 }); }
}

/** Production-only GET contract for a reviewed Vercel cron. No schedule is created here. */
export async function GET(request: Request) {
  try {
    const config = getAnalyticsDeliveryConfiguration();
    if (!config || config.environment !== "production") return NextResponse.json({ error: "analytics_schedule_disabled" }, { status: 404, headers });
    if (!verifyAnalyticsCronSecret(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers });
    const result = await dispatchAnalyticsBacklog(config);
    return NextResponse.json(result, { status: result.stopped === "retry" ? 503 : 200, headers });
  } catch { return NextResponse.json({ error: "analytics_delivery_unavailable" }, { status: 503, headers }); }
}
