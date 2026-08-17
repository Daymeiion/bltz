/**
 * Verified application-facing database contracts.
 *
 * These are intentionally limited to tables inspected through the configured
 * Supabase OpenAPI schema on 2026-07-15, plus migration-verified Phase One
 * analytics contracts on 2026-08-17. They are not a substitute for a full
 * `supabase gen types` snapshot; regenerate after the hardening migration is
 * deployed to an authenticated Supabase project.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

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

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          player_id?: string | null;
        };
        Update: Partial<Omit<Profile, "id" | "created_at" | "updated_at">>;
      };
      player_teammates: {
        Row: PlayerTeammate;
        Insert: Omit<PlayerTeammate, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<PlayerTeammate, "id" | "created_at" | "updated_at">>;
      };
      team_invites: {
        Row: TeamInvite;
        Insert: Omit<TeamInvite, "id" | "invite_code" | "created_at" | "updated_at">;
        Update: Partial<Omit<TeamInvite, "id" | "invite_code" | "created_at" | "updated_at">>;
      };
      player_follows: {
        Row: PlayerFollow;
        Insert: Omit<PlayerFollow, "id" | "created_at"> & { id?: string };
        Update: never;
      };
      player_awards: {
        Row: PlayerAward;
        Insert: Omit<PlayerAward, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<PlayerAward, "id" | "created_at" | "updated_at">>;
      };
      videos: {
        Row: Video;
        Insert: Omit<Video, "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Omit<Video, "id" | "created_at" | "updated_at">>;
      };
      views: {
        Row: VideoView;
        Insert: Omit<VideoView, "id" | "created_at"> & { id?: number };
        Update: Partial<Omit<VideoView, "id" | "created_at">>;
      };
      media: {
        Row: Media;
        Insert: Omit<Media, "id" | "created_at"> & { id?: string };
        Update: Partial<Omit<Media, "id" | "created_at">>;
      };
      landing_waitlist: {
        Row: LandingWaitlistLead;
        Insert: Omit<LandingWaitlistLead, "id" | "created_at" | "updated_at" | "status" | "source"> & {
          id?: string;
          source?: string;
          status?: WaitlistStatus;
        };
        Update: Partial<Omit<LandingWaitlistLead, "id" | "created_at" | "updated_at">>;
      };
      analytics_events: {
        Row: AnalyticsEvent;
        Insert: Pick<AnalyticsEvent, "client_event_id" | "event_name" | "source"> &
          Partial<Omit<AnalyticsEvent, "client_event_id" | "event_name" | "source">>;
        Update: never;
      };
      analytics_rate_limit_buckets: {
        Row: AnalyticsRateLimitBucket;
        Insert: AnalyticsRateLimitBucket;
        Update: Pick<AnalyticsRateLimitBucket, "request_count" | "expires_at">;
      };
      beta_participants: {
        Row: BetaParticipant;
        Insert: Pick<BetaParticipant, "athlete_id" | "cohort"> &
          Partial<Omit<BetaParticipant, "athlete_id" | "cohort">>;
        Update: Partial<Omit<BetaParticipant, "id" | "created_at" | "updated_at">>;
      };
      athlete_feedback: {
        Row: AthleteFeedback;
        Insert: Pick<AthleteFeedback, "athlete_id"> & Partial<Omit<AthleteFeedback, "athlete_id">>;
        Update: Partial<Omit<AthleteFeedback, "id" | "created_at" | "updated_at">>;
      };
      athlete_insights: {
        Row: AthleteInsight;
        Insert: Pick<AthleteInsight, "athlete_id" | "category" | "description" | "source"> &
          Partial<Omit<AthleteInsight, "athlete_id" | "category" | "description" | "source">>;
        Update: Partial<Omit<AthleteInsight, "id" | "created_at" | "updated_at">>;
      };
      athlete_baseline_snapshots: {
        Row: AthleteBaselineSnapshot;
        Insert: Pick<AthleteBaselineSnapshot, "athlete_id" | "snapshot"> &
          Partial<Omit<AthleteBaselineSnapshot, "athlete_id" | "snapshot">>;
        Update: never;
      };
    };
    Functions: {
      consume_analytics_rate_limit: {
        Args: { p_key_hash: string; p_limit: number; p_window_seconds?: number };
        Returns: boolean;
      };
      get_beta_intelligence_dashboard: {
        Args: {
          p_since?: string | null;
          p_cohort?: string | null;
          p_status?: string | null;
          p_athlete_id?: string | null;
        };
        Returns: Json;
      };
    };
  };
}

