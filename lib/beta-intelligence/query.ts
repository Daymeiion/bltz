import "server-only";

import type { BetaIntelligenceReadModel } from "./contracts";
import { requireRole } from "@/lib/rbac";
import { createServiceClient } from "@/lib/supabase/service";

export interface BetaIntelligenceQueryFilters {
  since?: string | null;
  cohort?: string | null;
  status?: string | null;
  athleteId?: string | null;
}

/** Server-authorized boundary for the service-only aggregate RPC. */
export async function getBetaIntelligenceDashboard(
  filters: BetaIntelligenceQueryFilters = {},
): Promise<BetaIntelligenceReadModel> {
  await requireRole("admin");
  const { data, error } = await createServiceClient().rpc("get_beta_intelligence_dashboard", {
    p_since: filters.since ?? null,
    p_cohort: filters.cohort ?? null,
    p_status: filters.status ?? null,
    p_athlete_id: filters.athleteId ?? null,
  });
  if (error) throw new Error(`beta_dashboard_query_failed:${error.message}`);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("beta_dashboard_query_invalid_payload");
  }
  const payload = data as unknown as BetaIntelligenceReadModel;
  if (payload.source !== "live" || !Array.isArray(payload.athletes)) {
    throw new Error("beta_dashboard_query_invalid_payload");
  }
  return payload;
}
