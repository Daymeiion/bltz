import "server-only";

import type { BetaIntelligenceReadModel } from "./contracts";
import { requireRole } from "@/lib/rbac";
import { createServiceClient } from "@/lib/supabase/service";

const activityKeys = [
  "lockerViews",
  "filmRoomOpens",
  "photosOpens",
  "mediaViews",
  "profileEdits",
  "careerCorrections",
  "mediaUploads",
  "shares",
  "socialLinkClicks",
] as const;

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
  if (
    payload.source !== "live"
    || !Array.isArray(payload.athletes)
    || !payload.summary
    || !Array.isArray(payload.recentFeedback)
    || payload.summary.participantDenominator !== payload.athletes.length
  ) {
    throw new Error("beta_dashboard_query_invalid_payload");
  }

  const summaryCounts = {
    athletesInvited: payload.athletes.filter((athlete) => athlete.invitedAt !== null).length,
    athletesJoined: payload.athletes.filter((athlete) => athlete.joinedAt !== null).length,
    lockersClaimed: payload.athletes.filter((athlete) => athlete.lockerClaimedAt !== null).length,
    activeAthletes: payload.athletes.filter((athlete) => athlete.status === "active").length,
    feedbackCompleted: payload.athletes.filter((athlete) => athlete.feedback !== null).length,
    caseStudyCandidates: payload.athletes.filter((athlete) => athlete.caseStudyCandidate).length,
  };
  if (Object.entries(summaryCounts).some(
    ([key, count]) => payload.summary[key as keyof typeof summaryCounts] !== count,
  )) {
    throw new Error("beta_dashboard_query_reconciliation_failed");
  }

  for (const key of activityKeys) {
    const metric = payload.summary.actionPercentages?.[key];
    const reconciledNumerator = payload.athletes.filter(
      (athlete) => Number.isFinite(athlete.activity?.[key]) && athlete.activity[key] > 0,
    ).length;
    if (
      !metric
      || metric.denominator !== payload.athletes.length
      || metric.numerator !== reconciledNumerator
    ) {
      throw new Error("beta_dashboard_query_reconciliation_failed");
    }
  }

  const athleteIds = new Set(payload.athletes.map((athlete) => athlete.id));
  if (payload.recentFeedback.some((feedback) => !athleteIds.has(feedback.athleteId))) {
    throw new Error("beta_dashboard_query_reconciliation_failed");
  }
  return payload;
}
