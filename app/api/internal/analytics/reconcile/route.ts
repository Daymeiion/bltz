import { NextResponse } from "next/server";
import { z } from "zod";
import { getAnalyticsDeliveryConfiguration } from "@/lib/analytics/delivery/config";
import { verifyAnalyticsDispatchSecret } from "@/lib/analytics/delivery/authentication";
import { readBoundedBody } from "@/lib/analytics/delivery/http";
import { createAnalyticsDeliveryStore, readAnalyticsDeliveryOperations } from "@/lib/analytics/delivery/store";
import { reconcileAnalyticsBatch } from "@/lib/analytics/delivery/tinybird";

export const runtime = "nodejs";

/** Read-only diagnosis; a complete comparison never silently releases quarantine. */
export async function POST(request: Request) {
  try {
    const config = getAnalyticsDeliveryConfiguration();
    if (!config) return NextResponse.json({ error: "analytics_pipeline_disabled" }, { status: 404 });
    if (!verifyAnalyticsDispatchSecret(request, config.dispatchSecret)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    let value: unknown;
    try { value = JSON.parse(await readBoundedBody(request, 4096)); } catch { return NextResponse.json({ error: "invalid_request" }, { status: 400 }); }
    const parsed = z.object({ batch_id: z.string().uuid().optional() }).strict().safeParse(value);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    if (!parsed.data.batch_id) return NextResponse.json(await readAnalyticsDeliveryOperations(new Date(), config.environment));
    const batch = await createAnalyticsDeliveryStore().readBatch(parsed.data.batch_id, config.environment);
    if (!batch) return NextResponse.json({ error: "batch_not_found" }, { status: 404 });
    return NextResponse.json(await reconcileAnalyticsBatch(config, batch));
  } catch { return NextResponse.json({ error: "analytics_reconciliation_unavailable" }, { status: 503 }); }
}
