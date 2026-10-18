// Generated from applied migrations by scripts/verify-award-images.mjs.
export type AwardImageDatabase = { public: { Tables: {
  award_image_assets: {
    Row: {
      id: string
      title: string
      storage_path: string | null
      external_url: string | null
      sha256: string | null
      mime_type: string | null
      byte_size: number | null
      image_source_url: string | null
      image_license: string | null
      attribution: string | null
      asset_status: string
      active: boolean
      revision: number
      created_by: string
      created_at: string
      updated_at: string
    }
    Insert: {
      id?: string
      title: string
      storage_path?: string | null
      external_url?: string | null
      sha256?: string | null
      mime_type?: string | null
      byte_size?: number | null
      image_source_url?: string | null
      image_license?: string | null
      attribution?: string | null
      asset_status?: string
      active?: boolean
      revision?: number
      created_by?: string
      created_at?: string
      updated_at?: string
    }
    Update: {
      id?: string
      title?: string
      storage_path?: string | null
      external_url?: string | null
      sha256?: string | null
      mime_type?: string | null
      byte_size?: number | null
      image_source_url?: string | null
      image_license?: string | null
      attribution?: string | null
      asset_status?: string
      active?: boolean
      revision?: number
      created_by?: string
      created_at?: string
      updated_at?: string
    }
    Relationships: [
  {
    "foreignKeyName": "award_image_assets_created_by_fkey",
    "isOneToOne": false,
    "referencedRelation": "users",
    "columns": [
      "created_by"
    ],
    "referencedColumns": [
      "id"
    ]
  }
]
  }
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
      image_asset_id: string | null
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
      image_asset_id?: string | null
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
      image_asset_id?: string | null
    }
    Relationships: [
  {
    "foreignKeyName": "award_catalog_image_asset_id_fkey",
    "isOneToOne": false,
    "referencedRelation": "award_image_assets",
    "columns": [
      "image_asset_id"
    ],
    "referencedColumns": [
      "id"
    ]
  }
]
  }
}; Views: Record<string, never>; Functions: Record<string, never>; Enums: Record<string, never>; CompositeTypes: Record<string, never> } };
