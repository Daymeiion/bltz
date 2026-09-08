// Generated from the disposable database by Supabase CLI 2.114.0.
// Scoped additive extract; released database.generated.ts remains unchanged.
import type { Json } from "./database.generated";
export type PreviewDatabase = { public: { Tables: { preview_lockers: {
        Row: {
          athlete_quote: string | null
          athlete_quote_author: string | null
          awards: Json
          bio: string
          created_at: string
          created_by: string
          full_name: string
          games_played: number | null
          headshot_url: string | null
          height_in: number | null
          hero_video_url: string | null
          hometown: string | null
          id: string
          jersey: string | null
          level: string | null
          photos: Json
          position: string | null
          pro_teams: Json
          revision: number
          school: string | null
          schools: Json
          slug: string
          updated_at: string
          videos: Json
          weight_lbs: number | null
        }
        Insert: {
          athlete_quote?: string | null
          athlete_quote_author?: string | null
          awards?: Json
          bio?: string
          created_at?: string
          created_by?: string
          full_name: string
          games_played?: number | null
          headshot_url?: string | null
          height_in?: number | null
          hero_video_url?: string | null
          hometown?: string | null
          id?: string
          jersey?: string | null
          level?: string | null
          photos?: Json
          position?: string | null
          pro_teams?: Json
          revision?: number
          school?: string | null
          schools?: Json
          slug: string
          updated_at?: string
          videos?: Json
          weight_lbs?: number | null
        }
        Update: {
          athlete_quote?: string | null
          athlete_quote_author?: string | null
          awards?: Json
          bio?: string
          created_at?: string
          created_by?: string
          full_name?: string
          games_played?: number | null
          headshot_url?: string | null
          height_in?: number | null
          hero_video_url?: string | null
          hometown?: string | null
          id?: string
          jersey?: string | null
          level?: string | null
          photos?: Json
          position?: string | null
          pro_teams?: Json
          revision?: number
          school?: string | null
          schools?: Json
          slug?: string
          updated_at?: string
          videos?: Json
          weight_lbs?: number | null
        }
        Relationships: []
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
      admit_preview_discovery: { Args: never; Returns: string }
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
