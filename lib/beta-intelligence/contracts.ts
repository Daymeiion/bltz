import type {
  AthleteInsightSeverity,
  AthleteInsightStatus,
  BetaParticipantStatus,
  CaseStudyPermission,
} from "@/types/database";

export type { BetaParticipantStatus, CaseStudyPermission };
export type InsightSeverity = AthleteInsightSeverity;
export type InsightStatus = AthleteInsightStatus;

export interface BetaInsight {
  id: string;
  category: string;
  description: string;
  severity: InsightSeverity;
  status: InsightStatus;
}

export interface BetaFeedback {
  completedAt: string;
  lockerValueRating: number | null;
  careerAccuracyRating: number | null;
  mediaValueRating: number | null;
  wouldShare: boolean | null;
  willingnessToPay: boolean | null;
  paymentExpectation: string | null;
  digitalIntelligenceInterest: boolean | null;
  analyticsInterest: boolean | null;
  organizationInterest: boolean | null;
  biggestProblem: string | null;
  favoriteFeature: string | null;
  missingFeature: string | null;
}

export interface AthleteActivitySummary {
  lockerViews: number;
  filmRoomOpens: number;
  photosOpens: number;
  mediaViews: number;
  profileEdits: number;
  careerCorrections: number;
  mediaUploads: number;
  shares: number;
  socialLinkClicks: number;
  returned: boolean;
  lastActivityAt: string | null;
}

export interface BetaAthleteSummary {
  id: string;
  name: string;
  cohort: string;
  status: BetaParticipantStatus;
  invitedAt: string | null;
  joinedAt: string | null;
  lockerViewedAt: string | null;
  lockerClaimedAt: string | null;
  lockerEditedAt: string | null;
  lockerSharedAt: string | null;
  feedback: BetaFeedback | null;
  activity: AthleteActivitySummary;
  insights: BetaInsight[];
  caseStudyCandidate: boolean;
  caseStudyPermission: CaseStudyPermission;
  baselineCapturedAt: string | null;
  engagementLevel: "low" | "medium" | "high";
}

export interface BetaIntelligenceReadModel {
  source: "live" | "fixture";
  generatedAt: string;
  athletes: BetaAthleteSummary[];
}

export interface BetaDashboardFilters {
  cohort: string;
  participantStatus: "all" | BetaParticipantStatus;
  dateRange: "all" | "7d" | "30d" | "90d";
  insightCategory: string;
  insightSeverity: "all" | InsightSeverity;
  insightStatus: "all" | InsightStatus;
}
