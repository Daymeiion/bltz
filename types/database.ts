/**
 * Application-facing database contracts.
 *
 * `database.generated.ts` is the authoritative Supabase CLI snapshot generated
 * from the approved staging public schema on 2026-08-18. This module re-exports
 * that schema contract and retains the narrower domain aliases used by existing
 * application code. Regenerate the snapshot after every deployed migration;
 * do not hand-edit the generated file.
 */
import type { Json as GeneratedJson } from "./database.generated";

export type {
  CompositeTypes,
  Database,
  Enums,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "./database.generated";

export type Json = GeneratedJson;

export const USER_ROLES = ["player", "fan", "admin", "publisher"] as const;
export type UserRole = (typeof USER_ROLES)[number];
export type InviteStatus = "pending" | "accepted" | "declined" | "expired";

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
  player_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PlayerAward {
  id: string;
  player_id: string;
  name: string;
  description: string;
  category: string;
  year: number;
  organization: string;
  image_url: string | null;
  source_url: string | null;
  significance: string;
  verified: boolean | null;
  ai_discovered: boolean | null;
  confidence_score: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Video {
  id: string;
  player_id: string | null;
  owner_user_id: string | null;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  playback_url: string | null;
  duration_seconds: number | null;
  visibility: string | null;
  tags: string[] | null;
  created_at: string | null;
  updated_at: string | null;
  meta: Json | null;
}

export interface VideoView {
  id: number;
  user_id: string | null;
  player_id: string | null;
  video_id: string | null;
  seconds_watched: number | null;
  created_at: string | null;
}

export type MediaProvenance =
  | "founder_archive"
  | "cal_archive"
  | "athlete_uploaded"
  | "fan_uploaded"
  | "scraped_candidate";

export type MediaKind = "photo" | "headshot" | "video" | "document";
export type MediaLicenseStatus = "pending" | "approved" | "rejected" | "needs_review";
export type MediaLicenseRequestStatus =
  | "not_started"
  | "queued"
  | "sent"
  | "responded"
  | "approved"
  | "denied"
  | "error";
export type MediaCompetitionLevel = "hs" | "cfb" | "pro";
export type MediaContentContext =
  | "game"
  | "practice"
  | "media_day"
  | "community"
  | "training"
  | "lifestyle"
  | "interview"
  | "off_field";
export type WaitlistPlayingLevel = "hs" | "cfb" | "pro" | "former";
export type WaitlistStatus = "new" | "contacted" | "invited" | "claimed" | "archived";
export type BetaParticipantStatus = "invited" | "active" | "completed" | "withdrawn";
export type CaseStudyPermission = "not_requested" | "pending" | "granted" | "declined" | "revoked";
export type AthleteInsightSeverity = "low" | "medium" | "high" | "critical";
export type AthleteInsightStatus = "open" | "monitoring" | "resolved" | "dismissed";
export type OrganizationStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "suspended"
  | "restricted"
  | "closed";
export type OrganizationMembershipRole =
  | "owner"
  | "organization_admin"
  | "media_manager"
  | "rights_manager"
  | "analyst"
  | "viewer";
export type OrganizationMembershipStatus = "active" | "suspended" | "removed";
export type PlatformRole =
  | "support_admin"
  | "organization_admin"
  | "identity_admin"
  | "rights_admin"
  | "trust_safety_admin"
  | "finance_admin"
  | "technical_admin"
  | "super_admin";
export type AuditRoleScope = "organization" | "platform" | "system";
export type AuditRiskLevel = "low" | "medium" | "high" | "critical";
export type SeasonStatus = "planned" | "active" | "completed" | "archived";
export type RosterStatus =
  | "active"
  | "inactive"
  | "practice_squad"
  | "injured"
  | "transferred"
  | "released"
  | "graduated"
  | "completed";
export type SportsEventStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "postponed"
  | "cancelled";

export interface Media {
  id: string;
  player_id: string;
  url: string;
  title: string | null;
  credits: string | null;
  width: number | null;
  height: number | null;
  display_order: number | null;
  provenance: MediaProvenance;
  kind: MediaKind;
  source_url: string | null;
  license_status: MediaLicenseStatus | null;
  license_kind: string | null;
  rights_holder: string | null;
  usage_terms: string | null;
  public_locker_approved: boolean | null;
  license_checked_at: string | null;
  license_checked_by: string | null;
  license_request_status: MediaLicenseRequestStatus;
  license_request_sent_at: string | null;
  license_request_recipient_email: string | null;
  license_request_recipient_name: string | null;
  license_request_last_error: string | null;
  license_requested_by: string | null;
  competition_level: MediaCompetitionLevel | null;
  content_context: MediaContentContext | null;
  created_at: string | null;
}

export interface PlayerTeammate {
  id: string;
  player_id: string;
  teammate_player_id: string;
  games_played_together: number | null;
  last_played_together: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlayerFollow {
  id: string;
  user_id: string;
  player_id: string;
  created_at: string;
}

export interface LandingWaitlistLead {
  id: string;
  email: string;
  full_name: string | null;
  sport: string | null;
  school: string | null;
  playing_level: WaitlistPlayingLevel | null;
  current_content_gap: string | null;
  newsletter_opt_in: boolean;
  source: string;
  status: WaitlistStatus;
  created_at: string;
  updated_at: string;
}

export interface TeamInvite {
  id: string;
  inviter_user_id: string;
  inviter_player_id: string | null;
  invitee_email: string;
  invitee_name: string | null;
  status: InviteStatus;
  invite_code: string;
  message: string | null;
  expires_at: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsEvent {
  id: string;
  client_event_id: string;
  event_name: string;
  user_id: string | null;
  athlete_id: string | null;
  session_id: string | null;
  source: string;
  page: string | null;
  properties: Json;
  occurred_at: string;
  created_at: string;
}

export interface AnalyticsRateLimitBucket {
  key_hash: string;
  bucket_start: string;
  request_count: number;
  expires_at: string;
}

export interface BetaParticipant {
  id: string;
  athlete_id: string;
  user_id: string | null;
  cohort: string;
  invite_source: string | null;
  invited_at: string | null;
  joined_at: string | null;
  locker_claimed_at: string | null;
  feedback_completed_at: string | null;
  case_study_candidate: boolean;
  case_study_permission: CaseStudyPermission;
  status: BetaParticipantStatus;
  internal_notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AthleteFeedback {
  id: string;
  athlete_id: string;
  participant_id: string | null;
  interview_date: string;
  interviewer_id: string | null;
  overall_rating: number | null;
  locker_value_rating: number | null;
  career_accuracy_rating: number | null;
  media_value_rating: number | null;
  would_share: boolean | null;
  willingness_to_pay: boolean | null;
  payment_expectation: string | null;
  preferred_audience: string | null;
  biggest_problem: string | null;
  favorite_feature: string | null;
  missing_feature: string | null;
  missing_career_content: string | null;
  missing_media: string | null;
  monetization_interest: boolean | null;
  analytics_interest: boolean | null;
  digital_intelligence_interest: boolean | null;
  testimonial_quote: string | null;
  raw_notes: string | null;
  follow_up_required: boolean;
  additional_responses: Json;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AthleteInsight {
  id: string;
  athlete_id: string;
  category: string;
  description: string;
  severity: AthleteInsightSeverity;
  source: string;
  status: AthleteInsightStatus;
  evidence: Json;
  created_by: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface AthleteBaselineSnapshot {
  id: string;
  athlete_id: string;
  participant_id: string | null;
  schema_version: number;
  snapshot: Json;
  captured_by: string | null;
  created_at: string;
}

export interface Organization {
  id: string;
  school_id: string | null;
  name: string;
  organization_type: string;
  status: OrganizationStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMembership {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationMembershipRole;
  status: OrganizationMembershipStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlatformRoleAssignment {
  id: string;
  user_id: string;
  role: PlatformRole;
  assigned_by: string | null;
  assigned_at: string;
  assignment_reason: string;
  revoked_by: string | null;
  revoked_at: string | null;
  revocation_reason: string | null;
}

export interface AuditLog {
  id: number;
  organization_id: string | null;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  actor_role: string | null;
  actor_role_scope: AuditRoleScope | null;
  reason: string | null;
  risk_level: AuditRiskLevel;
  correlation_id: string | null;
  previous_values: Json | null;
  new_values: Json | null;
  request_metadata: Json;
  created_at: string;
}

export type GtmContactType = "enterprise" | "athlete" | "multiplier" | "investor" | "unclassified";
export type GtmInvestorType =
  | "angel" | "athlete_angel" | "operator_angel" | "pre_seed_vc"
  | "seed_vc" | "sports_vc" | "consumer_vc" | "media_vc"
  | "strategic_corporate_vc" | "family_office";
export type GtmInvestorRelationshipStage =
  | "existing_relationship" | "introduction" | "discovery" | "product_shown"
  | "interested" | "milestone_follow_up" | "intro_offered" | "potential_check"
  | "diligence" | "passed" | "future_round";
export type GtmConversationOutcome =
  | "user_conversion" | "pilot_opportunity" | "capital" | "referral"
  | "strategic_insight" | "product_validation" | "distribution_opportunity"
  | "partnership" | "future_follow_up" | "no_fit";
export type GtmPriorityTier = "A" | "B" | "C" | "D";
export type GtmPipelineStage =
  | "identified" | "connected" | "engaged" | "discovery"
  | "demo_candidate" | "pilot_candidate" | "active_pilot" | "converted"
  | "nurture" | "not_now";

export interface GtmContact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string;
  linkedin_url: string | null;
  email: string | null;
  phone: string | null;
  organization_id: string | null;
  current_company: string | null;
  current_title: string | null;
  contact_type: GtmContactType;
  segment: string | null;
  sport: string | null;
  league_level: string | null;
  geography: string | null;
  relationship_strength: number | null;
  network_leverage: number | null;
  bltz_relevance: number | null;
  buying_authority: number | null;
  introduction_potential: number | null;
  timing_score: number | null;
  priority_score: number | null;
  priority_tier: GtmPriorityTier | null;
  priority_model: "enterprise_v1" | null;
  pipeline_stage: GtmPipelineStage;
  source: string | null;
  source_record_id: string | null;
  linkedin_connected_on: string | null;
  do_not_automate: boolean;
  is_priority: boolean;
  archived: boolean;
  last_interaction_at: string | null;
  next_action: string | null;
  next_action_at: string | null;
  investor_type: GtmInvestorType | null;
  investor_relationship_stage: GtmInvestorRelationshipStage | null;
  what_they_need_to_see: string | null;
  investor_thesis_feedback: string | null;
  historical_signal: string | null;
  future_trigger: string | null;
  prior_outcome: string | null;
  relationship_source: string | null;
  next_trigger: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GtmContactPlayer {
  id: string;
  contact_id: string;
  player_id: string;
  match_type: string;
  match_confidence: number;
  verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GtmInteraction {
  id: string;
  contact_id: string;
  organization_id: string | null;
  opportunity_id: string | null;
  interaction_type: string;
  direction: string;
  subject: string | null;
  summary: string | null;
  interaction_at: string;
  outcomes: GtmConversationOutcome[];
  next_trigger: string | null;
  follow_up_required: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GtmCustomerDiscovery {
  id: string;
  contact_id: string;
  interaction_id: string | null;
  organization_id: string | null;
  problem_discussed: string | null;
  current_solution: string | null;
  pain_level: number | null;
  primary_bltz_use_case: string | null;
  feature_requested: string | null;
  would_use: boolean | null;
  would_pilot: boolean | null;
  would_pay: boolean | null;
  expected_buyer: string | null;
  expected_budget_range: string | null;
  primary_objection: string | null;
  introduction_offered: boolean | null;
  introduction_target: string | null;
  additional_context: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GtmImportJob {
  id: string;
  import_type: string;
  filename: string;
  content_sha256: string;
  idempotency_key: string;
  status: string;
  field_mapping: Json;
  preview_summary: Json;
  rows_found: number;
  rows_created: number;
  rows_updated: number;
  rows_duplicated: number;
  rows_failed: number;
  potential_matches: number;
  error_summary: string | null;
  uploaded_by: string;
  approved_by: string | null;
  created_at: string;
  started_at: string | null;
  approved_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

export interface Season {
  id: string;
  organization_id: string;
  sport: string;
  season_code: string;
  starts_on: string;
  ends_on: string;
  status: SeasonStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamSeason {
  id: string;
  organization_id: string;
  team_id: string;
  season_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AthleteTeamSeason {
  id: string;
  organization_id: string;
  team_season_id: string;
  player_id: string;
  roster_status: RosterStatus;
  jersey_number: string | null;
  position: string | null;
  starts_on: string;
  ends_on: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AthleteSeasonStats {
  id: string;
  organization_id: string;
  athlete_team_season_id: string;
  source: string;
  season_phase: string;
  stats: Json;
  last_synced_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SportsEvent {
  id: string;
  steward_organization_id: string | null;
  sport: string;
  name: string;
  event_type: string;
  starts_at: string;
  ends_at: string | null;
  status: SportsEventStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SportsEventTeam {
  id: string;
  event_id: string;
  organization_id: string;
  team_id: string;
  team_season_id: string | null;
  participation_role: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SportsEventAthlete {
  id: string;
  event_id: string;
  organization_id: string;
  team_id: string | null;
  player_id: string;
  athlete_team_season_id: string | null;
  participation_role: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

