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
      } }; Functions: { admit_preview_discovery: { Args: never; Returns: string } }; Views: { [_ in never]: never }; Enums: { [_ in never]: never }; CompositeTypes: { [_ in never]: never } } };
