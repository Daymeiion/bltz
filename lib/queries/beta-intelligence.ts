import { requireInternalAdmin } from "@/lib/rbac";
import { createServiceClient } from "@/lib/supabase/service";
import type {
  AnalyticsEvent,
  AthleteBaselineSnapshot,
  AthleteFeedback,
  AthleteInsight,
  BetaParticipant,
  BetaParticipantStatus,
} from "@/types/database";

export interface BetaParticipantFilters {
  status?: BetaParticipantStatus;
  cohort?: string;
  caseStudyCandidate?: boolean;
  limit?: number;
}

/** Admin-only participant list contract for the future Beta Intelligence UI. */
export async function listBetaParticipants(filters: BetaParticipantFilters = {}) {
  await requireInternalAdmin();
  const supabase = createServiceClient();
  let query = supabase
    .from("beta_participants")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(filters.limit ?? 100, 1), 500));

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.cohort) query = query.eq("cohort", filters.cohort);
  if (filters.caseStudyCandidate !== undefined) {
    query = query.eq("case_study_candidate", filters.caseStudyCandidate);
  }

  const { data, error } = await query;
  if (error) throw new Error(`beta_participants_query_failed:${error.message}`);
  return (data ?? []) as BetaParticipant[];
}

export interface AthleteBetaIntelligenceRecord {
  participant: BetaParticipant | null;
  feedback: AthleteFeedback[];
  insights: AthleteInsight[];
  baselines: AthleteBaselineSnapshot[];
  recentEvents: AnalyticsEvent[];
}

/** Admin-only drill-down; private notes and raw event properties never cross public routes. */
export async function getAthleteBetaIntelligence(
  athleteId: string,
): Promise<AthleteBetaIntelligenceRecord> {
  await requireInternalAdmin();
  const supabase = createServiceClient();

  const [participant, feedback, insights, baselines, events] = await Promise.all([
    supabase.from("beta_participants").select("*").eq("athlete_id", athleteId).maybeSingle(),
    supabase.from("athlete_feedback").select("*").eq("athlete_id", athleteId).order("interview_date", { ascending: false }),
    supabase.from("athlete_insights").select("*").eq("athlete_id", athleteId).order("created_at", { ascending: false }),
    supabase.from("athlete_baseline_snapshots").select("*").eq("athlete_id", athleteId).order("created_at", { ascending: false }),
    supabase.from("analytics_events").select("*").eq("athlete_id", athleteId).order("created_at", { ascending: false }).limit(500),
  ]);

  const firstError = [participant.error, feedback.error, insights.error, baselines.error, events.error]
    .find(Boolean);
  if (firstError) throw new Error(`athlete_beta_query_failed:${firstError.message}`);

  return {
    participant: (participant.data as BetaParticipant | null) ?? null,
    feedback: (feedback.data ?? []) as AthleteFeedback[],
    insights: (insights.data ?? []) as AthleteInsight[],
    baselines: (baselines.data ?? []) as AthleteBaselineSnapshot[],
    recentEvents: (events.data ?? []) as AnalyticsEvent[],
  };
}
