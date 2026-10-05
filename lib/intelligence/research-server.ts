import "server-only";
import { z } from "zod";
import { authorizeIntelligenceLab } from "./lab-server";
import { createServiceClient } from "@/lib/supabase/service";
import { cooldownAt, trialWindowAt, type ResearchViewData } from "./research";

/** Read the shared request ledger; visiting this view never calls Sportradar. */
export async function loadIntelligenceResearch(): Promise<ResearchViewData> {
  await authorizeIntelligenceLab();
  const checkedAt = new Date().toISOString();
  const trial = trialWindowAt(checkedAt);
  try {
    const db = createServiceClient();
    const result = await db.from("provider_request_logs").select("requested_at")
      .eq("provider", "sportradar").eq("cache_hit", false).eq("response_status", 429)
      .order("requested_at", { ascending: false }).limit(1).maybeSingle();
    if (result.error) throw new Error("ledger_unavailable");
    const row = z.object({ requested_at: z.iso.datetime({ offset: true }) }).nullable().parse(result.data);
    return { checkedAt, trial, cooldown: cooldownAt(row?.requested_at ?? null, checkedAt) };
  } catch { return { checkedAt, trial, cooldown: { state: "unavailable", until: null, lastRateLimitAt: null } }; }
}
