/**
 * Verified application-facing database contracts.
 *
 * These are intentionally limited to tables inspected through the configured
 * Supabase OpenAPI schema on 2026-07-15. They are not a substitute for a full
 * `supabase gen types` snapshot.
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
    };
  };
}

