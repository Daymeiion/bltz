// Scoped projection of official production schema after migration 20261017071708.
// Includes pending migration 20261017073440; regenerate after its authorized application.
import type { Json } from "./database.generated";
export type NewsReviewDatabase = { public: { Tables: {
player_articles: {
        Row: {
          article_url: string
          author: string | null
          canonical_url: string
          confidence: number
          created_at: string
          discovered_at: string
          discovery_source: string
          featured: boolean
          headline: string
          headline_key: string
          id: string
          identity_key: string
          metadata: Json
          player_id: string | null
          preview_id: string
          published_at: string | null
          publisher: string
          relevance_score: number
          review_keys: string[]
          source_domain: string
          source_revision: number
          status: string
          summary: string
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          article_url: string
          author?: string | null
          canonical_url: string
          confidence: number
          created_at?: string
          discovered_at: string
          discovery_source: string
          featured?: boolean
          headline: string
          headline_key: string
          id?: string
          identity_key: string
          metadata?: Json
          player_id?: string | null
          preview_id: string
          published_at?: string | null
          publisher: string
          relevance_score: number
          review_keys?: string[]
          source_domain: string
          source_revision: number
          status?: string
          summary?: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          article_url?: string
          author?: string | null
          canonical_url?: string
          confidence?: number
          created_at?: string
          discovered_at?: string
          discovery_source?: string
          featured?: boolean
          headline?: string
          headline_key?: string
          id?: string
          identity_key?: string
          metadata?: Json
          player_id?: string | null
          preview_id?: string
          published_at?: string | null
          publisher?: string
          relevance_score?: number
          review_keys?: string[]
          source_domain?: string
          source_revision?: number
          status?: string
          summary?: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_articles_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_articles_preview_id_fkey"
            columns: ["preview_id"]
            isOneToOne: false
            referencedRelation: "preview_lockers"
            referencedColumns: ["id"]
          },
        ]
      }
preview_enrichments: {
        Row: {
          identity_key: string
          news_review_version: number
          news_searched_at: string | null
          preview_id: string
          report: Json
          request_fingerprint: string
          source_revision: number
          started_at: string
          updated_at: string
        }
        Insert: {
          identity_key: string
          news_review_version?: number
          news_searched_at?: string | null
          preview_id: string
          report?: Json
          request_fingerprint: string
          source_revision: number
          started_at: string
          updated_at?: string
        }
        Update: {
          identity_key?: string
          news_review_version?: number
          news_searched_at?: string | null
          preview_id?: string
          report?: Json
          request_fingerprint?: string
          source_revision?: number
          started_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "preview_enrichments_preview_id_fkey"
            columns: ["preview_id"]
            isOneToOne: true
            referencedRelation: "preview_lockers"
            referencedColumns: ["id"]
          },
        ]
      }
}; Views: Record<string, never>; Functions: {
restore_preview_news_article: { Args: { p_preview_id: string; p_revision: number; p_version: number; p_identity_key: string; p_url: string }; Returns: Json }

preview_news_article_keys: {
        Args: { p_article: Json }
        Returns: string[]
      }
dismiss_preview_news_article: {
        Args: {
          p_preview_id: string
          p_revision: number
          p_url: string
          p_version: number
        }
        Returns: Json
      }
dismiss_preview_news_articles: {
        Args: {
          p_preview_id: string
          p_revision: number
          p_urls: string[]
          p_version: number
        }
        Returns: Json
      }
save_preview_enrichment: {
        Args: {
          p_articles: Json
          p_awards: Json
          p_identity_key: string
          p_preview_id: string
          p_report: Json
          p_revision: number
          p_started_at: string
        }
        Returns: Json
      }
}; Enums: Record<string, never>; CompositeTypes: Record<string, never> } };
