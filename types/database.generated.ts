export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Preserve the deployed PostgREST compatibility metadata. Local generation
  // does not emit this block, but the application client uses the staging
  // version to select the correct PostgREST typing behavior.
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      achievement_progress: {
        Row: {
          achievement_id: string
          created_at: string | null
          current_progress: number | null
          id: string
          last_updated: string | null
          max_progress: number
          player_id: string
          progress_percentage: number | null
          updated_at: string | null
        }
        Insert: {
          achievement_id: string
          created_at?: string | null
          current_progress?: number | null
          id?: string
          last_updated?: string | null
          max_progress: number
          player_id: string
          progress_percentage?: number | null
          updated_at?: string | null
        }
        Update: {
          achievement_id?: string
          created_at?: string | null
          current_progress?: number | null
          id?: string
          last_updated?: string | null
          max_progress?: number
          player_id?: string
          progress_percentage?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "achievement_progress_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achievement_progress_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      achievements: {
        Row: {
          category: string
          created_at: string | null
          criteria: Json
          description: string
          icon: string
          id: string
          is_active: boolean | null
          name: string
          points: number | null
          rarity: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          criteria?: Json
          description: string
          icon: string
          id?: string
          is_active?: boolean | null
          name: string
          points?: number | null
          rarity: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          criteria?: Json
          description?: string
          icon?: string
          id?: string
          is_active?: boolean | null
          name?: string
          points?: number | null
          rarity?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      admin_revenue_summary: {
        Row: {
          created_at: string | null
          id: string
          summary_date: string
          total_platform_revenue: number
          total_player_revenue: number
          total_publisher_revenue: number
          total_team_pool_revenue: number
          total_videos_processed: number
          total_views_processed: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          summary_date: string
          total_platform_revenue?: number
          total_player_revenue?: number
          total_publisher_revenue?: number
          total_team_pool_revenue?: number
          total_videos_processed?: number
          total_views_processed?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          summary_date?: string
          total_platform_revenue?: number
          total_player_revenue?: number
          total_publisher_revenue?: number
          total_team_pool_revenue?: number
          total_videos_processed?: number
          total_views_processed?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          athlete_id: string | null
          client_event_id: string
          created_at: string
          event_name: string
          id: string
          occurred_at: string
          page: string | null
          properties: Json
          session_id: string | null
          source: string
          user_id: string | null
        }
        Insert: {
          athlete_id?: string | null
          client_event_id: string
          created_at?: string
          event_name: string
          id?: string
          occurred_at?: string
          page?: string | null
          properties?: Json
          session_id?: string | null
          source: string
          user_id?: string | null
        }
        Update: {
          athlete_id?: string | null
          client_event_id?: string
          created_at?: string
          event_name?: string
          id?: string
          occurred_at?: string
          page?: string | null
          properties?: Json
          session_id?: string | null
          source?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_rate_limit_buckets: {
        Row: {
          bucket_start: string
          expires_at: string
          key_hash: string
          request_count: number
        }
        Insert: {
          bucket_start: string
          expires_at: string
          key_hash: string
          request_count?: number
        }
        Update: {
          bucket_start?: string
          expires_at?: string
          key_hash?: string
          request_count?: number
        }
        Relationships: []
      }
      articles: {
        Row: {
          body: string | null
          cover_image_url: string | null
          created_at: string | null
          id: string
          owner_user_id: string | null
          player_id: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          visibility: string | null
        }
        Insert: {
          body?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          id?: string
          owner_user_id?: string | null
          player_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          visibility?: string | null
        }
        Update: {
          body?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          id?: string
          owner_user_id?: string | null
          player_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "articles_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_baseline_snapshots: {
        Row: {
          athlete_id: string
          captured_by: string | null
          created_at: string
          id: string
          participant_id: string | null
          schema_version: number
          snapshot: Json
        }
        Insert: {
          athlete_id: string
          captured_by?: string | null
          created_at?: string
          id?: string
          participant_id?: string | null
          schema_version?: number
          snapshot: Json
        }
        Update: {
          athlete_id?: string
          captured_by?: string | null
          created_at?: string
          id?: string
          participant_id?: string | null
          schema_version?: number
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "athlete_baseline_snapshots_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_baseline_snapshots_participant_id_athlete_id_fkey"
            columns: ["participant_id", "athlete_id"]
            isOneToOne: false
            referencedRelation: "beta_participants"
            referencedColumns: ["id", "athlete_id"]
          },
        ]
      }
      athlete_feedback: {
        Row: {
          additional_responses: Json
          analytics_interest: boolean | null
          athlete_id: string
          biggest_problem: string | null
          career_accuracy_rating: number | null
          created_at: string
          created_by: string | null
          digital_intelligence_interest: boolean | null
          favorite_feature: string | null
          follow_up_required: boolean
          id: string
          interview_date: string
          interviewer_id: string | null
          locker_value_rating: number | null
          media_value_rating: number | null
          missing_career_content: string | null
          missing_feature: string | null
          missing_media: string | null
          monetization_interest: boolean | null
          overall_rating: number | null
          participant_id: string | null
          payment_expectation: string | null
          preferred_audience: string | null
          raw_notes: string | null
          testimonial_quote: string | null
          updated_at: string
          updated_by: string | null
          willingness_to_pay: boolean | null
          would_share: boolean | null
        }
        Insert: {
          additional_responses?: Json
          analytics_interest?: boolean | null
          athlete_id: string
          biggest_problem?: string | null
          career_accuracy_rating?: number | null
          created_at?: string
          created_by?: string | null
          digital_intelligence_interest?: boolean | null
          favorite_feature?: string | null
          follow_up_required?: boolean
          id?: string
          interview_date?: string
          interviewer_id?: string | null
          locker_value_rating?: number | null
          media_value_rating?: number | null
          missing_career_content?: string | null
          missing_feature?: string | null
          missing_media?: string | null
          monetization_interest?: boolean | null
          overall_rating?: number | null
          participant_id?: string | null
          payment_expectation?: string | null
          preferred_audience?: string | null
          raw_notes?: string | null
          testimonial_quote?: string | null
          updated_at?: string
          updated_by?: string | null
          willingness_to_pay?: boolean | null
          would_share?: boolean | null
        }
        Update: {
          additional_responses?: Json
          analytics_interest?: boolean | null
          athlete_id?: string
          biggest_problem?: string | null
          career_accuracy_rating?: number | null
          created_at?: string
          created_by?: string | null
          digital_intelligence_interest?: boolean | null
          favorite_feature?: string | null
          follow_up_required?: boolean
          id?: string
          interview_date?: string
          interviewer_id?: string | null
          locker_value_rating?: number | null
          media_value_rating?: number | null
          missing_career_content?: string | null
          missing_feature?: string | null
          missing_media?: string | null
          monetization_interest?: boolean | null
          overall_rating?: number | null
          participant_id?: string | null
          payment_expectation?: string | null
          preferred_audience?: string | null
          raw_notes?: string | null
          testimonial_quote?: string | null
          updated_at?: string
          updated_by?: string | null
          willingness_to_pay?: boolean | null
          would_share?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_feedback_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_feedback_participant_id_athlete_id_fkey"
            columns: ["participant_id", "athlete_id"]
            isOneToOne: false
            referencedRelation: "beta_participants"
            referencedColumns: ["id", "athlete_id"]
          },
        ]
      }
      athlete_insights: {
        Row: {
          athlete_id: string
          category: string
          created_at: string
          created_by: string | null
          description: string
          evidence: Json
          id: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          athlete_id: string
          category: string
          created_at?: string
          created_by?: string | null
          description: string
          evidence?: Json
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source: string
          status?: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          evidence?: Json
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_insights_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_season_stats: {
        Row: {
          athlete_team_season_id: string
          created_at: string
          created_by: string | null
          id: string
          last_synced_at: string | null
          organization_id: string
          season_phase: string
          source: string
          stats: Json
          updated_at: string
        }
        Insert: {
          athlete_team_season_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          last_synced_at?: string | null
          organization_id: string
          season_phase: string
          source: string
          stats?: Json
          updated_at?: string
        }
        Update: {
          athlete_team_season_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          last_synced_at?: string | null
          organization_id?: string
          season_phase?: string
          source?: string
          stats?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_season_stats_roster_stint_fkey"
            columns: ["organization_id", "athlete_team_season_id"]
            isOneToOne: false
            referencedRelation: "athlete_team_seasons"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      athlete_team_seasons: {
        Row: {
          created_at: string
          created_by: string | null
          ends_on: string | null
          id: string
          jersey_number: string | null
          organization_id: string
          player_id: string
          position: string | null
          roster_status: string
          starts_on: string
          team_season_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_on?: string | null
          id?: string
          jersey_number?: string | null
          organization_id: string
          player_id: string
          position?: string | null
          roster_status?: string
          starts_on: string
          team_season_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_on?: string | null
          id?: string
          jersey_number?: string | null
          organization_id?: string
          player_id?: string
          position?: string | null
          roster_status?: string
          starts_on?: string
          team_season_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_team_seasons_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_team_seasons_team_season_fkey"
            columns: ["organization_id", "team_season_id"]
            isOneToOne: false
            referencedRelation: "team_seasons"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_role: string | null
          actor_role_scope: string | null
          actor_user_id: string | null
          correlation_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          new_values: Json | null
          organization_id: string | null
          previous_values: Json | null
          reason: string | null
          request_metadata: Json
          risk_level: string
        }
        Insert: {
          action: string
          actor_role?: string | null
          actor_role_scope?: string | null
          actor_user_id?: string | null
          correlation_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: never
          new_values?: Json | null
          organization_id?: string | null
          previous_values?: Json | null
          reason?: string | null
          request_metadata?: Json
          risk_level?: string
        }
        Update: {
          action?: string
          actor_role?: string | null
          actor_role_scope?: string | null
          actor_user_id?: string | null
          correlation_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: never
          new_values?: Json | null
          organization_id?: string | null
          previous_values?: Json | null
          reason?: string | null
          request_metadata?: Json
          risk_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      award_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      award_verification: {
        Row: {
          award_id: string
          created_at: string | null
          id: string
          verification_data: Json | null
          verification_method: string
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          award_id: string
          created_at?: string | null
          id?: string
          verification_data?: Json | null
          verification_method: string
          verification_status: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          award_id?: string
          created_at?: string | null
          id?: string
          verification_data?: Json | null
          verification_method?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "award_verification_award_id_fkey"
            columns: ["award_id"]
            isOneToOne: false
            referencedRelation: "player_awards"
            referencedColumns: ["id"]
          },
        ]
      }
      awards: {
        Row: {
          accessed_at: string | null
          award_name: string
          award_short_desc: string
          created_at: string | null
          evidence_quote: string | null
          extractor_confidence: number | null
          extractor_version: string | null
          id: number
          league: string | null
          level: string | null
          player_id: string
          player_name: string
          source_site: string
          source_url: string
          team_or_school: string | null
          updated_at: string | null
          year: string
        }
        Insert: {
          accessed_at?: string | null
          award_name: string
          award_short_desc: string
          created_at?: string | null
          evidence_quote?: string | null
          extractor_confidence?: number | null
          extractor_version?: string | null
          id?: number
          league?: string | null
          level?: string | null
          player_id: string
          player_name: string
          source_site: string
          source_url: string
          team_or_school?: string | null
          updated_at?: string | null
          year: string
        }
        Update: {
          accessed_at?: string | null
          award_name?: string
          award_short_desc?: string
          created_at?: string | null
          evidence_quote?: string | null
          extractor_confidence?: number | null
          extractor_version?: string | null
          id?: number
          league?: string | null
          level?: string | null
          player_id?: string
          player_name?: string
          source_site?: string
          source_url?: string
          team_or_school?: string | null
          updated_at?: string | null
          year?: string
        }
        Relationships: []
      }
      beta_participants: {
        Row: {
          athlete_id: string
          case_study_candidate: boolean
          case_study_permission: string
          cohort: string
          created_at: string
          created_by: string | null
          feedback_completed_at: string | null
          id: string
          internal_notes: string | null
          invite_source: string | null
          invited_at: string | null
          joined_at: string | null
          locker_claimed_at: string | null
          status: string
          updated_at: string
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          athlete_id: string
          case_study_candidate?: boolean
          case_study_permission?: string
          cohort: string
          created_at?: string
          created_by?: string | null
          feedback_completed_at?: string | null
          id?: string
          internal_notes?: string | null
          invite_source?: string | null
          invited_at?: string | null
          joined_at?: string | null
          locker_claimed_at?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          athlete_id?: string
          case_study_candidate?: boolean
          case_study_permission?: string
          cohort?: string
          created_at?: string
          created_by?: string | null
          feedback_completed_at?: string | null
          id?: string
          internal_notes?: string | null
          invite_source?: string | null
          invited_at?: string | null
          joined_at?: string | null
          locker_claimed_at?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beta_participants_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      cfb_players: {
        Row: {
          cfb_team_id: string | null
          display_name: string
          espn_id: string
          first_name: string | null
          first_season: number | null
          height_in: number | null
          home_city: string | null
          home_country: string | null
          home_state: string | null
          jersey: number | null
          last_name: string | null
          last_season: number | null
          last_synced_at: string
          position: string | null
          recruit_ids: Json | null
          team: string | null
          weight_lbs: number | null
        }
        Insert: {
          cfb_team_id?: string | null
          display_name: string
          espn_id: string
          first_name?: string | null
          first_season?: number | null
          height_in?: number | null
          home_city?: string | null
          home_country?: string | null
          home_state?: string | null
          jersey?: number | null
          last_name?: string | null
          last_season?: number | null
          last_synced_at?: string
          position?: string | null
          recruit_ids?: Json | null
          team?: string | null
          weight_lbs?: number | null
        }
        Update: {
          cfb_team_id?: string | null
          display_name?: string
          espn_id?: string
          first_name?: string | null
          first_season?: number | null
          height_in?: number | null
          home_city?: string | null
          home_country?: string | null
          home_state?: string | null
          jersey?: number | null
          last_name?: string | null
          last_season?: number | null
          last_synced_at?: string
          position?: string | null
          recruit_ids?: Json | null
          team?: string | null
          weight_lbs?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cfb_players_cfb_team_id_fkey"
            columns: ["cfb_team_id"]
            isOneToOne: false
            referencedRelation: "cfb_teams"
            referencedColumns: ["espn_id"]
          },
        ]
      }
      cfb_teams: {
        Row: {
          abbreviation: string | null
          alt_color: string | null
          display_name: string
          espn_id: string
          is_active: boolean | null
          last_synced_at: string
          location: string | null
          logo_dark_url: string | null
          logo_url: string | null
          mascot: string | null
          primary_color: string | null
          slug: string | null
        }
        Insert: {
          abbreviation?: string | null
          alt_color?: string | null
          display_name: string
          espn_id: string
          is_active?: boolean | null
          last_synced_at?: string
          location?: string | null
          logo_dark_url?: string | null
          logo_url?: string | null
          mascot?: string | null
          primary_color?: string | null
          slug?: string | null
        }
        Update: {
          abbreviation?: string | null
          alt_color?: string | null
          display_name?: string
          espn_id?: string
          is_active?: boolean | null
          last_synced_at?: string
          location?: string | null
          logo_dark_url?: string | null
          logo_url?: string | null
          mascot?: string | null
          primary_color?: string | null
          slug?: string | null
        }
        Relationships: []
      }
      claim_tokens: {
        Row: {
          claimed_at: string | null
          claimed_by: string | null
          created_at: string | null
          email: string | null
          expires_at: string
          id: string
          player_id: string
          token: string
        }
        Insert: {
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string | null
          email?: string | null
          expires_at?: string
          id?: string
          player_id: string
          token: string
        }
        Update: {
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string | null
          email?: string | null
          expires_at?: string
          id?: string
          player_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_tokens_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      Colleges: {
        Row: {
          canonical_name: string
          city: string | null
          conference: string | null
          country: string | null
          created_at: string
          division: string | null
          id: number
          league: string | null
          logo_url: string | null
          mascot: string | null
          org_type: string | null
          primary_color_hex: string | null
          secondary_color_hex: string | null
          source_conference_division_raw: string | null
          state: string | null
        }
        Insert: {
          canonical_name: string
          city?: string | null
          conference?: string | null
          country?: string | null
          created_at?: string
          division?: string | null
          id?: number
          league?: string | null
          logo_url?: string | null
          mascot?: string | null
          org_type?: string | null
          primary_color_hex?: string | null
          secondary_color_hex?: string | null
          source_conference_division_raw?: string | null
          state?: string | null
        }
        Update: {
          canonical_name?: string
          city?: string | null
          conference?: string | null
          country?: string | null
          created_at?: string
          division?: string | null
          id?: number
          league?: string | null
          logo_url?: string | null
          mascot?: string | null
          org_type?: string | null
          primary_color_hex?: string | null
          secondary_color_hex?: string | null
          source_conference_division_raw?: string | null
          state?: string | null
        }
        Relationships: []
      }
      content_moderation_settings: {
        Row: {
          allow_anonymous_reports: boolean
          allow_user_reports: boolean
          appeal_deadline: number
          appeal_process_enabled: boolean
          auto_delete_threshold: number
          auto_hide_threshold: number
          auto_moderation_enabled: boolean
          created_at: string
          escalation_enabled: boolean
          escalation_threshold: number
          id: string
          image_moderation: boolean
          moderation_queue_size: number
          moderation_response_time: number
          profanity_filter: boolean
          report_threshold: number
          require_approval_for_new_users: boolean
          require_approval_for_verified_users: boolean
          spam_detection: boolean
          updated_at: string
          video_moderation: boolean
        }
        Insert: {
          allow_anonymous_reports?: boolean
          allow_user_reports?: boolean
          appeal_deadline?: number
          appeal_process_enabled?: boolean
          auto_delete_threshold?: number
          auto_hide_threshold?: number
          auto_moderation_enabled?: boolean
          created_at?: string
          escalation_enabled?: boolean
          escalation_threshold?: number
          id?: string
          image_moderation?: boolean
          moderation_queue_size?: number
          moderation_response_time?: number
          profanity_filter?: boolean
          report_threshold?: number
          require_approval_for_new_users?: boolean
          require_approval_for_verified_users?: boolean
          spam_detection?: boolean
          updated_at?: string
          video_moderation?: boolean
        }
        Update: {
          allow_anonymous_reports?: boolean
          allow_user_reports?: boolean
          appeal_deadline?: number
          appeal_process_enabled?: boolean
          auto_delete_threshold?: number
          auto_hide_threshold?: number
          auto_moderation_enabled?: boolean
          created_at?: string
          escalation_enabled?: boolean
          escalation_threshold?: number
          id?: string
          image_moderation?: boolean
          moderation_queue_size?: number
          moderation_response_time?: number
          profanity_filter?: boolean
          report_threshold?: number
          require_approval_for_new_users?: boolean
          require_approval_for_verified_users?: boolean
          spam_detection?: boolean
          updated_at?: string
          video_moderation?: boolean
        }
        Relationships: []
      }
      daily_analytics: {
        Row: {
          active_users: number | null
          avg_session_duration_seconds: number | null
          created_at: string | null
          id: string
          new_users: number | null
          summary_date: string
          total_comments: number | null
          total_likes: number | null
          total_shares: number | null
          total_users: number | null
          total_videos_uploaded: number | null
          total_views: number | null
          updated_at: string | null
        }
        Insert: {
          active_users?: number | null
          avg_session_duration_seconds?: number | null
          created_at?: string | null
          id?: string
          new_users?: number | null
          summary_date: string
          total_comments?: number | null
          total_likes?: number | null
          total_shares?: number | null
          total_users?: number | null
          total_videos_uploaded?: number | null
          total_views?: number | null
          updated_at?: string | null
        }
        Update: {
          active_users?: number | null
          avg_session_duration_seconds?: number | null
          created_at?: string | null
          id?: string
          new_users?: number | null
          summary_date?: string
          total_comments?: number | null
          total_likes?: number | null
          total_shares?: number | null
          total_users?: number | null
          total_videos_uploaded?: number | null
          total_views?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_notification_settings: {
        Row: {
          admin_notifications_enabled: boolean
          created_at: string
          digest_frequency: string
          email_templates_enabled: boolean
          email_tracking_enabled: boolean
          email_verification_enabled: boolean
          from_email: string
          from_name: string
          id: string
          marketing_emails_enabled: boolean
          moderation_alerts_enabled: boolean
          notification_digest_enabled: boolean
          password_reset_enabled: boolean
          smtp_enabled: boolean
          smtp_host: string
          smtp_password: string | null
          smtp_port: number
          smtp_secure: boolean
          smtp_username: string | null
          system_alerts_enabled: boolean
          updated_at: string
          user_reports_enabled: boolean
          welcome_email_enabled: boolean
        }
        Insert: {
          admin_notifications_enabled?: boolean
          created_at?: string
          digest_frequency?: string
          email_templates_enabled?: boolean
          email_tracking_enabled?: boolean
          email_verification_enabled?: boolean
          from_email?: string
          from_name?: string
          id?: string
          marketing_emails_enabled?: boolean
          moderation_alerts_enabled?: boolean
          notification_digest_enabled?: boolean
          password_reset_enabled?: boolean
          smtp_enabled?: boolean
          smtp_host?: string
          smtp_password?: string | null
          smtp_port?: number
          smtp_secure?: boolean
          smtp_username?: string | null
          system_alerts_enabled?: boolean
          updated_at?: string
          user_reports_enabled?: boolean
          welcome_email_enabled?: boolean
        }
        Update: {
          admin_notifications_enabled?: boolean
          created_at?: string
          digest_frequency?: string
          email_templates_enabled?: boolean
          email_tracking_enabled?: boolean
          email_verification_enabled?: boolean
          from_email?: string
          from_name?: string
          id?: string
          marketing_emails_enabled?: boolean
          moderation_alerts_enabled?: boolean
          notification_digest_enabled?: boolean
          password_reset_enabled?: boolean
          smtp_enabled?: boolean
          smtp_host?: string
          smtp_password?: string | null
          smtp_port?: number
          smtp_secure?: boolean
          smtp_username?: string | null
          system_alerts_enabled?: boolean
          updated_at?: string
          user_reports_enabled?: boolean
          welcome_email_enabled?: boolean
        }
        Relationships: []
      }
      gtm_contact_players: {
        Row: {
          contact_id: string
          created_at: string
          created_by: string
          id: string
          match_confidence: number
          match_type: string
          player_id: string
          updated_at: string
          verified: boolean
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string
          created_by: string
          id?: string
          match_confidence: number
          match_type: string
          player_id: string
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string
          created_by?: string
          id?: string
          match_confidence?: number
          match_type?: string
          player_id?: string
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gtm_contact_players_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "gtm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gtm_contact_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      gtm_contacts: {
        Row: {
          archived: boolean
          bltz_relevance: number | null
          buying_authority: number | null
          contact_type: string
          created_at: string
          created_by: string
          current_company: string | null
          current_title: string | null
          display_name: string
          do_not_automate: boolean
          email: string | null
          first_name: string | null
          future_trigger: string | null
          geography: string | null
          historical_signal: string | null
          id: string
          introduction_potential: number | null
          investor_relationship_stage: string | null
          investor_thesis_feedback: string | null
          investor_type: string | null
          is_priority: boolean
          last_interaction_at: string | null
          last_name: string | null
          league_level: string | null
          linkedin_connected_on: string | null
          linkedin_url: string | null
          network_leverage: number | null
          next_action: string | null
          next_action_at: string | null
          next_trigger: string | null
          organization_id: string | null
          phone: string | null
          pipeline_stage: string
          prior_outcome: string | null
          priority_model: string | null
          priority_score: number | null
          priority_tier: string | null
          relationship_source: string | null
          relationship_strength: number | null
          segment: string | null
          source: string | null
          source_record_id: string | null
          sport: string | null
          timing_score: number | null
          updated_at: string
          updated_by: string | null
          what_they_need_to_see: string | null
        }
        Insert: {
          archived?: boolean
          bltz_relevance?: number | null
          buying_authority?: number | null
          contact_type?: string
          created_at?: string
          created_by: string
          current_company?: string | null
          current_title?: string | null
          display_name: string
          do_not_automate?: boolean
          email?: string | null
          first_name?: string | null
          future_trigger?: string | null
          geography?: string | null
          historical_signal?: string | null
          id?: string
          introduction_potential?: number | null
          investor_relationship_stage?: string | null
          investor_thesis_feedback?: string | null
          investor_type?: string | null
          is_priority?: boolean
          last_interaction_at?: string | null
          last_name?: string | null
          league_level?: string | null
          linkedin_connected_on?: string | null
          linkedin_url?: string | null
          network_leverage?: number | null
          next_action?: string | null
          next_action_at?: string | null
          next_trigger?: string | null
          organization_id?: string | null
          phone?: string | null
          pipeline_stage?: string
          prior_outcome?: string | null
          priority_model?: string | null
          priority_score?: number | null
          priority_tier?: string | null
          relationship_source?: string | null
          relationship_strength?: number | null
          segment?: string | null
          source?: string | null
          source_record_id?: string | null
          sport?: string | null
          timing_score?: number | null
          updated_at?: string
          updated_by?: string | null
          what_they_need_to_see?: string | null
        }
        Update: {
          archived?: boolean
          bltz_relevance?: number | null
          buying_authority?: number | null
          contact_type?: string
          created_at?: string
          created_by?: string
          current_company?: string | null
          current_title?: string | null
          display_name?: string
          do_not_automate?: boolean
          email?: string | null
          first_name?: string | null
          future_trigger?: string | null
          geography?: string | null
          historical_signal?: string | null
          id?: string
          introduction_potential?: number | null
          investor_relationship_stage?: string | null
          investor_thesis_feedback?: string | null
          investor_type?: string | null
          is_priority?: boolean
          last_interaction_at?: string | null
          last_name?: string | null
          league_level?: string | null
          linkedin_connected_on?: string | null
          linkedin_url?: string | null
          network_leverage?: number | null
          next_action?: string | null
          next_action_at?: string | null
          next_trigger?: string | null
          organization_id?: string | null
          phone?: string | null
          pipeline_stage?: string
          prior_outcome?: string | null
          priority_model?: string | null
          priority_score?: number | null
          priority_tier?: string | null
          relationship_source?: string | null
          relationship_strength?: number | null
          segment?: string | null
          source?: string | null
          source_record_id?: string | null
          sport?: string | null
          timing_score?: number | null
          updated_at?: string
          updated_by?: string | null
          what_they_need_to_see?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gtm_contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "gtm_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      gtm_customer_discovery: {
        Row: {
          additional_context: string | null
          contact_id: string
          created_at: string
          created_by: string
          current_solution: string | null
          expected_budget_range: string | null
          expected_buyer: string | null
          feature_requested: string | null
          id: string
          interaction_id: string | null
          introduction_offered: boolean | null
          introduction_target: string | null
          organization_id: string | null
          pain_level: number | null
          primary_bltz_use_case: string | null
          primary_objection: string | null
          problem_discussed: string | null
          updated_at: string
          updated_by: string | null
          would_pay: boolean | null
          would_pilot: boolean | null
          would_use: boolean | null
        }
        Insert: {
          additional_context?: string | null
          contact_id: string
          created_at?: string
          created_by: string
          current_solution?: string | null
          expected_budget_range?: string | null
          expected_buyer?: string | null
          feature_requested?: string | null
          id?: string
          interaction_id?: string | null
          introduction_offered?: boolean | null
          introduction_target?: string | null
          organization_id?: string | null
          pain_level?: number | null
          primary_bltz_use_case?: string | null
          primary_objection?: string | null
          problem_discussed?: string | null
          updated_at?: string
          updated_by?: string | null
          would_pay?: boolean | null
          would_pilot?: boolean | null
          would_use?: boolean | null
        }
        Update: {
          additional_context?: string | null
          contact_id?: string
          created_at?: string
          created_by?: string
          current_solution?: string | null
          expected_budget_range?: string | null
          expected_buyer?: string | null
          feature_requested?: string | null
          id?: string
          interaction_id?: string | null
          introduction_offered?: boolean | null
          introduction_target?: string | null
          organization_id?: string | null
          pain_level?: number | null
          primary_bltz_use_case?: string | null
          primary_objection?: string | null
          problem_discussed?: string | null
          updated_at?: string
          updated_by?: string | null
          would_pay?: boolean | null
          would_pilot?: boolean | null
          would_use?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "gtm_customer_discovery_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "gtm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gtm_customer_discovery_interaction_contact_fkey"
            columns: ["interaction_id", "contact_id"]
            isOneToOne: false
            referencedRelation: "gtm_interactions"
            referencedColumns: ["id", "contact_id"]
          },
          {
            foreignKeyName: "gtm_customer_discovery_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "gtm_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      gtm_import_jobs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          completed_at: string | null
          content_sha256: string
          created_at: string
          error_summary: string | null
          field_mapping: Json
          filename: string
          id: string
          idempotency_key: string
          import_type: string
          potential_matches: number
          preview_summary: Json
          rows_created: number
          rows_duplicated: number
          rows_failed: number
          rows_found: number
          rows_updated: number
          started_at: string | null
          status: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          content_sha256: string
          created_at?: string
          error_summary?: string | null
          field_mapping?: Json
          filename: string
          id?: string
          idempotency_key: string
          import_type: string
          potential_matches?: number
          preview_summary?: Json
          rows_created?: number
          rows_duplicated?: number
          rows_failed?: number
          rows_found?: number
          rows_updated?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          content_sha256?: string
          created_at?: string
          error_summary?: string | null
          field_mapping?: Json
          filename?: string
          id?: string
          idempotency_key?: string
          import_type?: string
          potential_matches?: number
          preview_summary?: Json
          rows_created?: number
          rows_duplicated?: number
          rows_failed?: number
          rows_found?: number
          rows_updated?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      gtm_interactions: {
        Row: {
          contact_id: string
          created_at: string
          created_by: string
          direction: string
          id: string
          interaction_at: string
          interaction_type: string
          next_trigger: string | null
          opportunity_id: string | null
          organization_id: string | null
          outcomes: string[]
          subject: string | null
          summary: string | null
          updated_at: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          created_by: string
          direction: string
          id?: string
          interaction_at: string
          interaction_type: string
          next_trigger?: string | null
          opportunity_id?: string | null
          organization_id?: string | null
          outcomes?: string[]
          subject?: string | null
          summary?: string | null
          updated_at?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          created_by?: string
          direction?: string
          id?: string
          interaction_at?: string
          interaction_type?: string
          next_trigger?: string | null
          opportunity_id?: string | null
          organization_id?: string | null
          outcomes?: string[]
          subject?: string | null
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gtm_interactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "gtm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gtm_interactions_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "gtm_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gtm_interactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "gtm_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      gtm_notes: {
        Row: {
          body: string
          contact_id: string
          created_at: string
          created_by: string
          id: string
          interaction_id: string | null
          note_type: string
          updated_at: string
        }
        Insert: {
          body: string
          contact_id: string
          created_at?: string
          created_by: string
          id?: string
          interaction_id?: string | null
          note_type: string
          updated_at?: string
        }
        Update: {
          body?: string
          contact_id?: string
          created_at?: string
          created_by?: string
          id?: string
          interaction_id?: string | null
          note_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gtm_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "gtm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gtm_notes_interaction_contact_fkey"
            columns: ["interaction_id", "contact_id"]
            isOneToOne: false
            referencedRelation: "gtm_interactions"
            referencedColumns: ["id", "contact_id"]
          },
        ]
      }
      gtm_opportunities: {
        Row: {
          created_at: string
          created_by: string
          estimated_value: number | null
          id: string
          name: string
          next_step: string | null
          next_step_at: string | null
          opportunity_type: string
          organization_id: string | null
          owner: string | null
          primary_contact_id: string | null
          probability: number | null
          stage: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          estimated_value?: number | null
          id?: string
          name: string
          next_step?: string | null
          next_step_at?: string | null
          opportunity_type: string
          organization_id?: string | null
          owner?: string | null
          primary_contact_id?: string | null
          probability?: number | null
          stage?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          estimated_value?: number | null
          id?: string
          name?: string
          next_step?: string | null
          next_step_at?: string | null
          opportunity_type?: string
          organization_id?: string | null
          owner?: string | null
          primary_contact_id?: string | null
          probability?: number | null
          stage?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gtm_opportunities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "gtm_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gtm_opportunities_primary_contact_id_fkey"
            columns: ["primary_contact_id"]
            isOneToOne: false
            referencedRelation: "gtm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      gtm_organizations: {
        Row: {
          archived: boolean
          canonical_organization_id: string | null
          city: string | null
          conference: string | null
          created_at: string
          created_by: string
          division: string | null
          id: string
          linkedin_url: string | null
          logo_url: string | null
          name: string | null
          organization_type: string | null
          owner: string | null
          pipeline_stage: string
          priority: number | null
          school_id: string | null
          sport: string | null
          state: string | null
          updated_at: string
          updated_by: string | null
          website: string | null
        }
        Insert: {
          archived?: boolean
          canonical_organization_id?: string | null
          city?: string | null
          conference?: string | null
          created_at?: string
          created_by: string
          division?: string | null
          id?: string
          linkedin_url?: string | null
          logo_url?: string | null
          name?: string | null
          organization_type?: string | null
          owner?: string | null
          pipeline_stage?: string
          priority?: number | null
          school_id?: string | null
          sport?: string | null
          state?: string | null
          updated_at?: string
          updated_by?: string | null
          website?: string | null
        }
        Update: {
          archived?: boolean
          canonical_organization_id?: string | null
          city?: string | null
          conference?: string | null
          created_at?: string
          created_by?: string
          division?: string | null
          id?: string
          linkedin_url?: string | null
          logo_url?: string | null
          name?: string | null
          organization_type?: string | null
          owner?: string | null
          pipeline_stage?: string
          priority?: number | null
          school_id?: string | null
          sport?: string | null
          state?: string | null
          updated_at?: string
          updated_by?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gtm_organizations_canonical_organization_id_fkey"
            columns: ["canonical_organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gtm_organizations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      gtm_relationships: {
        Row: {
          created_at: string
          created_by: string
          id: string
          notes: string | null
          relationship_strength: number | null
          relationship_type: string
          source_contact_id: string
          target_contact_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          relationship_strength?: number | null
          relationship_type: string
          source_contact_id: string
          target_contact_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          relationship_strength?: number | null
          relationship_type?: string
          source_contact_id?: string
          target_contact_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gtm_relationships_source_contact_id_fkey"
            columns: ["source_contact_id"]
            isOneToOne: false
            referencedRelation: "gtm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gtm_relationships_target_contact_id_fkey"
            columns: ["target_contact_id"]
            isOneToOne: false
            referencedRelation: "gtm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_settings: {
        Row: {
          amplitude_api_key: string | null
          amplitude_enabled: boolean
          aws_access_key_id: string | null
          aws_bucket_name: string | null
          aws_s3_enabled: boolean
          aws_secret_access_key: string | null
          cloudinary_api_key: string | null
          cloudinary_api_secret: string | null
          cloudinary_cloud_name: string | null
          cloudinary_enabled: boolean
          created_at: string
          facebook_app_id: string | null
          facebook_app_secret: string | null
          facebook_enabled: boolean
          google_analytics_enabled: boolean
          google_analytics_id: string | null
          id: string
          image_recognition_api_key: string | null
          image_recognition_enabled: boolean
          instagram_client_id: string | null
          instagram_client_secret: string | null
          instagram_enabled: boolean
          mixpanel_enabled: boolean
          mixpanel_token: string | null
          moderation_api_enabled: boolean
          moderation_api_key: string | null
          openai_api_key: string | null
          openai_enabled: boolean
          paypal_client_id: string | null
          paypal_client_secret: string | null
          paypal_enabled: boolean
          sendgrid_api_key: string | null
          sendgrid_enabled: boolean
          slack_enabled: boolean
          slack_webhook_url: string | null
          stripe_enabled: boolean
          stripe_publishable_key: string | null
          stripe_secret_key: string | null
          tiktok_client_key: string | null
          tiktok_client_secret: string | null
          tiktok_enabled: boolean
          twilio_account_sid: string | null
          twilio_auth_token: string | null
          twilio_enabled: boolean
          twitter_api_key: string | null
          twitter_api_secret: string | null
          twitter_enabled: boolean
          updated_at: string
          youtube_api_key: string | null
          youtube_enabled: boolean
        }
        Insert: {
          amplitude_api_key?: string | null
          amplitude_enabled?: boolean
          aws_access_key_id?: string | null
          aws_bucket_name?: string | null
          aws_s3_enabled?: boolean
          aws_secret_access_key?: string | null
          cloudinary_api_key?: string | null
          cloudinary_api_secret?: string | null
          cloudinary_cloud_name?: string | null
          cloudinary_enabled?: boolean
          created_at?: string
          facebook_app_id?: string | null
          facebook_app_secret?: string | null
          facebook_enabled?: boolean
          google_analytics_enabled?: boolean
          google_analytics_id?: string | null
          id?: string
          image_recognition_api_key?: string | null
          image_recognition_enabled?: boolean
          instagram_client_id?: string | null
          instagram_client_secret?: string | null
          instagram_enabled?: boolean
          mixpanel_enabled?: boolean
          mixpanel_token?: string | null
          moderation_api_enabled?: boolean
          moderation_api_key?: string | null
          openai_api_key?: string | null
          openai_enabled?: boolean
          paypal_client_id?: string | null
          paypal_client_secret?: string | null
          paypal_enabled?: boolean
          sendgrid_api_key?: string | null
          sendgrid_enabled?: boolean
          slack_enabled?: boolean
          slack_webhook_url?: string | null
          stripe_enabled?: boolean
          stripe_publishable_key?: string | null
          stripe_secret_key?: string | null
          tiktok_client_key?: string | null
          tiktok_client_secret?: string | null
          tiktok_enabled?: boolean
          twilio_account_sid?: string | null
          twilio_auth_token?: string | null
          twilio_enabled?: boolean
          twitter_api_key?: string | null
          twitter_api_secret?: string | null
          twitter_enabled?: boolean
          updated_at?: string
          youtube_api_key?: string | null
          youtube_enabled?: boolean
        }
        Update: {
          amplitude_api_key?: string | null
          amplitude_enabled?: boolean
          aws_access_key_id?: string | null
          aws_bucket_name?: string | null
          aws_s3_enabled?: boolean
          aws_secret_access_key?: string | null
          cloudinary_api_key?: string | null
          cloudinary_api_secret?: string | null
          cloudinary_cloud_name?: string | null
          cloudinary_enabled?: boolean
          created_at?: string
          facebook_app_id?: string | null
          facebook_app_secret?: string | null
          facebook_enabled?: boolean
          google_analytics_enabled?: boolean
          google_analytics_id?: string | null
          id?: string
          image_recognition_api_key?: string | null
          image_recognition_enabled?: boolean
          instagram_client_id?: string | null
          instagram_client_secret?: string | null
          instagram_enabled?: boolean
          mixpanel_enabled?: boolean
          mixpanel_token?: string | null
          moderation_api_enabled?: boolean
          moderation_api_key?: string | null
          openai_api_key?: string | null
          openai_enabled?: boolean
          paypal_client_id?: string | null
          paypal_client_secret?: string | null
          paypal_enabled?: boolean
          sendgrid_api_key?: string | null
          sendgrid_enabled?: boolean
          slack_enabled?: boolean
          slack_webhook_url?: string | null
          stripe_enabled?: boolean
          stripe_publishable_key?: string | null
          stripe_secret_key?: string | null
          tiktok_client_key?: string | null
          tiktok_client_secret?: string | null
          tiktok_enabled?: boolean
          twilio_account_sid?: string | null
          twilio_auth_token?: string | null
          twilio_enabled?: boolean
          twitter_api_key?: string | null
          twitter_api_secret?: string | null
          twitter_enabled?: boolean
          updated_at?: string
          youtube_api_key?: string | null
          youtube_enabled?: boolean
        }
        Relationships: []
      }
      landing_waitlist: {
        Row: {
          created_at: string
          current_content_gap: string | null
          email: string
          full_name: string | null
          id: string
          newsletter_opt_in: boolean
          playing_level: string | null
          school: string | null
          source: string
          sport: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_content_gap?: string | null
          email: string
          full_name?: string | null
          id?: string
          newsletter_opt_in?: boolean
          playing_level?: string | null
          school?: string | null
          source?: string
          sport?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_content_gap?: string | null
          email?: string
          full_name?: string | null
          id?: string
          newsletter_opt_in?: boolean
          playing_level?: string | null
          school?: string | null
          source?: string
          sport?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      locker_access_grants: {
        Row: {
          access_code: string
          created_at: string | null
          expires_at: string | null
          granted_to_email: string | null
          id: string
          is_active: boolean
          label: string | null
          last_used_at: string | null
          player_id: string
        }
        Insert: {
          access_code?: string
          created_at?: string | null
          expires_at?: string | null
          granted_to_email?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          last_used_at?: string | null
          player_id: string
        }
        Update: {
          access_code?: string
          created_at?: string | null
          expires_at?: string | null
          granted_to_email?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          last_used_at?: string | null
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "locker_access_grants_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          competition_level: string | null
          content_context: string | null
          created_at: string | null
          credits: string | null
          display_order: number | null
          height: number | null
          id: string
          kind: string
          license_checked_at: string | null
          license_checked_by: string | null
          license_kind: string | null
          license_request_last_error: string | null
          license_request_recipient_email: string | null
          license_request_recipient_name: string | null
          license_request_sent_at: string | null
          license_request_status: string
          license_requested_by: string | null
          license_status: string
          player_id: string
          provenance: Database["public"]["Enums"]["media_provenance"]
          public_locker_approved: boolean
          rights_holder: string | null
          source_url: string | null
          title: string | null
          url: string
          usage_terms: string | null
          width: number | null
        }
        Insert: {
          competition_level?: string | null
          content_context?: string | null
          created_at?: string | null
          credits?: string | null
          display_order?: number | null
          height?: number | null
          id?: string
          kind?: string
          license_checked_at?: string | null
          license_checked_by?: string | null
          license_kind?: string | null
          license_request_last_error?: string | null
          license_request_recipient_email?: string | null
          license_request_recipient_name?: string | null
          license_request_sent_at?: string | null
          license_request_status?: string
          license_requested_by?: string | null
          license_status?: string
          player_id: string
          provenance?: Database["public"]["Enums"]["media_provenance"]
          public_locker_approved?: boolean
          rights_holder?: string | null
          source_url?: string | null
          title?: string | null
          url: string
          usage_terms?: string | null
          width?: number | null
        }
        Update: {
          competition_level?: string | null
          content_context?: string | null
          created_at?: string | null
          credits?: string | null
          display_order?: number | null
          height?: number | null
          id?: string
          kind?: string
          license_checked_at?: string | null
          license_checked_by?: string | null
          license_kind?: string | null
          license_request_last_error?: string | null
          license_request_recipient_email?: string | null
          license_request_recipient_name?: string | null
          license_request_sent_at?: string | null
          license_request_status?: string
          license_requested_by?: string | null
          license_status?: string
          player_id?: string
          provenance?: Database["public"]["Enums"]["media_provenance"]
          public_locker_approved?: boolean
          rights_holder?: string | null
          source_url?: string | null
          title?: string | null
          url?: string
          usage_terms?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      message_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          height: number | null
          id: string
          is_compressed: boolean
          message_id: string
          mime_type: string
          original_size: number | null
          thumbnail_path: string | null
          width: number | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          file_type?: string
          height?: number | null
          id?: string
          is_compressed?: boolean
          message_id: string
          mime_type: string
          original_size?: number | null
          thumbnail_path?: string | null
          width?: number | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          height?: number | null
          id?: string
          is_compressed?: boolean
          message_id?: string
          mime_type?: string
          original_size?: number | null
          thumbnail_path?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_threads: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          message_type: string
          priority: string
          read_at: string | null
          recipient_id: string
          sender_id: string
          status: string
          subject: string
          thread_id: string | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string
          priority?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
          status?: string
          subject: string
          thread_id?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string
          priority?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
          status?: string
          subject?: string
          thread_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_recipient_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_thread_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      nfl_players: {
        Row: {
          birth_date: string | null
          college_conference: string | null
          college_name: string | null
          display_name: string
          draft_pick: number | null
          draft_round: number | null
          draft_team: string | null
          draft_year: number | null
          espn_id: string | null
          first_name: string | null
          gsis_id: string
          headshot_url: string | null
          height_in: number | null
          jersey_number: number | null
          last_name: string | null
          last_season: number | null
          last_synced_at: string
          latest_team: string | null
          nfl_id: string | null
          pff_id: string | null
          pfr_id: string | null
          position: string | null
          position_group: string | null
          rookie_season: number | null
          smart_id: string | null
          status: string | null
          weight_lbs: number | null
          years_of_experience: number | null
        }
        Insert: {
          birth_date?: string | null
          college_conference?: string | null
          college_name?: string | null
          display_name: string
          draft_pick?: number | null
          draft_round?: number | null
          draft_team?: string | null
          draft_year?: number | null
          espn_id?: string | null
          first_name?: string | null
          gsis_id: string
          headshot_url?: string | null
          height_in?: number | null
          jersey_number?: number | null
          last_name?: string | null
          last_season?: number | null
          last_synced_at?: string
          latest_team?: string | null
          nfl_id?: string | null
          pff_id?: string | null
          pfr_id?: string | null
          position?: string | null
          position_group?: string | null
          rookie_season?: number | null
          smart_id?: string | null
          status?: string | null
          weight_lbs?: number | null
          years_of_experience?: number | null
        }
        Update: {
          birth_date?: string | null
          college_conference?: string | null
          college_name?: string | null
          display_name?: string
          draft_pick?: number | null
          draft_round?: number | null
          draft_team?: string | null
          draft_year?: number | null
          espn_id?: string | null
          first_name?: string | null
          gsis_id?: string
          headshot_url?: string | null
          height_in?: number | null
          jersey_number?: number | null
          last_name?: string | null
          last_season?: number | null
          last_synced_at?: string
          latest_team?: string | null
          nfl_id?: string | null
          pff_id?: string | null
          pfr_id?: string | null
          position?: string | null
          position_group?: string | null
          rookie_season?: number | null
          smart_id?: string | null
          status?: string | null
          weight_lbs?: number | null
          years_of_experience?: number | null
        }
        Relationships: []
      }
      onboarding_pipeline_runs: {
        Row: {
          claim_player_id: string | null
          claim_token: string | null
          completed_at: string | null
          draft: Json
          error: string | null
          events: Json
          id: string
          identity: Json
          player_id: string | null
          started_at: string | null
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          claim_player_id?: string | null
          claim_token?: string | null
          completed_at?: string | null
          draft?: Json
          error?: string | null
          events?: Json
          id?: string
          identity?: Json
          player_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          claim_player_id?: string | null
          claim_token?: string | null
          completed_at?: string | null
          draft?: Json
          error?: string | null
          events?: Json
          id?: string
          identity?: Json
          player_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_pipeline_runs_claim_player_id_fkey"
            columns: ["claim_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_pipeline_runs_claim_token_fkey"
            columns: ["claim_token"]
            isOneToOne: false
            referencedRelation: "claim_tokens"
            referencedColumns: ["token"]
          },
          {
            foreignKeyName: "onboarding_pipeline_runs_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          role: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          organization_type: string
          school_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          organization_type: string
          school_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          organization_type?: string
          school_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_revenue: {
        Row: {
          amount: number
          calculation_date: string | null
          created_at: string | null
          id: string
          percentage: number
          video_id: string
        }
        Insert: {
          amount?: number
          calculation_date?: string | null
          created_at?: string | null
          id?: string
          percentage?: number
          video_id: string
        }
        Update: {
          amount?: number
          calculation_date?: string | null
          created_at?: string | null
          id?: string
          percentage?: number
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_revenue_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_role_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          assignment_reason: string
          id: string
          revocation_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          role: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          assignment_reason: string
          id?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          assignment_reason?: string
          id?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      player_achievements: {
        Row: {
          achievement_id: string
          created_at: string | null
          id: string
          is_unlocked: boolean | null
          player_id: string
          progress: Json | null
          unlocked_at: string | null
          updated_at: string | null
        }
        Insert: {
          achievement_id: string
          created_at?: string | null
          id?: string
          is_unlocked?: boolean | null
          player_id: string
          progress?: Json | null
          unlocked_at?: string | null
          updated_at?: string | null
        }
        Update: {
          achievement_id?: string
          created_at?: string | null
          id?: string
          is_unlocked?: boolean | null
          player_id?: string
          progress?: Json | null
          unlocked_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_achievements_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_awards: {
        Row: {
          ai_discovered: boolean | null
          category: string
          confidence_score: number | null
          created_at: string | null
          description: string
          id: string
          image_url: string | null
          name: string
          organization: string
          player_id: string
          significance: string
          source_url: string | null
          updated_at: string | null
          verified: boolean | null
          year: number
        }
        Insert: {
          ai_discovered?: boolean | null
          category: string
          confidence_score?: number | null
          created_at?: string | null
          description: string
          id?: string
          image_url?: string | null
          name: string
          organization: string
          player_id: string
          significance: string
          source_url?: string | null
          updated_at?: string | null
          verified?: boolean | null
          year: number
        }
        Update: {
          ai_discovered?: boolean | null
          category?: string
          confidence_score?: number | null
          created_at?: string | null
          description?: string
          id?: string
          image_url?: string | null
          name?: string
          organization?: string
          player_id?: string
          significance?: string
          source_url?: string | null
          updated_at?: string | null
          verified?: boolean | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_awards_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_earnings: {
        Row: {
          created_at: string | null
          earnings_from_own_videos: number
          earnings_from_team_pool: number
          id: string
          last_calculated_at: string | null
          player_id: string
          total_earnings: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          earnings_from_own_videos?: number
          earnings_from_team_pool?: number
          id?: string
          last_calculated_at?: string | null
          player_id: string
          total_earnings?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          earnings_from_own_videos?: number
          earnings_from_team_pool?: number
          id?: string
          last_calculated_at?: string | null
          player_id?: string
          total_earnings?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_earnings_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_follows: {
        Row: {
          created_at: string
          id: string
          player_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          player_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          player_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_follows_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_lockers: {
        Row: {
          ai_last_refreshed_at: string | null
          bio: string | null
          colors: Json | null
          created_at: string | null
          headline: string | null
          id: string
          media_counts: Json | null
          owner_user_id: string | null
          player_id: string
          quote_author: string | null
          quote_text: string | null
          social: Json | null
          stats: Json | null
          updated_at: string | null
        }
        Insert: {
          ai_last_refreshed_at?: string | null
          bio?: string | null
          colors?: Json | null
          created_at?: string | null
          headline?: string | null
          id?: string
          media_counts?: Json | null
          owner_user_id?: string | null
          player_id: string
          quote_author?: string | null
          quote_text?: string | null
          social?: Json | null
          stats?: Json | null
          updated_at?: string | null
        }
        Update: {
          ai_last_refreshed_at?: string | null
          bio?: string | null
          colors?: Json | null
          created_at?: string | null
          headline?: string | null
          id?: string
          media_counts?: Json | null
          owner_user_id?: string | null
          player_id?: string
          quote_author?: string | null
          quote_text?: string | null
          social?: Json | null
          stats?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_lockers_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_season_stats: {
        Row: {
          id: number
          last_synced_at: string
          level: string
          player_id: string
          season: number
          season_type: string
          source: string
          stats: Json
          team: string | null
        }
        Insert: {
          id?: number
          last_synced_at?: string
          level: string
          player_id: string
          season: number
          season_type?: string
          source: string
          stats?: Json
          team?: string | null
        }
        Update: {
          id?: number
          last_synced_at?: string
          level?: string
          player_id?: string
          season?: number
          season_type?: string
          source?: string
          stats?: Json
          team?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_season_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_spotify_tokens: {
        Row: {
          access_token: string
          created_at: string
          display_name: string | null
          expires_at: string
          player_id: string
          refresh_token: string
          scope: string | null
          spotify_user_id: string | null
          token_type: string
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          display_name?: string | null
          expires_at: string
          player_id: string
          refresh_token: string
          scope?: string | null
          spotify_user_id?: string | null
          token_type?: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          display_name?: string | null
          expires_at?: string
          player_id?: string
          refresh_token?: string
          scope?: string | null
          spotify_user_id?: string | null
          token_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_spotify_tokens_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_teammates: {
        Row: {
          created_at: string | null
          games_played_together: number | null
          id: string
          last_played_together: string | null
          player_id: string
          teammate_player_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          games_played_together?: number | null
          id?: string
          last_played_together?: string | null
          player_id: string
          teammate_player_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          games_played_together?: number | null
          id?: string
          last_played_together?: string | null
          player_id?: string
          teammate_player_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_teammates_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_teammates_teammate_player_id_fkey"
            columns: ["teammate_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          bio: string | null
          cfb_team_id: string | null
          college: string[] | null
          confirmed_fields: Json | null
          created_at: string
          current_status: string | null
          display_name: string | null
          dob: string | null
          earnings: number | null
          full_name: string | null
          games_played: number | null
          gsis_id: string | null
          headshot_url: string | null
          height_in: number | null
          highlight_url: string | null
          hometown: string | null
          id: string
          image_url: string | null
          is_premium: boolean | null
          is_public: boolean | null
          is_verified: boolean | null
          level: string | null
          mentorship_opt_in: boolean | null
          name: string
          position: string | null
          profile_image: string | null
          school: string | null
          school_id: string | null
          slug: string
          spotify_url: string | null
          stripe_account_id: string | null
          team: string | null
          team_id: string | null
          theme_color: string | null
          theme_primary: string | null
          theme_secondary: string | null
          updated_at: string
          user_id: string | null
          username: string | null
          video_url: string | null
          view_count: number | null
          visibility: boolean | null
          weight_lbs: number | null
          youtube_urls: string[] | null
        }
        Insert: {
          bio?: string | null
          cfb_team_id?: string | null
          college?: string[] | null
          confirmed_fields?: Json | null
          created_at?: string
          current_status?: string | null
          display_name?: string | null
          dob?: string | null
          earnings?: number | null
          full_name?: string | null
          games_played?: number | null
          gsis_id?: string | null
          headshot_url?: string | null
          height_in?: number | null
          highlight_url?: string | null
          hometown?: string | null
          id?: string
          image_url?: string | null
          is_premium?: boolean | null
          is_public?: boolean | null
          is_verified?: boolean | null
          level?: string | null
          mentorship_opt_in?: boolean | null
          name: string
          position?: string | null
          profile_image?: string | null
          school?: string | null
          school_id?: string | null
          slug: string
          spotify_url?: string | null
          stripe_account_id?: string | null
          team?: string | null
          team_id?: string | null
          theme_color?: string | null
          theme_primary?: string | null
          theme_secondary?: string | null
          updated_at?: string
          user_id?: string | null
          username?: string | null
          video_url?: string | null
          view_count?: number | null
          visibility?: boolean | null
          weight_lbs?: number | null
          youtube_urls?: string[] | null
        }
        Update: {
          bio?: string | null
          cfb_team_id?: string | null
          college?: string[] | null
          confirmed_fields?: Json | null
          created_at?: string
          current_status?: string | null
          display_name?: string | null
          dob?: string | null
          earnings?: number | null
          full_name?: string | null
          games_played?: number | null
          gsis_id?: string | null
          headshot_url?: string | null
          height_in?: number | null
          highlight_url?: string | null
          hometown?: string | null
          id?: string
          image_url?: string | null
          is_premium?: boolean | null
          is_public?: boolean | null
          is_verified?: boolean | null
          level?: string | null
          mentorship_opt_in?: boolean | null
          name?: string
          position?: string | null
          profile_image?: string | null
          school?: string | null
          school_id?: string | null
          slug?: string
          spotify_url?: string | null
          stripe_account_id?: string | null
          team?: string | null
          team_id?: string | null
          theme_color?: string | null
          theme_primary?: string | null
          theme_secondary?: string | null
          updated_at?: string
          user_id?: string | null
          username?: string | null
          video_url?: string | null
          view_count?: number | null
          visibility?: boolean | null
          weight_lbs?: number | null
          youtube_urls?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "players_cfb_team_id_fkey"
            columns: ["cfb_team_id"]
            isOneToOne: false
            referencedRelation: "cfb_teams"
            referencedColumns: ["espn_id"]
          },
          {
            foreignKeyName: "players_gsis_id_fkey"
            columns: ["gsis_id"]
            isOneToOne: false
            referencedRelation: "nfl_players"
            referencedColumns: ["gsis_id"]
          },
          {
            foreignKeyName: "players_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          player_id: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          player_id?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          player_id?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      publisher_revenue: {
        Row: {
          amount: number
          calculation_date: string | null
          created_at: string | null
          id: string
          percentage: number
          player_id: string
          publisher_name: string
          publisher_type: string
          video_id: string
        }
        Insert: {
          amount?: number
          calculation_date?: string | null
          created_at?: string | null
          id?: string
          percentage?: number
          player_id: string
          publisher_name: string
          publisher_type: string
          video_id: string
        }
        Update: {
          amount?: number
          calculation_date?: string | null
          created_at?: string | null
          id?: string
          percentage?: number
          player_id?: string
          publisher_name?: string
          publisher_type?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publisher_revenue_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publisher_revenue_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_distributions: {
        Row: {
          amount: number
          calculation_date: string | null
          created_at: string | null
          distribution_type: string
          id: string
          recipient_player_id: string
          source_player_id: string
          video_id: string
        }
        Insert: {
          amount?: number
          calculation_date?: string | null
          created_at?: string | null
          distribution_type: string
          id?: string
          recipient_player_id: string
          source_player_id: string
          video_id: string
        }
        Update: {
          amount?: number
          calculation_date?: string | null
          created_at?: string | null
          distribution_type?: string
          id?: string
          recipient_player_id?: string
          source_player_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_distributions_recipient_player_id_fkey"
            columns: ["recipient_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_distributions_source_player_id_fkey"
            columns: ["source_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_distributions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          city: string | null
          created_at: string | null
          id: string
          logo_url: string | null
          meta: Json | null
          name: string
          slug: string
          state: string | null
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          meta?: Json | null
          name: string
          slug: string
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          meta?: Json | null
          name?: string
          slug?: string
          state?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      seasons: {
        Row: {
          created_at: string
          created_by: string | null
          ends_on: string
          id: string
          organization_id: string
          season_code: string
          sport: string
          starts_on: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_on: string
          id?: string
          organization_id: string
          season_code: string
          sport: string
          starts_on: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_on?: string
          id?: string
          organization_id?: string
          season_code?: string
          sport?: string
          starts_on?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      security_settings: {
        Row: {
          allowed_ips: string[] | null
          api_key_required: boolean
          api_rate_limit: number
          audit_logging: boolean
          cors_enabled: boolean
          cors_origins: string
          created_at: string
          csrf_protection: boolean
          file_upload_security: boolean
          id: string
          ip_whitelist_enabled: boolean
          lockout_duration: number
          max_login_attempts: number
          password_expiry_days: number
          password_min_length: number
          rate_limit_requests: number
          rate_limit_window: number
          rate_limiting_enabled: boolean
          require_https: boolean
          require_strong_password: boolean
          security_headers: boolean
          session_timeout: number
          sql_injection_protection: boolean
          two_factor_required: boolean
          two_factor_required_for_admins: boolean
          updated_at: string
          xss_protection: boolean
        }
        Insert: {
          allowed_ips?: string[] | null
          api_key_required?: boolean
          api_rate_limit?: number
          audit_logging?: boolean
          cors_enabled?: boolean
          cors_origins?: string
          created_at?: string
          csrf_protection?: boolean
          file_upload_security?: boolean
          id?: string
          ip_whitelist_enabled?: boolean
          lockout_duration?: number
          max_login_attempts?: number
          password_expiry_days?: number
          password_min_length?: number
          rate_limit_requests?: number
          rate_limit_window?: number
          rate_limiting_enabled?: boolean
          require_https?: boolean
          require_strong_password?: boolean
          security_headers?: boolean
          session_timeout?: number
          sql_injection_protection?: boolean
          two_factor_required?: boolean
          two_factor_required_for_admins?: boolean
          updated_at?: string
          xss_protection?: boolean
        }
        Update: {
          allowed_ips?: string[] | null
          api_key_required?: boolean
          api_rate_limit?: number
          audit_logging?: boolean
          cors_enabled?: boolean
          cors_origins?: string
          created_at?: string
          csrf_protection?: boolean
          file_upload_security?: boolean
          id?: string
          ip_whitelist_enabled?: boolean
          lockout_duration?: number
          max_login_attempts?: number
          password_expiry_days?: number
          password_min_length?: number
          rate_limit_requests?: number
          rate_limit_window?: number
          rate_limiting_enabled?: boolean
          require_https?: boolean
          require_strong_password?: boolean
          security_headers?: boolean
          session_timeout?: number
          sql_injection_protection?: boolean
          two_factor_required?: boolean
          two_factor_required_for_admins?: boolean
          updated_at?: string
          xss_protection?: boolean
        }
        Relationships: []
      }
      site_configuration: {
        Row: {
          allowed_file_types: string[]
          created_at: string
          default_user_role: string
          id: string
          language: string
          maintenance_mode: boolean
          max_file_size: number
          public_registration: boolean
          registration_enabled: boolean
          site_description: string | null
          site_name: string
          site_url: string
          theme: string
          timezone: string
          updated_at: string
        }
        Insert: {
          allowed_file_types?: string[]
          created_at?: string
          default_user_role?: string
          id?: string
          language?: string
          maintenance_mode?: boolean
          max_file_size?: number
          public_registration?: boolean
          registration_enabled?: boolean
          site_description?: string | null
          site_name?: string
          site_url?: string
          theme?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          allowed_file_types?: string[]
          created_at?: string
          default_user_role?: string
          id?: string
          language?: string
          maintenance_mode?: boolean
          max_file_size?: number
          public_registration?: boolean
          registration_enabled?: boolean
          site_description?: string | null
          site_name?: string
          site_url?: string
          theme?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      sports_event_athletes: {
        Row: {
          athlete_team_season_id: string | null
          created_at: string
          created_by: string | null
          event_id: string
          id: string
          organization_id: string
          participation_role: string
          player_id: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          athlete_team_season_id?: string | null
          created_at?: string
          created_by?: string | null
          event_id: string
          id?: string
          organization_id: string
          participation_role?: string
          player_id: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          athlete_team_season_id?: string | null
          created_at?: string
          created_by?: string | null
          event_id?: string
          id?: string
          organization_id?: string
          participation_role?: string
          player_id?: string
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sports_event_athletes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "sports_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sports_event_athletes_event_team_fkey"
            columns: ["event_id", "organization_id", "team_id"]
            isOneToOne: false
            referencedRelation: "sports_event_teams"
            referencedColumns: ["event_id", "organization_id", "team_id"]
          },
          {
            foreignKeyName: "sports_event_athletes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sports_event_athletes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sports_event_athletes_roster_stint_fkey"
            columns: ["organization_id", "player_id", "athlete_team_season_id"]
            isOneToOne: false
            referencedRelation: "athlete_team_seasons"
            referencedColumns: ["organization_id", "player_id", "id"]
          },
        ]
      }
      sports_event_teams: {
        Row: {
          created_at: string
          created_by: string | null
          event_id: string
          id: string
          organization_id: string
          participation_role: string
          team_id: string
          team_season_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_id: string
          id?: string
          organization_id: string
          participation_role?: string
          team_id: string
          team_season_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_id?: string
          id?: string
          organization_id?: string
          participation_role?: string
          team_id?: string
          team_season_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sports_event_teams_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "sports_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sports_event_teams_team_fkey"
            columns: ["organization_id", "team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "sports_event_teams_team_season_fkey"
            columns: ["organization_id", "team_season_id", "team_id"]
            isOneToOne: false
            referencedRelation: "team_seasons"
            referencedColumns: ["organization_id", "id", "team_id"]
          },
        ]
      }
      sports_events: {
        Row: {
          created_at: string
          created_by: string | null
          ends_at: string | null
          event_type: string
          id: string
          name: string
          sport: string
          starts_at: string
          status: string
          steward_organization_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          event_type: string
          id?: string
          name: string
          sport: string
          starts_at: string
          status?: string
          steward_organization_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          event_type?: string
          id?: string
          name?: string
          sport?: string
          starts_at?: string
          status?: string
          steward_organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sports_events_steward_organization_id_fkey"
            columns: ["steward_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          analytics_enabled: boolean
          backup_enabled: boolean
          backup_frequency: string
          backup_retention: number
          cache_enabled: boolean
          cache_ttl: number
          cdn_enabled: boolean
          cdn_url: string | null
          compression_enabled: boolean
          created_at: string
          database_pool_size: number
          debug_mode: boolean
          error_tracking: boolean
          id: string
          image_optimization: boolean
          log_level: string
          maintenance_mode: boolean
          max_concurrent_uploads: number
          max_connections: number
          max_upload_size: number
          monitoring_enabled: boolean
          performance_monitoring: boolean
          thumbnail_generation: boolean
          updated_at: string
          video_processing: boolean
        }
        Insert: {
          analytics_enabled?: boolean
          backup_enabled?: boolean
          backup_frequency?: string
          backup_retention?: number
          cache_enabled?: boolean
          cache_ttl?: number
          cdn_enabled?: boolean
          cdn_url?: string | null
          compression_enabled?: boolean
          created_at?: string
          database_pool_size?: number
          debug_mode?: boolean
          error_tracking?: boolean
          id?: string
          image_optimization?: boolean
          log_level?: string
          maintenance_mode?: boolean
          max_concurrent_uploads?: number
          max_connections?: number
          max_upload_size?: number
          monitoring_enabled?: boolean
          performance_monitoring?: boolean
          thumbnail_generation?: boolean
          updated_at?: string
          video_processing?: boolean
        }
        Update: {
          analytics_enabled?: boolean
          backup_enabled?: boolean
          backup_frequency?: string
          backup_retention?: number
          cache_enabled?: boolean
          cache_ttl?: number
          cdn_enabled?: boolean
          cdn_url?: string | null
          compression_enabled?: boolean
          created_at?: string
          database_pool_size?: number
          debug_mode?: boolean
          error_tracking?: boolean
          id?: string
          image_optimization?: boolean
          log_level?: string
          maintenance_mode?: boolean
          max_concurrent_uploads?: number
          max_connections?: number
          max_upload_size?: number
          monitoring_enabled?: boolean
          performance_monitoring?: boolean
          thumbnail_generation?: boolean
          updated_at?: string
          video_processing?: boolean
        }
        Relationships: []
      }
      team_invites: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          invite_code: string
          invitee_email: string
          invitee_name: string | null
          inviter_player_id: string | null
          inviter_user_id: string
          message: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invite_code?: string
          invitee_email: string
          invitee_name?: string | null
          inviter_player_id?: string | null
          inviter_user_id: string
          message?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invite_code?: string
          invitee_email?: string
          invitee_name?: string | null
          inviter_player_id?: string | null
          inviter_user_id?: string
          message?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_invites_inviter_player_id_fkey"
            columns: ["inviter_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      team_seasons: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          season_id: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          season_id: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          season_id?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_seasons_season_fkey"
            columns: ["organization_id", "season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "team_seasons_team_fkey"
            columns: ["organization_id", "team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          id: string
          logo_url: string | null
          meta: Json | null
          name: string
          organization_id: string | null
          school_id: string | null
          slug: string
          sport: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          meta?: Json | null
          name: string
          organization_id?: string | null
          school_id?: string | null
          slug: string
          sport?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          meta?: Json | null
          name?: string
          organization_id?: string | null
          school_id?: string | null
          slug?: string
          sport?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      traffic_sources: {
        Row: {
          created_at: string | null
          id: string
          referrer_url: string | null
          source: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          referrer_url?: string | null
          source?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          referrer_url?: string | null
          source?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      user_activity: {
        Row: {
          activity_type: string
          created_at: string | null
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_devices: {
        Row: {
          browser: string | null
          created_at: string | null
          device_type: string | null
          id: string
          last_used_at: string | null
          os: string | null
          user_id: string | null
        }
        Insert: {
          browser?: string | null
          created_at?: string | null
          device_type?: string | null
          id?: string
          last_used_at?: string | null
          os?: string | null
          user_id?: string | null
        }
        Update: {
          browser?: string | null
          created_at?: string | null
          device_type?: string | null
          id?: string
          last_used_at?: string | null
          os?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_locations: {
        Row: {
          city: string | null
          country: string | null
          created_at: string | null
          id: string
          ip_address: unknown
          state: string | null
          timezone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          state?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          state?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_management_settings: {
        Row: {
          allow_profile_customization: boolean
          allow_username_changes: boolean
          auto_approve_verified_users: boolean
          bio_max_length: number
          created_at: string
          enable_two_factor: boolean
          id: string
          lockout_duration: number
          max_login_attempts: number
          max_username_length: number
          min_password_length: number
          profile_picture_required: boolean
          require_email_verification: boolean
          require_strong_password: boolean
          require_two_factor_for_admins: boolean
          session_timeout: number
          updated_at: string
          user_registration_approval: boolean
        }
        Insert: {
          allow_profile_customization?: boolean
          allow_username_changes?: boolean
          auto_approve_verified_users?: boolean
          bio_max_length?: number
          created_at?: string
          enable_two_factor?: boolean
          id?: string
          lockout_duration?: number
          max_login_attempts?: number
          max_username_length?: number
          min_password_length?: number
          profile_picture_required?: boolean
          require_email_verification?: boolean
          require_strong_password?: boolean
          require_two_factor_for_admins?: boolean
          session_timeout?: number
          updated_at?: string
          user_registration_approval?: boolean
        }
        Update: {
          allow_profile_customization?: boolean
          allow_username_changes?: boolean
          auto_approve_verified_users?: boolean
          bio_max_length?: number
          created_at?: string
          enable_two_factor?: boolean
          id?: string
          lockout_duration?: number
          max_login_attempts?: number
          max_username_length?: number
          min_password_length?: number
          profile_picture_required?: boolean
          require_email_verification?: boolean
          require_strong_password?: boolean
          require_two_factor_for_admins?: boolean
          session_timeout?: number
          updated_at?: string
          user_registration_approval?: boolean
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string | null
          id: string
          instagram_handle: string | null
          linkedin_handle: string | null
          tiktok_handle: string | null
          twitter_handle: string | null
          updated_at: string | null
          user_id: string
          youtube_handle: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          instagram_handle?: string | null
          linkedin_handle?: string | null
          tiktok_handle?: string | null
          twitter_handle?: string | null
          updated_at?: string | null
          user_id: string
          youtube_handle?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          instagram_handle?: string | null
          linkedin_handle?: string | null
          tiktok_handle?: string | null
          twitter_handle?: string | null
          updated_at?: string | null
          user_id?: string
          youtube_handle?: string | null
        }
        Relationships: []
      }
      video_engagement: {
        Row: {
          created_at: string | null
          engagement_type: string
          id: string
          metadata: Json | null
          user_id: string | null
          video_id: string | null
        }
        Insert: {
          created_at?: string | null
          engagement_type: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
          video_id?: string | null
        }
        Update: {
          created_at?: string | null
          engagement_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_engagement_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_tags: {
        Row: {
          created_at: string | null
          id: string
          tagged_player_id: string
          video_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          tagged_player_id: string
          video_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          tagged_player_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_tags_tagged_player_id_fkey"
            columns: ["tagged_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_tags_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          created_at: string | null
          description: string | null
          duration_seconds: number | null
          id: string
          meta: Json | null
          owner_user_id: string | null
          playback_url: string | null
          player_id: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          visibility: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          meta?: Json | null
          owner_user_id?: string | null
          playback_url?: string | null
          player_id?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          visibility?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          meta?: Json | null
          owner_user_id?: string | null
          playback_url?: string | null
          player_id?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      views: {
        Row: {
          created_at: string | null
          id: number
          player_id: string | null
          seconds_watched: number | null
          user_id: string | null
          video_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          player_id?: string | null
          seconds_watched?: number | null
          user_id?: string | null
          video_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          player_id?: string | null
          seconds_watched?: number | null
          user_id?: string | null
          video_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      append_pipeline_event: {
        Args: { p_event: Json; p_run_id: string }
        Returns: undefined
      }
      claim_pipeline_run: {
        Args: { p_reclaim_seconds: number; p_run_id: string }
        Returns: Json
      }
      consume_analytics_rate_limit: {
        Args: { p_key_hash: string; p_limit: number; p_window_seconds?: number }
        Returns: boolean
      }
      create_gtm_contact: {
        Args: {
          p_contact_type?: string
          p_current_company?: string
          p_current_title?: string
          p_display_name: string
          p_do_not_automate?: boolean
          p_email?: string
          p_first_name?: string
          p_last_name?: string
          p_league_level?: string
          p_linkedin_url?: string
          p_player_id?: string
          p_sport?: string
        }
        Returns: {
          archived: boolean
          bltz_relevance: number | null
          buying_authority: number | null
          contact_type: string
          created_at: string
          created_by: string
          current_company: string | null
          current_title: string | null
          display_name: string
          do_not_automate: boolean
          email: string | null
          first_name: string | null
          future_trigger: string | null
          geography: string | null
          historical_signal: string | null
          id: string
          introduction_potential: number | null
          investor_relationship_stage: string | null
          investor_thesis_feedback: string | null
          investor_type: string | null
          is_priority: boolean
          last_interaction_at: string | null
          last_name: string | null
          league_level: string | null
          linkedin_connected_on: string | null
          linkedin_url: string | null
          network_leverage: number | null
          next_action: string | null
          next_action_at: string | null
          next_trigger: string | null
          organization_id: string | null
          phone: string | null
          pipeline_stage: string
          prior_outcome: string | null
          priority_model: string | null
          priority_score: number | null
          priority_tier: string | null
          relationship_source: string | null
          relationship_strength: number | null
          segment: string | null
          source: string | null
          source_record_id: string | null
          sport: string | null
          timing_score: number | null
          updated_at: string
          updated_by: string | null
          what_they_need_to_see: string | null
        }
        SetofOptions: {
          from: "*"
          to: "gtm_contacts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_gtm_contact_v2: {
        Args: {
          p_contact_type?: string
          p_current_company?: string
          p_current_title?: string
          p_display_name: string
          p_do_not_automate?: boolean
          p_email?: string
          p_first_name?: string
          p_future_trigger?: string
          p_historical_signal?: string
          p_investor_relationship_stage?: string
          p_investor_thesis_feedback?: string
          p_investor_type?: string
          p_last_name?: string
          p_league_level?: string
          p_linkedin_url?: string
          p_next_trigger?: string
          p_player_id?: string
          p_prior_outcome?: string
          p_relationship_source?: string
          p_sport?: string
          p_what_they_need_to_see?: string
        }
        Returns: {
          archived: boolean
          bltz_relevance: number | null
          buying_authority: number | null
          contact_type: string
          created_at: string
          created_by: string
          current_company: string | null
          current_title: string | null
          display_name: string
          do_not_automate: boolean
          email: string | null
          first_name: string | null
          future_trigger: string | null
          geography: string | null
          historical_signal: string | null
          id: string
          introduction_potential: number | null
          investor_relationship_stage: string | null
          investor_thesis_feedback: string | null
          investor_type: string | null
          is_priority: boolean
          last_interaction_at: string | null
          last_name: string | null
          league_level: string | null
          linkedin_connected_on: string | null
          linkedin_url: string | null
          network_leverage: number | null
          next_action: string | null
          next_action_at: string | null
          next_trigger: string | null
          organization_id: string | null
          phone: string | null
          pipeline_stage: string
          prior_outcome: string | null
          priority_model: string | null
          priority_score: number | null
          priority_tier: string | null
          relationship_source: string | null
          relationship_strength: number | null
          segment: string | null
          source: string | null
          source_record_id: string | null
          sport: string | null
          timing_score: number | null
          updated_at: string
          updated_by: string | null
          what_they_need_to_see: string | null
        }
        SetofOptions: {
          from: "*"
          to: "gtm_contacts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_gtm_customer_discovery: {
        Args: {
          p_additional_context?: string
          p_contact_id: string
          p_current_solution?: string
          p_expected_budget_range?: string
          p_expected_buyer?: string
          p_feature_requested?: string
          p_interaction_id?: string
          p_introduction_offered?: boolean
          p_introduction_target?: string
          p_organization_id?: string
          p_pain_level?: number
          p_primary_bltz_use_case?: string
          p_primary_objection?: string
          p_problem_discussed?: string
          p_would_pay?: boolean
          p_would_pilot?: boolean
          p_would_use?: boolean
        }
        Returns: {
          additional_context: string | null
          contact_id: string
          created_at: string
          created_by: string
          current_solution: string | null
          expected_budget_range: string | null
          expected_buyer: string | null
          feature_requested: string | null
          id: string
          interaction_id: string | null
          introduction_offered: boolean | null
          introduction_target: string | null
          organization_id: string | null
          pain_level: number | null
          primary_bltz_use_case: string | null
          primary_objection: string | null
          problem_discussed: string | null
          updated_at: string
          updated_by: string | null
          would_pay: boolean | null
          would_pilot: boolean | null
          would_use: boolean | null
        }
        SetofOptions: {
          from: "*"
          to: "gtm_customer_discovery"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      generate_slug: { Args: { input_name: string }; Returns: string }
      get_beta_intelligence_dashboard: {
        Args: {
          p_athlete_id?: string
          p_cohort?: string
          p_since?: string
          p_status?: string
        }
        Returns: Json
      }
      get_gtm_foundation_metrics: { Args: { p_since?: string }; Returns: Json }
      import_gtm_contacts: {
        Args: {
          p_content_sha256: string
          p_duplicate_count?: number
          p_field_mapping: Json
          p_filename: string
          p_idempotency_key: string
          p_invalid_count?: number
          p_preview_summary: Json
          p_rows: Json
        }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          completed_at: string | null
          content_sha256: string
          created_at: string
          error_summary: string | null
          field_mapping: Json
          filename: string
          id: string
          idempotency_key: string
          import_type: string
          potential_matches: number
          preview_summary: Json
          rows_created: number
          rows_duplicated: number
          rows_failed: number
          rows_found: number
          rows_updated: number
          started_at: string | null
          status: string
          updated_at: string
          uploaded_by: string
        }
        SetofOptions: {
          from: "*"
          to: "gtm_import_jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_internal_admin: { Args: never; Returns: boolean }
      log_gtm_interaction: {
        Args: {
          p_contact_id: string
          p_direction: string
          p_interaction_at: string
          p_interaction_type: string
          p_next_action?: string
          p_next_action_at?: string
          p_opportunity_id?: string
          p_organization_id?: string
          p_subject?: string
          p_summary?: string
        }
        Returns: {
          contact_id: string
          created_at: string
          created_by: string
          direction: string
          id: string
          interaction_at: string
          interaction_type: string
          next_trigger: string | null
          opportunity_id: string | null
          organization_id: string | null
          outcomes: string[]
          subject: string | null
          summary: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "gtm_interactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      log_gtm_interaction_v2: {
        Args: {
          p_contact_id: string
          p_direction: string
          p_interaction_at: string
          p_interaction_type: string
          p_next_action?: string
          p_next_action_at?: string
          p_next_trigger?: string
          p_opportunity_id?: string
          p_organization_id?: string
          p_outcomes?: string[]
          p_subject?: string
          p_summary?: string
        }
        Returns: {
          contact_id: string
          created_at: string
          created_by: string
          direction: string
          id: string
          interaction_at: string
          interaction_type: string
          next_trigger: string | null
          opportunity_id: string | null
          organization_id: string | null
          outcomes: string[]
          subject: string | null
          summary: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "gtm_interactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      prepare_gtm_import_job: {
        Args: {
          p_content_sha256: string
          p_field_mapping: Json
          p_filename: string
          p_idempotency_key: string
          p_import_type: string
          p_potential_matches?: number
          p_preview_summary: Json
          p_rows_duplicated?: number
          p_rows_failed?: number
          p_rows_found: number
        }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          completed_at: string | null
          content_sha256: string
          created_at: string
          error_summary: string | null
          field_mapping: Json
          filename: string
          id: string
          idempotency_key: string
          import_type: string
          potential_matches: number
          preview_summary: Json
          rows_created: number
          rows_duplicated: number
          rows_failed: number
          rows_found: number
          rows_updated: number
          started_at: string | null
          status: string
          updated_at: string
          uploaded_by: string
        }
        SetofOptions: {
          from: "*"
          to: "gtm_import_jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      publish_onboarding_run: {
        Args: {
          p_awards?: Json
          p_claim_player_id?: string
          p_claim_token?: string
          p_headshot_url?: string
          p_photos?: Json
          p_player: Json
          p_run_id: string
          p_user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      media_provenance:
        | "founder_archive"
        | "cal_archive"
        | "athlete_uploaded"
        | "fan_uploaded"
        | "scraped_candidate"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      media_provenance: [
        "founder_archive",
        "cal_archive",
        "athlete_uploaded",
        "fan_uploaded",
        "scraped_candidate",
      ],
    },
  },
} as const
