// Generated from the applied preview-enrichment migration by scripts/verify-preview-enrichment.mjs.
import type { Json } from './database.generated';
export type EnrichmentDatabase = { public: { Tables: {
  award_catalog: {
    Row: {
      id: string
      slug: string
      name: string
      sport: string
      league: string | null
      level: string | null
      award_type: string
      organization: string | null
      description: string
      aliases: string[]
      canonical_image_url: string | null
      image_source_url: string | null
      image_license: string | null
      attribution: string | null
      asset_status: string
      active: boolean
      created_at: string
      updated_at: string
    }
    Insert: {
      id?: string
      slug: string
      name: string
      sport: string
      league?: string | null
      level?: string | null
      award_type: string
      organization?: string | null
      description?: string
      aliases?: string[]
      canonical_image_url?: string | null
      image_source_url?: string | null
      image_license?: string | null
      attribution?: string | null
      asset_status?: string
      active?: boolean
      created_at?: string
      updated_at?: string
    }
    Update: {
      id?: string
      slug?: string
      name?: string
      sport?: string
      league?: string | null
      level?: string | null
      award_type?: string
      organization?: string | null
      description?: string
      aliases?: string[]
      canonical_image_url?: string | null
      image_source_url?: string | null
      image_license?: string | null
      attribution?: string | null
      asset_status?: string
      active?: boolean
      created_at?: string
      updated_at?: string
    }
    Relationships: []
  }
  preview_award_links: {
    Row: {
      id: string
      preview_id: string
      player_id: string | null
      award_id: string | null
      source_revision: number
      raw_label: string
      year: string
      edition: string
      source_url: string | null
      source_type: string
      confidence: number
      verified: boolean
      metadata: Json
      created_at: string
      updated_at: string
    }
    Insert: {
      id?: string
      preview_id: string
      player_id?: string | null
      award_id?: string | null
      source_revision: number
      raw_label: string
      year?: string
      edition?: string
      source_url?: string | null
      source_type: string
      confidence: number
      verified?: boolean
      metadata?: Json
      created_at?: string
      updated_at?: string
    }
    Update: {
      id?: string
      preview_id?: string
      player_id?: string | null
      award_id?: string | null
      source_revision?: number
      raw_label?: string
      year?: string
      edition?: string
      source_url?: string | null
      source_type?: string
      confidence?: number
      verified?: boolean
      metadata?: Json
      created_at?: string
      updated_at?: string
    }
    Relationships: [
  {
    "foreignKeyName": "preview_award_links_award_id_fkey",
    "isOneToOne": false,
    "referencedRelation": "award_catalog",
    "columns": [
      "award_id"
    ],
    "referencedColumns": [
      "id"
    ]
  },
  {
    "foreignKeyName": "preview_award_links_player_id_fkey",
    "isOneToOne": false,
    "referencedRelation": "players",
    "columns": [
      "player_id"
    ],
    "referencedColumns": [
      "id"
    ]
  },
  {
    "foreignKeyName": "preview_award_links_preview_id_fkey",
    "isOneToOne": false,
    "referencedRelation": "preview_lockers",
    "columns": [
      "preview_id"
    ],
    "referencedColumns": [
      "id"
    ]
  }
]
  }
  player_articles: {
    Row: {
      id: string
      preview_id: string
      player_id: string | null
      identity_key: string
      source_revision: number
      headline: string
      headline_key: string
      publisher: string
      article_url: string
      canonical_url: string
      thumbnail_url: string | null
      published_at: string | null
      author: string | null
      summary: string
      source_domain: string
      discovery_source: string
      discovered_at: string
      relevance_score: number
      confidence: number
      featured: boolean
      status: string
      metadata: Json
      created_at: string
      updated_at: string
    }
    Insert: {
      id?: string
      preview_id: string
      player_id?: string | null
      identity_key: string
      source_revision: number
      headline: string
      headline_key: string
      publisher: string
      article_url: string
      canonical_url: string
      thumbnail_url?: string | null
      published_at?: string | null
      author?: string | null
      summary?: string
      source_domain: string
      discovery_source: string
      discovered_at: string
      relevance_score: number
      confidence: number
      featured?: boolean
      status?: string
      metadata?: Json
      created_at?: string
      updated_at?: string
    }
    Update: {
      id?: string
      preview_id?: string
      player_id?: string | null
      identity_key?: string
      source_revision?: number
      headline?: string
      headline_key?: string
      publisher?: string
      article_url?: string
      canonical_url?: string
      thumbnail_url?: string | null
      published_at?: string | null
      author?: string | null
      summary?: string
      source_domain?: string
      discovery_source?: string
      discovered_at?: string
      relevance_score?: number
      confidence?: number
      featured?: boolean
      status?: string
      metadata?: Json
      created_at?: string
      updated_at?: string
    }
    Relationships: [
  {
    "foreignKeyName": "player_articles_player_id_fkey",
    "isOneToOne": false,
    "referencedRelation": "players",
    "columns": [
      "player_id"
    ],
    "referencedColumns": [
      "id"
    ]
  },
  {
    "foreignKeyName": "player_articles_preview_id_fkey",
    "isOneToOne": false,
    "referencedRelation": "preview_lockers",
    "columns": [
      "preview_id"
    ],
    "referencedColumns": [
      "id"
    ]
  }
]
  }
  preview_enrichments: {
    Row: {
      preview_id: string
      source_revision: number
      identity_key: string
      started_at: string
      updated_at: string
      report: Json
      request_fingerprint: string
    }
    Insert: {
      preview_id: string
      source_revision: number
      identity_key: string
      started_at: string
      updated_at?: string
      report?: Json
      request_fingerprint: string
    }
    Update: {
      preview_id?: string
      source_revision?: number
      identity_key?: string
      started_at?: string
      updated_at?: string
      report?: Json
      request_fingerprint?: string
    }
    Relationships: [
  {
    "foreignKeyName": "preview_enrichments_preview_id_fkey",
    "isOneToOne": true,
    "referencedRelation": "preview_lockers",
    "columns": [
      "preview_id"
    ],
    "referencedColumns": [
      "id"
    ]
  }
]
  }
  player_awards: {
    Row: {
      id: string
      player_id: string
      name: string
      description: string
      category: string
      year: number
      organization: string
      image_url: string | null
      source_url: string | null
      significance: string
      verified: boolean | null
      ai_discovered: boolean | null
      confidence_score: number | null
      created_at: string | null
      updated_at: string | null
      award_id: string | null
      edition: string | null
    }
    Insert: {
      id?: string
      player_id: string
      name: string
      description: string
      category: string
      year: number
      organization: string
      image_url?: string | null
      source_url?: string | null
      significance: string
      verified?: boolean | null
      ai_discovered?: boolean | null
      confidence_score?: number | null
      created_at?: string | null
      updated_at?: string | null
      award_id?: string | null
      edition?: string | null
    }
    Update: {
      id?: string
      player_id?: string
      name?: string
      description?: string
      category?: string
      year?: number
      organization?: string
      image_url?: string | null
      source_url?: string | null
      significance?: string
      verified?: boolean | null
      ai_discovered?: boolean | null
      confidence_score?: number | null
      created_at?: string | null
      updated_at?: string | null
      award_id?: string | null
      edition?: string | null
    }
    Relationships: [
  {
    "foreignKeyName": "player_awards_award_id_fkey",
    "isOneToOne": false,
    "referencedRelation": "award_catalog",
    "columns": [
      "award_id"
    ],
    "referencedColumns": [
      "id"
    ]
  },
  {
    "foreignKeyName": "player_awards_player_id_fkey",
    "isOneToOne": false,
    "referencedRelation": "players",
    "columns": [
      "player_id"
    ],
    "referencedColumns": [
      "id"
    ]
  }
]
  }
}; Views: Record<string, never>; Functions: { save_preview_enrichment: { Args: { p_preview_id: string; p_revision: number; p_identity_key: string; p_started_at: string; p_awards: Json; p_articles: Json; p_report: Json }; Returns: Json } }; Enums: Record<string, never>; CompositeTypes: Record<string, never> } };
