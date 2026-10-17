// Generated from Supabase production schema after migration 20261017035825.
// Scoped projection of official `supabase gen types --schema public` output.
import type { Json } from "./database.generated";
export type MerchandiseReviewDatabase = { public: { Tables: {
preview_merchandise_searches: {
        Row: {
          created_at: string
          dismissed_keys: string[]
          dismissed_urls: string[]
          identity_key: string
          preview_id: string
          result: Json
          searched_at: string
          source_revision: number
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          dismissed_keys?: string[]
          dismissed_urls?: string[]
          identity_key: string
          preview_id: string
          result: Json
          searched_at: string
          source_revision: number
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          dismissed_keys?: string[]
          dismissed_urls?: string[]
          identity_key?: string
          preview_id?: string
          result?: Json
          searched_at?: string
          source_revision?: number
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "preview_merchandise_searches_preview_id_fkey"
            columns: ["preview_id"]
            isOneToOne: true
            referencedRelation: "preview_lockers"
            referencedColumns: ["id"]
          },
        ]
      }
}; Views: Record<never, never>; Functions: {
save_preview_merchandise_search: {
        Args: {
          p_identity_key: string
          p_preview_id: string
          p_result: Json
          p_revision: number
          p_started_at: string
        }
        Returns: Json
      }
dismiss_preview_merchandise_result: {
        Args: {
          p_preview_id: string
          p_revision: number
          p_url: string
          p_version: number
        }
        Returns: Json
      }
preview_merchandise_listing_keys: {
        Args: { p_item: Json }
        Returns: string[]
      }
}; Enums: Record<never, never>; CompositeTypes: Record<never, never> } };
