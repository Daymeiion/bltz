// Video placement migration verified by scripts/verify-preview-video-placement.mjs: videos remains Json; function signature and grants unchanged.
// story regenerated from disposable PostgreSQL information_schema by scripts/verify-preview-story.mjs.
// School display-name migration verified by scripts/verify-preview-school-display.mjs: schools remains Json; function signature and grants unchanged.
// combine_results regenerated from isolated PostgreSQL information_schema by scripts/verify-preview-combine.mjs.
// Preview table regenerated from isolated PostgreSQL information_schema by scripts/verify-preview-media.mjs; remaining declarations retain their Supabase CLI provenance.
// Scoped additive extract; released database.generated.ts remains unchanged.
// Short-link/inquiry fields regenerated from disposable PostgreSQL by verify-preview-access-window.mjs; hosted schema regeneration remains a release check.
import type { Json } from "./database.generated";
export type PreviewDatabase = { public: { Tables: { preview_lockers: {
        Row: {
          article_edits: Json
          athlete_quote: string | null
          athlete_quote_author: string | null
          awards: Json
          bio: string
          story: string
          career_stats: Json
          cfb_stats: Json
          combine_results: Json
          created_at: string
          created_by: string
          dob: string | null
          full_name: string
          games_played: number | null
          headshot_url: string | null
          bio_headshot_storage_path: string | null
          bio_headshot_url: string | null
          headshot_storage_path: string | null
          height_in: number | null
          hero_video_url: string | null
          high_school: string | null
          hometown: string | null
          id: string
          jersey: string | null
          level: string | null
          merchandise: Json
          pfr_stats: Json
          photo_room_banner_link: string | null
          photo_room_banner_storage_path: string | null
          photo_room_banner_url: string | null
          photos: Json
          position: string | null
          pro_teams: Json
          revision: number
          school: string | null
          schools: Json
          slug: string
          social: Json
          updated_at: string
          videos: Json
          weight_lbs: number | null
        }
        Insert: {
          article_edits?: Json
          athlete_quote?: string | null
          athlete_quote_author?: string | null
          awards?: Json
          bio?: string
          story?: string
          career_stats?: Json
          cfb_stats?: Json
          combine_results?: Json
          created_at?: string
          created_by?: string
          dob?: string | null
          full_name: string
          games_played?: number | null
          headshot_url?: string | null
          bio_headshot_storage_path?: string | null
          bio_headshot_url?: string | null
          headshot_storage_path?: string | null
          height_in?: number | null
          hero_video_url?: string | null
          high_school?: string | null
          hometown?: string | null
          id?: string
          jersey?: string | null
          level?: string | null
          merchandise?: Json
          pfr_stats?: Json
          photo_room_banner_link?: string | null
          photo_room_banner_storage_path?: string | null
          photo_room_banner_url?: string | null
          photos?: Json
          position?: string | null
          pro_teams?: Json
          revision?: number
          school?: string | null
          schools?: Json
          slug: string
          social?: Json
          updated_at?: string
          videos?: Json
          weight_lbs?: number | null
        }
        Update: {
          article_edits?: Json
          athlete_quote?: string | null
          athlete_quote_author?: string | null
          awards?: Json
          bio?: string
          story?: string
          career_stats?: Json
          cfb_stats?: Json
          combine_results?: Json
          created_at?: string
          created_by?: string
          dob?: string | null
          full_name?: string
          games_played?: number | null
          headshot_url?: string | null
          bio_headshot_storage_path?: string | null
          bio_headshot_url?: string | null
          headshot_storage_path?: string | null
          height_in?: number | null
          hero_video_url?: string | null
          high_school?: string | null
          hometown?: string | null
          id?: string
          jersey?: string | null
          level?: string | null
          merchandise?: Json
          pfr_stats?: Json
          photo_room_banner_link?: string | null
          photo_room_banner_storage_path?: string | null
          photo_room_banner_url?: string | null
          photos?: Json
          position?: string | null
          pro_teams?: Json
          revision?: number
          school?: string | null
          schools?: Json
          slug?: string
          social?: Json
          updated_at?: string
          videos?: Json
          weight_lbs?: number | null
        }
        Relationships: []
      }
      preview_locker_short_links: {
        Row: {
          access_expires_at: string | null
          access_extended_at: string | null
          access_started_at: string | null
          alias: string
          created_at: string
          created_by: string
          preview_id: string
          public_access_enabled: boolean
          updated_at: string
        }
        Insert: {
          access_expires_at?: string | null
          access_extended_at?: string | null
          access_started_at?: string | null
          alias: string
          created_at?: string
          created_by?: string
          preview_id: string
          public_access_enabled?: boolean
          updated_at?: string
        }
        Update: {
          access_expires_at?: string | null
          access_extended_at?: string | null
          access_started_at?: string | null
          alias?: string
          created_at?: string
          created_by?: string
          preview_id?: string
          public_access_enabled?: boolean
          updated_at?: string
        }
        Relationships: [{
          foreignKeyName: "preview_locker_short_links_preview_id_fkey"
          columns: ["preview_id"]
          isOneToOne: true
          referencedRelation: "preview_lockers"
          referencedColumns: ["id"]
        }]
      }
      preview_link_inquiries: {
        Row: {
          analytics_environment: string | null
          analytics_session_id: string | null
          consent_at: string
          created_at: string
          email: string
          feature_requests: string | null
          id: string
          preview_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewed_contact_id: string | null
        }
        Insert: {
          analytics_environment?: string | null
          analytics_session_id?: string | null
          consent_at?: string
          created_at?: string
          email: string
          feature_requests?: string | null
          id?: string
          preview_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_contact_id?: string | null
        }
        Update: {
          analytics_environment?: string | null
          analytics_session_id?: string | null
          consent_at?: string
          created_at?: string
          email?: string
          feature_requests?: string | null
          id?: string
          preview_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_contact_id?: string | null
        }
        Relationships: [{
          foreignKeyName: "preview_link_inquiries_preview_id_fkey"
          columns: ["preview_id"]
          isOneToOne: false
          referencedRelation: "preview_lockers"
          referencedColumns: ["id"]
        }, {
          foreignKeyName: "preview_link_inquiries_reviewed_contact_id_fkey"
          columns: ["reviewed_contact_id"]
          isOneToOne: false
          referencedRelation: "gtm_contacts"
          referencedColumns: ["id"]
        }]
      }
      preview_locker_viewer_grants: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          preview_locker_id: string
          updated_at: string
          viewer_user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          preview_locker_id: string
          updated_at?: string
          viewer_user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          preview_locker_id?: string
          updated_at?: string
          viewer_user_id?: string
        }
        Relationships: [{
          foreignKeyName: "preview_locker_viewer_grants_preview_locker_id_fkey"
          columns: ["preview_locker_id"]
          isOneToOne: true
          referencedRelation: "preview_lockers"
          referencedColumns: ["id"]
        }]
      }
      gtm_player_preview_lockers: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          completed_revision: number | null
          gsis_id: string
          linked_at: string
          linked_by: string
          preview_locker_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          completed_revision?: number | null
          gsis_id: string
          linked_at?: string
          linked_by: string
          preview_locker_id: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          completed_revision?: number | null
          gsis_id?: string
          linked_at?: string
          linked_by?: string
          preview_locker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gtm_player_preview_lockers_gsis_id_fkey"
            columns: ["gsis_id"]
            isOneToOne: true
            referencedRelation: "gtm_player_prospects"
            referencedColumns: ["gsis_id"]
          },
          {
            foreignKeyName: "gtm_player_preview_lockers_preview_locker_id_fkey"
            columns: ["preview_locker_id"]
            isOneToOne: true
            referencedRelation: "preview_lockers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      preview_public_link_status: { Args: { p_preview: string }; Returns: Json }
      start_preview_link_access: { Args: { p_preview: string; p_actor?: string | null }; Returns: Json }
      extend_preview_link_access: { Args: { p_preview: string; p_reason: string; p_request?: string }; Returns: Json }
      accept_preview_inquiry_email: { Args: { p_inquiry: string; p_contact: string; p_reason: string }; Returns: Json }
      admit_preview_discovery: { Args: { p_identity_hash: string }; Returns: string }
      finalize_preview_discovery: { Args: { p_request_id: string; p_succeeded: boolean }; Returns: boolean }
      assign_preview_locker_viewer: { Args: { p_email: string; p_preview_locker_id: string }; Returns: string }
      complete_gtm_player_preview: { Args: { p_preview_locker_id: string; p_revision: number }; Returns: string }
      open_or_create_gtm_player_preview: { Args: { p_gsis_id: string }; Returns: Json }
      preview_locker_has_viewer: { Args: { p_preview_locker_id: string }; Returns: boolean }
      revoke_preview_locker_viewer: { Args: { p_preview_locker_id: string }; Returns: boolean }
    }
    Views: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
};
