

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."media_provenance" AS ENUM (
    'founder_archive',
    'cal_archive',
    'athlete_uploaded',
    'fan_uploaded'
);


ALTER TYPE "public"."media_provenance" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."append_pipeline_event"("p_run_id" "uuid", "p_event" "jsonb") RETURNS "void"
    LANGUAGE "sql"
    AS $$
  update onboarding_pipeline_runs
  set events = events || p_event
  where id = p_run_id;
$$;


ALTER FUNCTION "public"."append_pipeline_event"("p_run_id" "uuid", "p_event" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."append_pipeline_event"("p_run_id" "uuid", "p_event" "jsonb") IS 'Atomically append one event object to onboarding_pipeline_runs.events. Used by the pipeline sink so concurrent emits cannot drop events via read-modify-write.';



CREATE OR REPLACE FUNCTION "public"."claim_pipeline_run"("p_run_id" "uuid", "p_reclaim_seconds" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_identity jsonb;
begin
  update onboarding_pipeline_runs
  set status = 'scraping', started_at = now()
  where id = p_run_id
    and (
      status = 'pending'
      or (
        status in ('scraping', 'generating')
        and started_at < now() - make_interval(secs => p_reclaim_seconds)
      )
    )
  returning identity into v_identity;
  return v_identity;
end;
$$;


ALTER FUNCTION "public"."claim_pipeline_run"("p_run_id" "uuid", "p_reclaim_seconds" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."claim_pipeline_run"("p_run_id" "uuid", "p_reclaim_seconds" integer) IS 'Atomic compare-and-set claim for SSE-driven pipeline execution. Returns the run identity if claimed (pending, or stale reclaim), NULL if another live connection owns it.';



CREATE OR REPLACE FUNCTION "public"."create_reciprocal_teammate"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Insert the reciprocal relationship if it doesn't exist
  INSERT INTO player_teammates (player_id, teammate_player_id, games_played_together, last_played_together)
  VALUES (NEW.teammate_player_id, NEW.player_id, NEW.games_played_together, NEW.last_played_together)
  ON CONFLICT (player_id, teammate_player_id) DO NOTHING;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_reciprocal_teammate"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_slug"("input_name" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
begin
  return lower(regexp_replace(input_name, '[^a-z0-9]+', '-', 'g'));
end;
$$;


ALTER FUNCTION "public"."generate_slug"("input_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, role, email, display_name)
  VALUES (
    NEW.id,
    'player',
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_user"() IS 'Automatically creates a profile when a new user signs up';



CREATE OR REPLACE FUNCTION "public"."handle_profile_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_profile_updated_at"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_profile_updated_at"() IS 'Updates the updated_at timestamp on profile changes';



CREATE OR REPLACE FUNCTION "public"."publish_onboarding_run"("p_run_id" "uuid", "p_user_id" "uuid", "p_player" "jsonb", "p_awards" "jsonb" DEFAULT '[]'::"jsonb", "p_headshot_url" "text" DEFAULT NULL::"text", "p_photos" "jsonb" DEFAULT '[]'::"jsonb", "p_claim_player_id" "uuid" DEFAULT NULL::"uuid", "p_claim_token" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_run onboarding_pipeline_runs%rowtype;
  v_token claim_tokens%rowtype;
  v_player_id uuid;
  v_school_id uuid;
  v_slug text := p_player->>'slug';
  v_slug_holder record;
  v_award jsonb;
  v_photo jsonb;
  v_now timestamptz := now();
begin
  select *
    into v_run
    from onboarding_pipeline_runs
   where id = p_run_id
   for update;

  if not found or v_run.user_id is distinct from p_user_id then
    raise exception 'run_not_found';
  end if;

  v_player_id := coalesce(v_run.claim_player_id, p_claim_player_id, v_run.player_id);

  if p_claim_token is not null then
    select *
      into v_token
      from claim_tokens
     where token = p_claim_token
     for update;

    if not found then
      raise exception 'claim_token_missing';
    end if;

    if v_token.claimed_at is not null and v_token.claimed_by is distinct from p_user_id then
      raise exception 'claim_token_already_claimed';
    end if;

    v_player_id := coalesce(v_player_id, v_token.player_id);
  end if;

  select id, user_id
    into v_slug_holder
    from players
   where slug = v_slug
     and id is distinct from v_player_id
   limit 1;

  if found and v_slug_holder.user_id is not null and v_slug_holder.user_id is distinct from p_user_id then
    raise exception 'slug_taken';
  end if;

  if nullif(p_player->>'school', '') is not null then
    select id
      into v_school_id
      from schools
     where name ilike (p_player->>'school')
     limit 1;
  end if;

  if v_player_id is null then
    select id
      into v_player_id
      from players
     where user_id = p_user_id
     order by id
     limit 1
     for update;
  end if;

  if v_player_id is null then
    insert into players (
      full_name, name, slug, bio, dob, height_in, weight_lbs, games_played,
      position, level, school, school_id, hometown, headshot_url, image_url,
      profile_image, youtube_urls, gsis_id, cfb_team_id, visibility, is_public,
      user_id, confirmed_fields
    )
    values (
      p_player->>'full_name', p_player->>'name', v_slug, p_player->>'bio',
      nullif(p_player->>'dob', '')::date, nullif(p_player->>'height_in', '')::smallint,
      nullif(p_player->>'weight_lbs', '')::smallint, nullif(p_player->>'games_played', '')::integer,
      nullif(p_player->>'position', ''), nullif(p_player->>'level', ''),
      nullif(p_player->>'school', ''), v_school_id, nullif(p_player->>'hometown', ''),
      nullif(p_player->>'headshot_url', ''), nullif(p_player->>'image_url', ''),
      nullif(p_player->>'profile_image', ''), coalesce(p_player->'youtube_urls', '[]'::jsonb),
      nullif(p_player->>'gsis_id', ''),
      nullif(p_player->>'cfb_team_id', ''),
      true, true, p_user_id, coalesce(p_player->'confirmed_fields', '{}'::jsonb)
    )
    returning id into v_player_id;
  else
    update players
       set full_name = p_player->>'full_name', name = p_player->>'name',
           slug = v_slug, bio = p_player->>'bio',
           dob = nullif(p_player->>'dob', '')::date,
           height_in = nullif(p_player->>'height_in', '')::smallint,
           weight_lbs = nullif(p_player->>'weight_lbs', '')::smallint,
           games_played = nullif(p_player->>'games_played', '')::integer,
           position = nullif(p_player->>'position', ''),
           level = nullif(p_player->>'level', ''),
           school = nullif(p_player->>'school', ''), school_id = v_school_id,
           hometown = nullif(p_player->>'hometown', ''),
           headshot_url = nullif(p_player->>'headshot_url', ''),
           image_url = nullif(p_player->>'image_url', ''),
           profile_image = nullif(p_player->>'profile_image', ''),
           youtube_urls = coalesce(p_player->'youtube_urls', '[]'::jsonb),
           gsis_id = coalesce(nullif(p_player->>'gsis_id', ''), gsis_id),
           cfb_team_id = coalesce(nullif(p_player->>'cfb_team_id', ''), cfb_team_id),
           visibility = true, is_public = true, user_id = p_user_id,
           confirmed_fields = coalesce(p_player->'confirmed_fields', '{}'::jsonb)
     where id = v_player_id;
  end if;

  for v_award in select * from jsonb_array_elements(coalesce(p_awards, '[]'::jsonb))
  loop
    insert into player_awards (
      player_id, name, year, organization, source_url,
      ai_discovered, verified, category, significance
    )
    values (
      v_player_id, v_award->>'name', nullif(v_award->>'year', '')::integer,
      nullif(v_award->>'organization', ''), nullif(v_award->>'source_url', ''),
      true, false, 'sports', 'regional'
    )
    on conflict do nothing;
  end loop;

  if p_headshot_url is not null then
    insert into media (player_id, url, kind, provenance, display_order)
    values (v_player_id, p_headshot_url, 'headshot', 'athlete_uploaded', 0)
    on conflict do nothing;
  end if;

  for v_photo in select * from jsonb_array_elements(coalesce(p_photos, '[]'::jsonb))
  loop
    insert into media (
      player_id, url, kind, credits, width, height, display_order, provenance
    )
    values (
      v_player_id, v_photo->>'url', 'photo', nullif(v_photo->>'credits', ''),
      nullif(v_photo->>'width', '')::integer, nullif(v_photo->>'height', '')::integer,
      coalesce((v_photo->>'display_order')::integer, 1), 'founder_archive'
    )
    on conflict do nothing;
  end loop;

  insert into profiles (id, role, player_id, full_name, updated_at)
  values (p_user_id, 'player', v_player_id, p_player->>'full_name', v_now)
  on conflict (id) do update
    set role = excluded.role, player_id = excluded.player_id,
        full_name = excluded.full_name, updated_at = excluded.updated_at;

  if p_claim_token is not null then
    update claim_tokens
       set claimed_at = coalesce(claimed_at, v_now),
           claimed_by = coalesce(claimed_by, p_user_id)
     where token = p_claim_token;
  end if;

  update onboarding_pipeline_runs
     set status = 'complete', player_id = v_player_id,
         completed_at = coalesce(completed_at, v_now)
   where id = p_run_id;

  return jsonb_build_object('slug', v_slug, 'playerId', v_player_id);
end;
$$;


ALTER FUNCTION "public"."publish_onboarding_run"("p_run_id" "uuid", "p_user_id" "uuid", "p_player" "jsonb", "p_awards" "jsonb", "p_headshot_url" "text", "p_photos" "jsonb", "p_claim_player_id" "uuid", "p_claim_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at_now"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at_now"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_thread_last_message_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.thread_id IS NOT NULL THEN
      UPDATE public.message_threads
      SET last_message_at = NEW.created_at
      WHERE id = NEW.thread_id AND (last_message_at IS NULL OR NEW.created_at > last_message_at);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If thread_id changed, update old and new threads
    IF NEW.thread_id IS DISTINCT FROM OLD.thread_id THEN
      IF OLD.thread_id IS NOT NULL THEN
        UPDATE public.message_threads
        SET last_message_at = (
          SELECT GREATEST(COALESCE(MAX(created_at), to_timestamp(0)), COALESCE((SELECT last_message_at FROM public.message_threads WHERE id = OLD.thread_id), to_timestamp(0)))
          FROM public.messages WHERE thread_id = OLD.thread_id
        )
        WHERE id = OLD.thread_id;
      END IF;
      IF NEW.thread_id IS NOT NULL THEN
        UPDATE public.message_threads
        SET last_message_at = (
          SELECT MAX(created_at) FROM public.messages WHERE thread_id = NEW.thread_id
        )
        WHERE id = NEW.thread_id;
      END IF;
      RETURN NEW;
    END IF;

    -- If created_at changed or message moved within same thread, adjust last_message_at
    IF NEW.thread_id IS NOT NULL THEN
      IF NEW.created_at <> OLD.created_at THEN
        UPDATE public.message_threads
        SET last_message_at = (
          SELECT MAX(created_at) FROM public.messages WHERE thread_id = NEW.thread_id
        )
        WHERE id = NEW.thread_id;
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.thread_id IS NOT NULL THEN
      UPDATE public.message_threads
      SET last_message_at = (
        SELECT MAX(created_at) FROM public.messages WHERE thread_id = OLD.thread_id
      )
      WHERE id = OLD.thread_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_thread_last_message_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."Colleges" (
    "id" bigint NOT NULL,
    "canonical_name" "text" NOT NULL,
    "org_type" "text",
    "league" "text",
    "division" "text",
    "conference" "text",
    "city" "text",
    "state" "text",
    "country" "text",
    "primary_color_hex" "text",
    "secondary_color_hex" "text",
    "mascot" "text",
    "logo_url" "text",
    "source_conference_division_raw" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."Colleges" OWNER TO "postgres";


ALTER TABLE "public"."Colleges" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."Colleges_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."achievement_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "player_id" "uuid" NOT NULL,
    "achievement_id" "uuid" NOT NULL,
    "current_progress" integer DEFAULT 0,
    "max_progress" integer NOT NULL,
    "progress_percentage" numeric(5,2) DEFAULT 0.00,
    "last_updated" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."achievement_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."achievements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "icon" "text" NOT NULL,
    "rarity" "text" NOT NULL,
    "category" "text" NOT NULL,
    "criteria" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "points" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "achievements_rarity_check" CHECK (("rarity" = ANY (ARRAY['common'::"text", 'rare'::"text", 'epic'::"text", 'legendary'::"text"])))
);


ALTER TABLE "public"."achievements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_revenue_summary" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "summary_date" "date" NOT NULL,
    "total_platform_revenue" numeric(12,2) DEFAULT 0 NOT NULL,
    "total_publisher_revenue" numeric(12,2) DEFAULT 0 NOT NULL,
    "total_player_revenue" numeric(12,2) DEFAULT 0 NOT NULL,
    "total_team_pool_revenue" numeric(12,2) DEFAULT 0 NOT NULL,
    "total_videos_processed" integer DEFAULT 0 NOT NULL,
    "total_views_processed" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_revenue_summary" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_revenue_summary" IS 'Daily revenue summary for BLTZ admin dashboard';



CREATE TABLE IF NOT EXISTS "public"."articles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "player_id" "uuid",
    "owner_user_id" "uuid",
    "title" "text" NOT NULL,
    "body" "text",
    "cover_image_url" "text",
    "visibility" "text" DEFAULT 'public'::"text",
    "tags" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "articles_visibility_check" CHECK (("visibility" = ANY (ARRAY['public'::"text", 'unlisted'::"text", 'private'::"text"])))
);


ALTER TABLE "public"."articles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."award_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "color" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."award_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."award_verification" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "award_id" "uuid" NOT NULL,
    "verification_method" "text" NOT NULL,
    "verification_status" "text" NOT NULL,
    "verification_data" "jsonb" DEFAULT '{}'::"jsonb",
    "verified_by" "uuid",
    "verified_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "award_verification_verification_status_check" CHECK (("verification_status" = ANY (ARRAY['pending'::"text", 'verified'::"text", 'failed'::"text", 'disputed'::"text"])))
);


ALTER TABLE "public"."award_verification" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."awards" (
    "id" bigint NOT NULL,
    "player_id" "text" NOT NULL,
    "player_name" "text" NOT NULL,
    "award_name" "text" NOT NULL,
    "award_short_desc" "text" NOT NULL,
    "year" "text" NOT NULL,
    "level" "text",
    "team_or_school" "text",
    "league" "text",
    "source_site" "text" NOT NULL,
    "source_url" "text" NOT NULL,
    "accessed_at" timestamp with time zone DEFAULT "now"(),
    "evidence_quote" "text",
    "extractor_confidence" numeric,
    "extractor_version" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "awards_level_check" CHECK (("level" = ANY (ARRAY['HS'::"text", 'College'::"text", 'Pro'::"text"])))
);


ALTER TABLE "public"."awards" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."awards_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."awards_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."awards_id_seq" OWNED BY "public"."awards"."id";



CREATE TABLE IF NOT EXISTS "public"."cfb_players" (
    "espn_id" "text" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "display_name" "text" NOT NULL,
    "jersey" smallint,
    "position" "text",
    "height_in" smallint,
    "weight_lbs" smallint,
    "home_city" "text",
    "home_state" "text",
    "home_country" "text",
    "team" "text",
    "cfb_team_id" "text",
    "first_season" smallint,
    "last_season" smallint,
    "recruit_ids" "jsonb",
    "last_synced_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cfb_players" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cfb_teams" (
    "espn_id" "text" NOT NULL,
    "abbreviation" "text",
    "display_name" "text" NOT NULL,
    "location" "text",
    "mascot" "text",
    "slug" "text",
    "primary_color" "text",
    "alt_color" "text",
    "logo_url" "text",
    "logo_dark_url" "text",
    "is_active" boolean DEFAULT true,
    "last_synced_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cfb_teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."claim_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "player_id" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "email" "text",
    "expires_at" timestamp with time zone DEFAULT ("now"() + '30 days'::interval) NOT NULL,
    "claimed_at" timestamp with time zone,
    "claimed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."claim_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."content_moderation_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auto_moderation_enabled" boolean DEFAULT true NOT NULL,
    "profanity_filter" boolean DEFAULT true NOT NULL,
    "spam_detection" boolean DEFAULT true NOT NULL,
    "image_moderation" boolean DEFAULT true NOT NULL,
    "video_moderation" boolean DEFAULT false NOT NULL,
    "report_threshold" integer DEFAULT 3 NOT NULL,
    "auto_hide_threshold" integer DEFAULT 5 NOT NULL,
    "auto_delete_threshold" integer DEFAULT 10 NOT NULL,
    "moderation_queue_size" integer DEFAULT 50 NOT NULL,
    "require_approval_for_new_users" boolean DEFAULT false NOT NULL,
    "require_approval_for_verified_users" boolean DEFAULT false NOT NULL,
    "allow_user_reports" boolean DEFAULT true NOT NULL,
    "allow_anonymous_reports" boolean DEFAULT false NOT NULL,
    "moderation_response_time" integer DEFAULT 24 NOT NULL,
    "escalation_enabled" boolean DEFAULT true NOT NULL,
    "escalation_threshold" integer DEFAULT 2 NOT NULL,
    "appeal_process_enabled" boolean DEFAULT true NOT NULL,
    "appeal_deadline" integer DEFAULT 7 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."content_moderation_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "summary_date" "date" NOT NULL,
    "total_users" integer DEFAULT 0,
    "new_users" integer DEFAULT 0,
    "active_users" integer DEFAULT 0,
    "total_views" integer DEFAULT 0,
    "total_likes" integer DEFAULT 0,
    "total_comments" integer DEFAULT 0,
    "total_shares" integer DEFAULT 0,
    "total_videos_uploaded" integer DEFAULT 0,
    "avg_session_duration_seconds" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."daily_analytics" OWNER TO "postgres";


COMMENT ON TABLE "public"."daily_analytics" IS 'Daily aggregated analytics for admin dashboard';



CREATE TABLE IF NOT EXISTS "public"."email_notification_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "smtp_enabled" boolean DEFAULT true NOT NULL,
    "smtp_host" "text" DEFAULT 'smtp.gmail.com'::"text" NOT NULL,
    "smtp_port" integer DEFAULT 587 NOT NULL,
    "smtp_username" "text",
    "smtp_password" "text",
    "smtp_secure" boolean DEFAULT true NOT NULL,
    "from_email" "text" DEFAULT 'noreply@bltz.com'::"text" NOT NULL,
    "from_name" "text" DEFAULT 'BLTZ Platform'::"text" NOT NULL,
    "welcome_email_enabled" boolean DEFAULT true NOT NULL,
    "password_reset_enabled" boolean DEFAULT true NOT NULL,
    "email_verification_enabled" boolean DEFAULT true NOT NULL,
    "notification_digest_enabled" boolean DEFAULT true NOT NULL,
    "digest_frequency" "text" DEFAULT 'daily'::"text" NOT NULL,
    "marketing_emails_enabled" boolean DEFAULT false NOT NULL,
    "system_alerts_enabled" boolean DEFAULT true NOT NULL,
    "moderation_alerts_enabled" boolean DEFAULT true NOT NULL,
    "user_reports_enabled" boolean DEFAULT true NOT NULL,
    "admin_notifications_enabled" boolean DEFAULT true NOT NULL,
    "email_templates_enabled" boolean DEFAULT true NOT NULL,
    "email_tracking_enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "email_notification_settings_digest_frequency_check" CHECK (("digest_frequency" = ANY (ARRAY['daily'::"text", 'weekly'::"text", 'monthly'::"text", 'disabled'::"text"])))
);


ALTER TABLE "public"."email_notification_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."integration_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "twitter_enabled" boolean DEFAULT false NOT NULL,
    "twitter_api_key" "text",
    "twitter_api_secret" "text",
    "facebook_enabled" boolean DEFAULT false NOT NULL,
    "facebook_app_id" "text",
    "facebook_app_secret" "text",
    "instagram_enabled" boolean DEFAULT false NOT NULL,
    "instagram_client_id" "text",
    "instagram_client_secret" "text",
    "youtube_enabled" boolean DEFAULT false NOT NULL,
    "youtube_api_key" "text",
    "tiktok_enabled" boolean DEFAULT false NOT NULL,
    "tiktok_client_key" "text",
    "tiktok_client_secret" "text",
    "stripe_enabled" boolean DEFAULT false NOT NULL,
    "stripe_publishable_key" "text",
    "stripe_secret_key" "text",
    "paypal_enabled" boolean DEFAULT false NOT NULL,
    "paypal_client_id" "text",
    "paypal_client_secret" "text",
    "google_analytics_enabled" boolean DEFAULT false NOT NULL,
    "google_analytics_id" "text",
    "mixpanel_enabled" boolean DEFAULT false NOT NULL,
    "mixpanel_token" "text",
    "amplitude_enabled" boolean DEFAULT false NOT NULL,
    "amplitude_api_key" "text",
    "sendgrid_enabled" boolean DEFAULT false NOT NULL,
    "sendgrid_api_key" "text",
    "twilio_enabled" boolean DEFAULT false NOT NULL,
    "twilio_account_sid" "text",
    "twilio_auth_token" "text",
    "slack_enabled" boolean DEFAULT false NOT NULL,
    "slack_webhook_url" "text",
    "aws_s3_enabled" boolean DEFAULT false NOT NULL,
    "aws_access_key_id" "text",
    "aws_secret_access_key" "text",
    "aws_bucket_name" "text",
    "cloudinary_enabled" boolean DEFAULT false NOT NULL,
    "cloudinary_cloud_name" "text",
    "cloudinary_api_key" "text",
    "cloudinary_api_secret" "text",
    "openai_enabled" boolean DEFAULT false NOT NULL,
    "openai_api_key" "text",
    "moderation_api_enabled" boolean DEFAULT false NOT NULL,
    "moderation_api_key" "text",
    "image_recognition_enabled" boolean DEFAULT false NOT NULL,
    "image_recognition_api_key" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."integration_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."locker_access_grants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "player_id" "uuid" NOT NULL,
    "granted_to_email" "text",
    "access_code" "text" DEFAULT "encode"("extensions"."gen_random_bytes"(16), 'hex'::"text") NOT NULL,
    "label" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    "last_used_at" timestamp with time zone
);


ALTER TABLE "public"."locker_access_grants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "player_id" "uuid" NOT NULL,
    "url" "text" NOT NULL,
    "title" "text",
    "credits" "text",
    "width" integer,
    "height" integer,
    "display_order" integer DEFAULT 0,
    "provenance" "public"."media_provenance" DEFAULT 'athlete_uploaded'::"public"."media_provenance" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "kind" "text" DEFAULT 'photo'::"text" NOT NULL,
    "source_url" "text",
    CONSTRAINT "media_kind_check" CHECK (("kind" = ANY (ARRAY['photo'::"text", 'headshot'::"text", 'video'::"text", 'document'::"text"])))
);


ALTER TABLE "public"."media" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "file_size" integer NOT NULL,
    "mime_type" "text" NOT NULL,
    "file_type" "text" DEFAULT 'image'::"text" NOT NULL,
    "width" integer,
    "height" integer,
    "thumbnail_path" "text",
    "is_compressed" boolean DEFAULT false NOT NULL,
    "original_size" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "message_attachments_file_type_check" CHECK (("file_type" = ANY (ARRAY['image'::"text", 'document'::"text", 'video'::"text", 'audio'::"text"])))
);


ALTER TABLE "public"."message_attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_threads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subject" "text" NOT NULL,
    "last_message_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."message_threads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "subject" "text" NOT NULL,
    "content" "text" NOT NULL,
    "message_type" "text" DEFAULT 'admin_to_user'::"text" NOT NULL,
    "priority" "text" DEFAULT 'normal'::"text" NOT NULL,
    "status" "text" DEFAULT 'sent'::"text" NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "thread_id" "uuid",
    CONSTRAINT "messages_message_type_check" CHECK (("message_type" = ANY (ARRAY['admin_to_user'::"text", 'user_to_admin'::"text", 'user_to_user'::"text"]))),
    CONSTRAINT "messages_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'normal'::"text", 'high'::"text", 'urgent'::"text"]))),
    CONSTRAINT "messages_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'sent'::"text", 'delivered'::"text", 'read'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nfl_players" (
    "gsis_id" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "birth_date" "date",
    "position" "text",
    "position_group" "text",
    "height_in" smallint,
    "weight_lbs" smallint,
    "headshot_url" "text",
    "college_name" "text",
    "college_conference" "text",
    "jersey_number" smallint,
    "rookie_season" smallint,
    "last_season" smallint,
    "latest_team" "text",
    "status" "text",
    "years_of_experience" smallint,
    "draft_year" smallint,
    "draft_round" smallint,
    "draft_pick" smallint,
    "draft_team" "text",
    "espn_id" "text",
    "pfr_id" "text",
    "nfl_id" "text",
    "pff_id" "text",
    "smart_id" "text",
    "last_synced_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."nfl_players" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."onboarding_pipeline_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "player_id" "uuid",
    "user_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "identity" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "events" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "draft" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "error" "text",
    "started_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "claim_player_id" "uuid",
    "claim_token" "text",
    CONSTRAINT "onboarding_pipeline_runs_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'scraping'::"text", 'generating'::"text", 'complete'::"text", 'error'::"text", 'manual'::"text"])))
);


ALTER TABLE "public"."onboarding_pipeline_runs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_revenue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "video_id" "uuid" NOT NULL,
    "amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "percentage" numeric(5,2) DEFAULT 10.00 NOT NULL,
    "calculation_date" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."platform_revenue" OWNER TO "postgres";


COMMENT ON TABLE "public"."platform_revenue" IS 'BLTZ platform revenue (10% of total video revenue)';



CREATE TABLE IF NOT EXISTS "public"."player_achievements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "player_id" "uuid" NOT NULL,
    "achievement_id" "uuid" NOT NULL,
    "unlocked_at" timestamp with time zone DEFAULT "now"(),
    "progress" "jsonb" DEFAULT '{}'::"jsonb",
    "is_unlocked" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."player_achievements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."player_awards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "player_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "category" "text" NOT NULL,
    "year" integer NOT NULL,
    "organization" "text" NOT NULL,
    "image_url" "text",
    "source_url" "text",
    "significance" "text" NOT NULL,
    "verified" boolean DEFAULT false,
    "ai_discovered" boolean DEFAULT true,
    "confidence_score" numeric(3,2) DEFAULT 0.00,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "player_awards_category_check" CHECK (("category" = ANY (ARRAY['sports'::"text", 'academic'::"text", 'personal'::"text", 'professional'::"text"]))),
    CONSTRAINT "player_awards_significance_check" CHECK (("significance" = ANY (ARRAY['local'::"text", 'regional'::"text", 'national'::"text", 'international'::"text"])))
);


ALTER TABLE "public"."player_awards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."player_earnings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "player_id" "uuid" NOT NULL,
    "total_earnings" numeric(10,2) DEFAULT 0 NOT NULL,
    "earnings_from_own_videos" numeric(10,2) DEFAULT 0 NOT NULL,
    "earnings_from_team_pool" numeric(10,2) DEFAULT 0 NOT NULL,
    "last_calculated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."player_earnings" OWNER TO "postgres";


COMMENT ON TABLE "public"."player_earnings" IS 'Accumulated earnings for each player from all sources';



CREATE TABLE IF NOT EXISTS "public"."player_lockers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "player_id" "uuid" NOT NULL,
    "owner_user_id" "uuid",
    "headline" "text",
    "bio" "text",
    "colors" "jsonb" DEFAULT '{"accent": "#ffbb00", "primary": "#000000"}'::"jsonb",
    "social" "jsonb" DEFAULT '{}'::"jsonb",
    "stats" "jsonb" DEFAULT '{}'::"jsonb",
    "media_counts" "jsonb" DEFAULT '{}'::"jsonb",
    "ai_last_refreshed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."player_lockers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."player_season_stats" (
    "id" bigint NOT NULL,
    "player_id" "uuid" NOT NULL,
    "source" "text" NOT NULL,
    "level" "text" NOT NULL,
    "season" smallint NOT NULL,
    "season_type" "text" DEFAULT 'REG'::"text" NOT NULL,
    "team" "text",
    "stats" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "last_synced_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "player_season_stats_level_check" CHECK (("level" = ANY (ARRAY['pro'::"text", 'college'::"text"])))
);


ALTER TABLE "public"."player_season_stats" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."player_season_stats_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."player_season_stats_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."player_season_stats_id_seq" OWNED BY "public"."player_season_stats"."id";



CREATE TABLE IF NOT EXISTS "public"."player_teammates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "player_id" "uuid" NOT NULL,
    "teammate_player_id" "uuid" NOT NULL,
    "games_played_together" integer DEFAULT 0,
    "last_played_together" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "player_teammates_check" CHECK (("player_id" <> "teammate_player_id"))
);


ALTER TABLE "public"."player_teammates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."players" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "hometown" "text",
    "team" "text",
    "position" "text",
    "bio" "text",
    "profile_image" "text",
    "video_url" "text",
    "spotify_url" "text",
    "theme_color" "text" DEFAULT 'blue'::"text",
    "visibility" boolean DEFAULT true,
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "full_name" "text",
    "college" "text"[],
    "school" "text",
    "school_id" "uuid",
    "team_id" "uuid",
    "level" "text",
    "youtube_urls" "text"[],
    "username" "text",
    "display_name" "text",
    "image_url" "text",
    "highlight_url" "text",
    "is_public" boolean DEFAULT true,
    "theme_primary" "text",
    "theme_secondary" "text",
    "earnings" numeric DEFAULT 0,
    "stripe_account_id" "text",
    "is_premium" boolean DEFAULT false,
    "is_verified" boolean DEFAULT false,
    "mentorship_opt_in" boolean DEFAULT false,
    "view_count" integer DEFAULT 0,
    "dob" "date",
    "height_in" smallint,
    "weight_lbs" smallint,
    "games_played" integer,
    "current_status" "text",
    "confirmed_fields" "jsonb" DEFAULT '{}'::"jsonb",
    "headshot_url" "text",
    "gsis_id" "text",
    "cfb_team_id" "text",
    CONSTRAINT "players_level_check" CHECK ((("level" IS NULL) OR ("level" = ANY (ARRAY['hs'::"text", 'college'::"text", 'pro'::"text", 'former'::"text"])))),
    CONSTRAINT "players_slug_format_chk" CHECK (("slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::"text")),
    CONSTRAINT "players_theme_color_check" CHECK (("theme_color" = ANY (ARRAY['blue'::"text", 'gold'::"text"])))
);


ALTER TABLE "public"."players" OWNER TO "postgres";


COMMENT ON COLUMN "public"."players"."full_name" IS 'players full name';



COMMENT ON COLUMN "public"."players"."college" IS 'players colleges';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'fan'::"text",
    "display_name" "text",
    "avatar_url" "text",
    "player_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "email" "text",
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['player'::"text", 'fan'::"text", 'admin'::"text", 'publisher'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."publisher_revenue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "video_id" "uuid" NOT NULL,
    "player_id" "uuid" NOT NULL,
    "publisher_name" "text" NOT NULL,
    "publisher_type" "text" NOT NULL,
    "amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "percentage" numeric(5,2) DEFAULT 15.00 NOT NULL,
    "calculation_date" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "publisher_revenue_publisher_type_check" CHECK (("publisher_type" = ANY (ARRAY['league'::"text", 'school'::"text", 'organization'::"text"])))
);


ALTER TABLE "public"."publisher_revenue" OWNER TO "postgres";


COMMENT ON TABLE "public"."publisher_revenue" IS 'Publisher revenue for NFL/NCAA/Schools (15% of total video revenue)';



COMMENT ON COLUMN "public"."publisher_revenue"."publisher_type" IS 'Type: league (NFL, NBA), school (UCLA, USC), organization';



CREATE TABLE IF NOT EXISTS "public"."revenue_distributions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "video_id" "uuid" NOT NULL,
    "source_player_id" "uuid" NOT NULL,
    "recipient_player_id" "uuid" NOT NULL,
    "amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "distribution_type" "text" NOT NULL,
    "calculation_date" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "revenue_distributions_distribution_type_check" CHECK (("distribution_type" = ANY (ARRAY['view_revenue'::"text", 'sponsor_revenue'::"text", 'team_pool'::"text"])))
);


ALTER TABLE "public"."revenue_distributions" OWNER TO "postgres";


COMMENT ON TABLE "public"."revenue_distributions" IS 'Tracks individual revenue distributions from videos to players';



COMMENT ON COLUMN "public"."revenue_distributions"."distribution_type" IS 'Type: view_revenue (direct), sponsor_revenue (direct), team_pool (15% split among tagged teammates)';



CREATE TABLE IF NOT EXISTS "public"."schools" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "logo_url" "text",
    "city" "text",
    "state" "text",
    "meta" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."schools" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."security_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "require_https" boolean DEFAULT true NOT NULL,
    "session_timeout" integer DEFAULT 24 NOT NULL,
    "max_login_attempts" integer DEFAULT 5 NOT NULL,
    "lockout_duration" integer DEFAULT 30 NOT NULL,
    "password_min_length" integer DEFAULT 8 NOT NULL,
    "require_strong_password" boolean DEFAULT true NOT NULL,
    "password_expiry_days" integer DEFAULT 90 NOT NULL,
    "two_factor_required" boolean DEFAULT false NOT NULL,
    "two_factor_required_for_admins" boolean DEFAULT true NOT NULL,
    "ip_whitelist_enabled" boolean DEFAULT false NOT NULL,
    "allowed_ips" "text"[],
    "rate_limiting_enabled" boolean DEFAULT true NOT NULL,
    "rate_limit_requests" integer DEFAULT 100 NOT NULL,
    "rate_limit_window" integer DEFAULT 15 NOT NULL,
    "csrf_protection" boolean DEFAULT true NOT NULL,
    "xss_protection" boolean DEFAULT true NOT NULL,
    "sql_injection_protection" boolean DEFAULT true NOT NULL,
    "file_upload_security" boolean DEFAULT true NOT NULL,
    "audit_logging" boolean DEFAULT true NOT NULL,
    "security_headers" boolean DEFAULT true NOT NULL,
    "cors_enabled" boolean DEFAULT true NOT NULL,
    "cors_origins" "text" DEFAULT '*'::"text" NOT NULL,
    "api_key_required" boolean DEFAULT false NOT NULL,
    "api_rate_limit" integer DEFAULT 1000 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."security_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."site_configuration" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_name" "text" DEFAULT 'BLTZ Platform'::"text" NOT NULL,
    "site_description" "text",
    "site_url" "text" DEFAULT 'https://bltz.com'::"text" NOT NULL,
    "maintenance_mode" boolean DEFAULT false NOT NULL,
    "registration_enabled" boolean DEFAULT true NOT NULL,
    "public_registration" boolean DEFAULT true NOT NULL,
    "default_user_role" "text" DEFAULT 'fan'::"text" NOT NULL,
    "max_file_size" integer DEFAULT 10 NOT NULL,
    "allowed_file_types" "text"[] DEFAULT ARRAY['jpg'::"text", 'jpeg'::"text", 'png'::"text", 'mp4'::"text", 'mov'::"text"] NOT NULL,
    "timezone" "text" DEFAULT 'America/New_York'::"text" NOT NULL,
    "language" "text" DEFAULT 'en'::"text" NOT NULL,
    "theme" "text" DEFAULT 'dark'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "site_configuration_default_user_role_check" CHECK (("default_user_role" = ANY (ARRAY['fan'::"text", 'player'::"text", 'publisher'::"text"]))),
    CONSTRAINT "site_configuration_theme_check" CHECK (("theme" = ANY (ARRAY['dark'::"text", 'light'::"text", 'auto'::"text"])))
);


ALTER TABLE "public"."site_configuration" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "maintenance_mode" boolean DEFAULT false NOT NULL,
    "debug_mode" boolean DEFAULT false NOT NULL,
    "log_level" "text" DEFAULT 'info'::"text" NOT NULL,
    "cache_enabled" boolean DEFAULT true NOT NULL,
    "cache_ttl" integer DEFAULT 3600 NOT NULL,
    "database_pool_size" integer DEFAULT 10 NOT NULL,
    "max_connections" integer DEFAULT 100 NOT NULL,
    "backup_enabled" boolean DEFAULT true NOT NULL,
    "backup_frequency" "text" DEFAULT 'daily'::"text" NOT NULL,
    "backup_retention" integer DEFAULT 30 NOT NULL,
    "monitoring_enabled" boolean DEFAULT true NOT NULL,
    "performance_monitoring" boolean DEFAULT true NOT NULL,
    "error_tracking" boolean DEFAULT true NOT NULL,
    "analytics_enabled" boolean DEFAULT true NOT NULL,
    "cdn_enabled" boolean DEFAULT false NOT NULL,
    "cdn_url" "text",
    "compression_enabled" boolean DEFAULT true NOT NULL,
    "image_optimization" boolean DEFAULT true NOT NULL,
    "video_processing" boolean DEFAULT true NOT NULL,
    "thumbnail_generation" boolean DEFAULT true NOT NULL,
    "max_upload_size" integer DEFAULT 100 NOT NULL,
    "max_concurrent_uploads" integer DEFAULT 5 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "system_settings_backup_frequency_check" CHECK (("backup_frequency" = ANY (ARRAY['hourly'::"text", 'daily'::"text", 'weekly'::"text", 'monthly'::"text"]))),
    CONSTRAINT "system_settings_log_level_check" CHECK (("log_level" = ANY (ARRAY['error'::"text", 'warn'::"text", 'info'::"text", 'debug'::"text"])))
);


ALTER TABLE "public"."system_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "inviter_user_id" "uuid" NOT NULL,
    "inviter_player_id" "uuid",
    "invitee_email" "text" NOT NULL,
    "invitee_name" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "invite_code" "text" DEFAULT "encode"("extensions"."gen_random_bytes"(16), 'hex'::"text") NOT NULL,
    "message" "text",
    "expires_at" timestamp with time zone DEFAULT ("now"() + '30 days'::interval),
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "team_invites_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'declined'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."team_invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "logo_url" "text",
    "school_id" "uuid",
    "sport" "text",
    "meta" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."traffic_sources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "source" "text",
    "referrer_url" "text",
    "utm_source" "text",
    "utm_medium" "text",
    "utm_campaign" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "traffic_sources_source_check" CHECK (("source" = ANY (ARRAY['direct'::"text", 'social'::"text", 'referral'::"text", 'email'::"text", 'search'::"text"])))
);


ALTER TABLE "public"."traffic_sources" OWNER TO "postgres";


COMMENT ON TABLE "public"."traffic_sources" IS 'Tracks where users come from (referrals, social, etc)';



CREATE TABLE IF NOT EXISTS "public"."user_activity" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "activity_type" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_activity_activity_type_check" CHECK (("activity_type" = ANY (ARRAY['login'::"text", 'logout'::"text", 'video_upload'::"text", 'profile_update'::"text", 'invite_sent'::"text", 'message_sent'::"text"])))
);


ALTER TABLE "public"."user_activity" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_activity" IS 'Tracks user activity for analytics dashboard';



CREATE TABLE IF NOT EXISTS "public"."user_devices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "device_type" "text",
    "browser" "text",
    "os" "text",
    "last_used_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_devices_device_type_check" CHECK (("device_type" = ANY (ARRAY['mobile'::"text", 'tablet'::"text", 'desktop'::"text"])))
);


ALTER TABLE "public"."user_devices" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_devices" IS 'Tracks device types used by users';



CREATE TABLE IF NOT EXISTS "public"."user_locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "country" "text",
    "state" "text",
    "city" "text",
    "timezone" "text",
    "ip_address" "inet",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_locations" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_locations" IS 'Stores user location data for geographic analytics';



CREATE TABLE IF NOT EXISTS "public"."user_management_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "require_email_verification" boolean DEFAULT true NOT NULL,
    "allow_username_changes" boolean DEFAULT false NOT NULL,
    "max_username_length" integer DEFAULT 20 NOT NULL,
    "min_password_length" integer DEFAULT 8 NOT NULL,
    "require_strong_password" boolean DEFAULT true NOT NULL,
    "session_timeout" integer DEFAULT 24 NOT NULL,
    "max_login_attempts" integer DEFAULT 5 NOT NULL,
    "lockout_duration" integer DEFAULT 30 NOT NULL,
    "enable_two_factor" boolean DEFAULT true NOT NULL,
    "require_two_factor_for_admins" boolean DEFAULT true NOT NULL,
    "user_registration_approval" boolean DEFAULT false NOT NULL,
    "auto_approve_verified_users" boolean DEFAULT true NOT NULL,
    "profile_picture_required" boolean DEFAULT false NOT NULL,
    "bio_max_length" integer DEFAULT 500 NOT NULL,
    "allow_profile_customization" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_management_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "twitter_handle" "text",
    "instagram_handle" "text",
    "linkedin_handle" "text",
    "youtube_handle" "text",
    "tiktok_handle" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."video_engagement" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "video_id" "uuid",
    "user_id" "uuid",
    "engagement_type" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "video_engagement_engagement_type_check" CHECK (("engagement_type" = ANY (ARRAY['like'::"text", 'comment'::"text", 'share'::"text", 'view'::"text"])))
);


ALTER TABLE "public"."video_engagement" OWNER TO "postgres";


COMMENT ON TABLE "public"."video_engagement" IS 'Tracks all engagement actions on videos (likes, comments, shares, views)';



CREATE TABLE IF NOT EXISTS "public"."video_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "video_id" "uuid" NOT NULL,
    "tagged_player_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."video_tags" OWNER TO "postgres";


COMMENT ON TABLE "public"."video_tags" IS 'Tracks which players are tagged in videos for revenue sharing';



CREATE TABLE IF NOT EXISTS "public"."videos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "player_id" "uuid",
    "owner_user_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "thumbnail_url" "text",
    "playback_url" "text",
    "duration_seconds" integer,
    "visibility" "text" DEFAULT 'public'::"text",
    "tags" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "meta" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "videos_visibility_check" CHECK (("visibility" = ANY (ARRAY['public'::"text", 'unlisted'::"text", 'private'::"text"])))
);


ALTER TABLE "public"."videos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."views" (
    "id" bigint NOT NULL,
    "user_id" "uuid",
    "player_id" "uuid",
    "video_id" "uuid",
    "seconds_watched" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."views" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."views_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."views_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."views_id_seq" OWNED BY "public"."views"."id";



ALTER TABLE ONLY "public"."awards" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."awards_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."player_season_stats" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."player_season_stats_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."views" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."views_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."Colleges"
    ADD CONSTRAINT "Colleges_canonical_name_key" UNIQUE ("canonical_name");



ALTER TABLE ONLY "public"."Colleges"
    ADD CONSTRAINT "Colleges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."achievement_progress"
    ADD CONSTRAINT "achievement_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."achievement_progress"
    ADD CONSTRAINT "achievement_progress_player_id_achievement_id_key" UNIQUE ("player_id", "achievement_id");



ALTER TABLE ONLY "public"."achievements"
    ADD CONSTRAINT "achievements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_revenue_summary"
    ADD CONSTRAINT "admin_revenue_summary_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_revenue_summary"
    ADD CONSTRAINT "admin_revenue_summary_summary_date_key" UNIQUE ("summary_date");



ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."award_categories"
    ADD CONSTRAINT "award_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."award_categories"
    ADD CONSTRAINT "award_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."award_verification"
    ADD CONSTRAINT "award_verification_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."awards"
    ADD CONSTRAINT "awards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cfb_players"
    ADD CONSTRAINT "cfb_players_pkey" PRIMARY KEY ("espn_id");



ALTER TABLE ONLY "public"."cfb_teams"
    ADD CONSTRAINT "cfb_teams_pkey" PRIMARY KEY ("espn_id");



ALTER TABLE ONLY "public"."claim_tokens"
    ADD CONSTRAINT "claim_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."claim_tokens"
    ADD CONSTRAINT "claim_tokens_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."content_moderation_settings"
    ADD CONSTRAINT "content_moderation_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_analytics"
    ADD CONSTRAINT "daily_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_analytics"
    ADD CONSTRAINT "daily_analytics_summary_date_key" UNIQUE ("summary_date");



ALTER TABLE ONLY "public"."email_notification_settings"
    ADD CONSTRAINT "email_notification_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."integration_settings"
    ADD CONSTRAINT "integration_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."locker_access_grants"
    ADD CONSTRAINT "locker_access_grants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media"
    ADD CONSTRAINT "media_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_attachments"
    ADD CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_threads"
    ADD CONSTRAINT "message_threads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nfl_players"
    ADD CONSTRAINT "nfl_players_pkey" PRIMARY KEY ("gsis_id");



ALTER TABLE ONLY "public"."onboarding_pipeline_runs"
    ADD CONSTRAINT "onboarding_pipeline_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_revenue"
    ADD CONSTRAINT "platform_revenue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."player_achievements"
    ADD CONSTRAINT "player_achievements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."player_achievements"
    ADD CONSTRAINT "player_achievements_player_id_achievement_id_key" UNIQUE ("player_id", "achievement_id");



ALTER TABLE ONLY "public"."player_awards"
    ADD CONSTRAINT "player_awards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."player_earnings"
    ADD CONSTRAINT "player_earnings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."player_earnings"
    ADD CONSTRAINT "player_earnings_player_id_key" UNIQUE ("player_id");



ALTER TABLE ONLY "public"."player_lockers"
    ADD CONSTRAINT "player_lockers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."player_lockers"
    ADD CONSTRAINT "player_lockers_player_id_key" UNIQUE ("player_id");



ALTER TABLE ONLY "public"."player_season_stats"
    ADD CONSTRAINT "player_season_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."player_season_stats"
    ADD CONSTRAINT "player_season_stats_player_id_source_season_season_type_key" UNIQUE ("player_id", "source", "season", "season_type");



ALTER TABLE ONLY "public"."player_teammates"
    ADD CONSTRAINT "player_teammates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."player_teammates"
    ADD CONSTRAINT "player_teammates_player_id_teammate_player_id_key" UNIQUE ("player_id", "teammate_player_id");



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."publisher_revenue"
    ADD CONSTRAINT "publisher_revenue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."revenue_distributions"
    ADD CONSTRAINT "revenue_distributions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."security_settings"
    ADD CONSTRAINT "security_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."site_configuration"
    ADD CONSTRAINT "site_configuration_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_invites"
    ADD CONSTRAINT "team_invites_invite_code_key" UNIQUE ("invite_code");



ALTER TABLE ONLY "public"."team_invites"
    ADD CONSTRAINT "team_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."traffic_sources"
    ADD CONSTRAINT "traffic_sources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_activity"
    ADD CONSTRAINT "user_activity_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_devices"
    ADD CONSTRAINT "user_devices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_locations"
    ADD CONSTRAINT "user_locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_locations"
    ADD CONSTRAINT "user_locations_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_management_settings"
    ADD CONSTRAINT "user_management_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."video_engagement"
    ADD CONSTRAINT "video_engagement_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."video_tags"
    ADD CONSTRAINT "video_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."video_tags"
    ADD CONSTRAINT "video_tags_video_id_tagged_player_id_key" UNIQUE ("video_id", "tagged_player_id");



ALTER TABLE ONLY "public"."videos"
    ADD CONSTRAINT "videos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."views"
    ADD CONSTRAINT "views_pkey" PRIMARY KEY ("id");



CREATE INDEX "awards_name_year_idx" ON "public"."awards" USING "btree" ("award_name", "year");



CREATE INDEX "awards_player_idx" ON "public"."awards" USING "btree" ("player_id");



CREATE INDEX "cfb_players_cfb_team_id_idx" ON "public"."cfb_players" USING "btree" ("cfb_team_id") WHERE ("cfb_team_id" IS NOT NULL);



CREATE INDEX "cfb_players_display_name_idx" ON "public"."cfb_players" USING "btree" ("lower"("display_name"));



CREATE INDEX "cfb_players_last_synced_idx" ON "public"."cfb_players" USING "btree" ("last_synced_at");



CREATE INDEX "cfb_players_name_team_idx" ON "public"."cfb_players" USING "btree" ("lower"("display_name"), "cfb_team_id");



CREATE INDEX "cfb_teams_display_name_idx" ON "public"."cfb_teams" USING "btree" ("lower"("display_name"));



CREATE INDEX "cfb_teams_last_synced_idx" ON "public"."cfb_teams" USING "btree" ("last_synced_at");



CREATE INDEX "cfb_teams_location_idx" ON "public"."cfb_teams" USING "btree" ("lower"("location")) WHERE ("location" IS NOT NULL);



CREATE INDEX "cfb_teams_slug_idx" ON "public"."cfb_teams" USING "btree" ("slug") WHERE ("slug" IS NOT NULL);



CREATE INDEX "claim_tokens_player_idx" ON "public"."claim_tokens" USING "btree" ("player_id");



CREATE INDEX "claim_tokens_token_idx" ON "public"."claim_tokens" USING "btree" ("token");



CREATE INDEX "idx_achievement_progress_achievement_id" ON "public"."achievement_progress" USING "btree" ("achievement_id");



CREATE INDEX "idx_achievement_progress_player_id" ON "public"."achievement_progress" USING "btree" ("player_id");



CREATE INDEX "idx_achievements_category" ON "public"."achievements" USING "btree" ("category");



CREATE INDEX "idx_achievements_rarity" ON "public"."achievements" USING "btree" ("rarity");



CREATE INDEX "idx_admin_summary_date" ON "public"."admin_revenue_summary" USING "btree" ("summary_date");



CREATE INDEX "idx_articles_player" ON "public"."articles" USING "btree" ("player_id");



CREATE INDEX "idx_award_verification_award_id" ON "public"."award_verification" USING "btree" ("award_id");



CREATE INDEX "idx_daily_analytics_date" ON "public"."daily_analytics" USING "btree" ("summary_date");



CREATE INDEX "idx_locker_access_grants_code" ON "public"."locker_access_grants" USING "btree" ("access_code");



CREATE INDEX "idx_locker_access_grants_player" ON "public"."locker_access_grants" USING "btree" ("player_id");



CREATE INDEX "idx_message_attachments_message_id" ON "public"."message_attachments" USING "btree" ("message_id");



CREATE INDEX "idx_messages_created_at" ON "public"."messages" USING "btree" ("created_at");



CREATE INDEX "idx_messages_recipient_id" ON "public"."messages" USING "btree" ("recipient_id");



CREATE INDEX "idx_messages_sender_id" ON "public"."messages" USING "btree" ("sender_id");



CREATE INDEX "idx_messages_thread_created_at" ON "public"."messages" USING "btree" ("thread_id", "created_at" DESC);



CREATE INDEX "idx_messages_thread_id" ON "public"."messages" USING "btree" ("thread_id");



CREATE INDEX "idx_platform_revenue_date" ON "public"."platform_revenue" USING "btree" ("calculation_date");



CREATE INDEX "idx_platform_revenue_video_id" ON "public"."platform_revenue" USING "btree" ("video_id");



CREATE INDEX "idx_player_achievements_achievement_id" ON "public"."player_achievements" USING "btree" ("achievement_id");



CREATE INDEX "idx_player_achievements_player_id" ON "public"."player_achievements" USING "btree" ("player_id");



CREATE INDEX "idx_player_awards_category" ON "public"."player_awards" USING "btree" ("category");



CREATE INDEX "idx_player_awards_player_id" ON "public"."player_awards" USING "btree" ("player_id");



CREATE INDEX "idx_player_awards_significance" ON "public"."player_awards" USING "btree" ("significance");



CREATE INDEX "idx_player_awards_year" ON "public"."player_awards" USING "btree" ("year");



CREATE INDEX "idx_player_earnings_player_id" ON "public"."player_earnings" USING "btree" ("player_id");



CREATE INDEX "idx_player_teammates_player_id" ON "public"."player_teammates" USING "btree" ("player_id");



CREATE INDEX "idx_player_teammates_teammate_player_id" ON "public"."player_teammates" USING "btree" ("teammate_player_id");



CREATE INDEX "idx_players_slug" ON "public"."players" USING "btree" ("slug");



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "idx_profiles_id" ON "public"."profiles" USING "btree" ("id");



CREATE INDEX "idx_profiles_role" ON "public"."profiles" USING "btree" ("role");



CREATE INDEX "idx_publisher_revenue_date" ON "public"."publisher_revenue" USING "btree" ("calculation_date");



CREATE INDEX "idx_publisher_revenue_publisher" ON "public"."publisher_revenue" USING "btree" ("publisher_name");



CREATE INDEX "idx_publisher_revenue_video_id" ON "public"."publisher_revenue" USING "btree" ("video_id");



CREATE INDEX "idx_revenue_distributions_recipient" ON "public"."revenue_distributions" USING "btree" ("recipient_player_id");



CREATE INDEX "idx_revenue_distributions_video_id" ON "public"."revenue_distributions" USING "btree" ("video_id");



CREATE INDEX "idx_team_invites_invite_code" ON "public"."team_invites" USING "btree" ("invite_code");



CREATE INDEX "idx_team_invites_invitee_email" ON "public"."team_invites" USING "btree" ("invitee_email");



CREATE INDEX "idx_team_invites_inviter_user_id" ON "public"."team_invites" USING "btree" ("inviter_user_id");



CREATE INDEX "idx_team_invites_status" ON "public"."team_invites" USING "btree" ("status");



CREATE INDEX "idx_traffic_sources_created_at" ON "public"."traffic_sources" USING "btree" ("created_at");



CREATE INDEX "idx_traffic_sources_source" ON "public"."traffic_sources" USING "btree" ("source");



CREATE INDEX "idx_user_activity_created_at" ON "public"."user_activity" USING "btree" ("created_at");



CREATE INDEX "idx_user_activity_type" ON "public"."user_activity" USING "btree" ("activity_type");



CREATE INDEX "idx_user_activity_user_id" ON "public"."user_activity" USING "btree" ("user_id");



CREATE INDEX "idx_user_devices_type" ON "public"."user_devices" USING "btree" ("device_type");



CREATE INDEX "idx_user_devices_user_id" ON "public"."user_devices" USING "btree" ("user_id");



CREATE INDEX "idx_user_locations_country" ON "public"."user_locations" USING "btree" ("country");



CREATE INDEX "idx_user_locations_state" ON "public"."user_locations" USING "btree" ("state");



CREATE INDEX "idx_video_engagement_created_at" ON "public"."video_engagement" USING "btree" ("created_at");



CREATE INDEX "idx_video_engagement_type" ON "public"."video_engagement" USING "btree" ("engagement_type");



CREATE INDEX "idx_video_engagement_video_id" ON "public"."video_engagement" USING "btree" ("video_id");



CREATE INDEX "idx_video_tags_tagged_player_id" ON "public"."video_tags" USING "btree" ("tagged_player_id");



CREATE INDEX "idx_video_tags_video_id" ON "public"."video_tags" USING "btree" ("video_id");



CREATE INDEX "idx_videos_player" ON "public"."videos" USING "btree" ("player_id");



CREATE INDEX "idx_views_player" ON "public"."views" USING "btree" ("player_id");



CREATE INDEX "media_player_idx" ON "public"."media" USING "btree" ("player_id");



CREATE INDEX "media_player_kind_idx" ON "public"."media" USING "btree" ("player_id", "kind");



CREATE UNIQUE INDEX "media_player_kind_url_idx" ON "public"."media" USING "btree" ("player_id", "kind", "url");



CREATE INDEX "media_player_order_idx" ON "public"."media" USING "btree" ("player_id", "display_order");



CREATE INDEX "nfl_players_display_name_idx" ON "public"."nfl_players" USING "btree" ("lower"("display_name"));



CREATE INDEX "nfl_players_espn_id_idx" ON "public"."nfl_players" USING "btree" ("espn_id") WHERE ("espn_id" IS NOT NULL);



CREATE INDEX "nfl_players_last_synced_idx" ON "public"."nfl_players" USING "btree" ("last_synced_at");



CREATE INDEX "nfl_players_name_college_idx" ON "public"."nfl_players" USING "btree" ("lower"("display_name"), "lower"("college_name"));



CREATE INDEX "nfl_players_pfr_id_idx" ON "public"."nfl_players" USING "btree" ("pfr_id") WHERE ("pfr_id" IS NOT NULL);



CREATE UNIQUE INDEX "onboarding_pipeline_runs_active_claim_token_idx" ON "public"."onboarding_pipeline_runs" USING "btree" ("claim_token") WHERE (("claim_token" IS NOT NULL) AND ("completed_at" IS NULL));



CREATE UNIQUE INDEX "onboarding_pipeline_runs_claim_user_idx" ON "public"."onboarding_pipeline_runs" USING "btree" ("claim_token", "user_id") WHERE ("claim_token" IS NOT NULL);



CREATE INDEX "pipeline_runs_player_idx" ON "public"."onboarding_pipeline_runs" USING "btree" ("player_id");



CREATE INDEX "pipeline_runs_status_idx" ON "public"."onboarding_pipeline_runs" USING "btree" ("status");



CREATE INDEX "pipeline_runs_user_idx" ON "public"."onboarding_pipeline_runs" USING "btree" ("user_id");



CREATE UNIQUE INDEX "player_awards_player_identity_idx" ON "public"."player_awards" USING "btree" ("player_id", "lower"("name"), COALESCE("year", '-1'::integer), COALESCE("organization", ''::"text"));



CREATE INDEX "player_season_stats_player_idx" ON "public"."player_season_stats" USING "btree" ("player_id");



CREATE INDEX "player_season_stats_player_level_idx" ON "public"."player_season_stats" USING "btree" ("player_id", "level");



CREATE INDEX "players_cfb_team_id_idx" ON "public"."players" USING "btree" ("cfb_team_id") WHERE ("cfb_team_id" IS NOT NULL);



CREATE INDEX "players_gsis_id_idx" ON "public"."players" USING "btree" ("gsis_id") WHERE ("gsis_id" IS NOT NULL);



CREATE INDEX "players_school_id_idx" ON "public"."players" USING "btree" ("school_id");



CREATE INDEX "players_slug_idx" ON "public"."players" USING "btree" ("slug");



CREATE INDEX "players_team_id_idx" ON "public"."players" USING "btree" ("team_id");



CREATE INDEX "players_user_id_idx" ON "public"."players" USING "btree" ("user_id");



CREATE INDEX "players_visibility_idx" ON "public"."players" USING "btree" ("visibility");



CREATE INDEX "schools_name_idx" ON "public"."schools" USING "btree" ("name");



CREATE INDEX "schools_slug_idx" ON "public"."schools" USING "btree" ("slug");



CREATE INDEX "teams_name_idx" ON "public"."teams" USING "btree" ("name");



CREATE INDEX "teams_school_id_idx" ON "public"."teams" USING "btree" ("school_id");



CREATE INDEX "teams_slug_idx" ON "public"."teams" USING "btree" ("slug");



CREATE OR REPLACE TRIGGER "create_reciprocal_teammate_trigger" AFTER INSERT ON "public"."player_teammates" FOR EACH ROW EXECUTE FUNCTION "public"."create_reciprocal_teammate"();



CREATE OR REPLACE TRIGGER "messages_update_thread_last_message_at_delete" AFTER DELETE ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_thread_last_message_at"();



CREATE OR REPLACE TRIGGER "messages_update_thread_last_message_at_insert" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_thread_last_message_at"();



CREATE OR REPLACE TRIGGER "messages_update_thread_last_message_at_update" AFTER UPDATE ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_thread_last_message_at"();



CREATE OR REPLACE TRIGGER "pipeline_runs_set_updated_at" BEFORE UPDATE ON "public"."onboarding_pipeline_runs" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_now"();



CREATE OR REPLACE TRIGGER "set_profile_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_profile_updated_at"();



CREATE OR REPLACE TRIGGER "trg_articles_updated" BEFORE UPDATE ON "public"."articles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_lockers_updated" BEFORE UPDATE ON "public"."player_lockers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_players_updated" BEFORE UPDATE ON "public"."players" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_profiles_updated" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_videos_updated" BEFORE UPDATE ON "public"."videos" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "update_players_updated_at" BEFORE UPDATE ON "public"."players" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_settings_updated_at" BEFORE UPDATE ON "public"."user_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."achievement_progress"
    ADD CONSTRAINT "achievement_progress_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."achievement_progress"
    ADD CONSTRAINT "achievement_progress_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."award_verification"
    ADD CONSTRAINT "award_verification_award_id_fkey" FOREIGN KEY ("award_id") REFERENCES "public"."player_awards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."award_verification"
    ADD CONSTRAINT "award_verification_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."cfb_players"
    ADD CONSTRAINT "cfb_players_cfb_team_id_fkey" FOREIGN KEY ("cfb_team_id") REFERENCES "public"."cfb_teams"("espn_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."claim_tokens"
    ADD CONSTRAINT "claim_tokens_claimed_by_fkey" FOREIGN KEY ("claimed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."claim_tokens"
    ADD CONSTRAINT "claim_tokens_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."locker_access_grants"
    ADD CONSTRAINT "locker_access_grants_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."media"
    ADD CONSTRAINT "media_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_attachments"
    ADD CONSTRAINT "message_attachments_message_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_attachments"
    ADD CONSTRAINT "message_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_recipient_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_thread_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."message_threads"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."message_threads"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."onboarding_pipeline_runs"
    ADD CONSTRAINT "onboarding_pipeline_runs_claim_player_id_fkey" FOREIGN KEY ("claim_player_id") REFERENCES "public"."players"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."onboarding_pipeline_runs"
    ADD CONSTRAINT "onboarding_pipeline_runs_claim_token_fkey" FOREIGN KEY ("claim_token") REFERENCES "public"."claim_tokens"("token") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."onboarding_pipeline_runs"
    ADD CONSTRAINT "onboarding_pipeline_runs_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."onboarding_pipeline_runs"
    ADD CONSTRAINT "onboarding_pipeline_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."platform_revenue"
    ADD CONSTRAINT "platform_revenue_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."player_achievements"
    ADD CONSTRAINT "player_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."player_achievements"
    ADD CONSTRAINT "player_achievements_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."player_awards"
    ADD CONSTRAINT "player_awards_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."player_earnings"
    ADD CONSTRAINT "player_earnings_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."player_lockers"
    ADD CONSTRAINT "player_lockers_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."player_lockers"
    ADD CONSTRAINT "player_lockers_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."player_season_stats"
    ADD CONSTRAINT "player_season_stats_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."player_teammates"
    ADD CONSTRAINT "player_teammates_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."player_teammates"
    ADD CONSTRAINT "player_teammates_teammate_player_id_fkey" FOREIGN KEY ("teammate_player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_cfb_team_id_fkey" FOREIGN KEY ("cfb_team_id") REFERENCES "public"."cfb_teams"("espn_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_gsis_id_fkey" FOREIGN KEY ("gsis_id") REFERENCES "public"."nfl_players"("gsis_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_auth_users_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."publisher_revenue"
    ADD CONSTRAINT "publisher_revenue_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."publisher_revenue"
    ADD CONSTRAINT "publisher_revenue_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."revenue_distributions"
    ADD CONSTRAINT "revenue_distributions_recipient_player_id_fkey" FOREIGN KEY ("recipient_player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."revenue_distributions"
    ADD CONSTRAINT "revenue_distributions_source_player_id_fkey" FOREIGN KEY ("source_player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."revenue_distributions"
    ADD CONSTRAINT "revenue_distributions_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_invites"
    ADD CONSTRAINT "team_invites_inviter_player_id_fkey" FOREIGN KEY ("inviter_player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_invites"
    ADD CONSTRAINT "team_invites_inviter_user_id_fkey" FOREIGN KEY ("inviter_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."traffic_sources"
    ADD CONSTRAINT "traffic_sources_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_activity"
    ADD CONSTRAINT "user_activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_devices"
    ADD CONSTRAINT "user_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_locations"
    ADD CONSTRAINT "user_locations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_engagement"
    ADD CONSTRAINT "video_engagement_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."video_engagement"
    ADD CONSTRAINT "video_engagement_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_tags"
    ADD CONSTRAINT "video_tags_tagged_player_id_fkey" FOREIGN KEY ("tagged_player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_tags"
    ADD CONSTRAINT "video_tags_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."videos"
    ADD CONSTRAINT "videos_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."videos"
    ADD CONSTRAINT "videos_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE SET NULL;



CREATE POLICY "Achievements are viewable by everyone" ON "public"."achievements" FOR SELECT USING (true);



CREATE POLICY "Admin can view all traffic sources" ON "public"."traffic_sources" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin can view all user activity" ON "public"."user_activity" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin can view all user devices" ON "public"."user_devices" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin can view all user locations" ON "public"."user_locations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin can view all video engagement" ON "public"."video_engagement" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin can view daily analytics" ON "public"."daily_analytics" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can read content moderation settings" ON "public"."content_moderation_settings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can read email notification settings" ON "public"."email_notification_settings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can read integration settings" ON "public"."integration_settings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can read security settings" ON "public"."security_settings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can read site configuration" ON "public"."site_configuration" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can read system settings" ON "public"."system_settings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can read user management settings" ON "public"."user_management_settings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all awards" ON "public"."player_awards" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can write content moderation settings" ON "public"."content_moderation_settings" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can write email notification settings" ON "public"."email_notification_settings" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can write integration settings" ON "public"."integration_settings" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can write security settings" ON "public"."security_settings" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can write site configuration" ON "public"."site_configuration" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can write system settings" ON "public"."system_settings" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can write user management settings" ON "public"."user_management_settings" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "Allow all attachment operations" ON "public"."message_attachments" USING (true);



CREATE POLICY "Allow all message operations" ON "public"."messages" USING (true);



CREATE POLICY "Allow all profile operations" ON "public"."profiles" USING (true);



CREATE POLICY "Allow all thread operations" ON "public"."message_threads" USING (true);



CREATE POLICY "Anyone can view video tags" ON "public"."video_tags" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can create invites" ON "public"."team_invites" FOR INSERT WITH CHECK (("auth"."uid"() = "inviter_user_id"));



CREATE POLICY "Award categories are viewable by everyone" ON "public"."award_categories" FOR SELECT USING (true);



ALTER TABLE "public"."Colleges" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Only admins can view admin summaries" ON "public"."admin_revenue_summary" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can view platform revenue" ON "public"."platform_revenue" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can view publisher revenue" ON "public"."publisher_revenue" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Players can add teammates" ON "public"."player_teammates" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'player'::"text") AND ("profiles"."player_id" = "player_teammates"."player_id")))));



CREATE POLICY "Players can insert their own awards" ON "public"."player_awards" FOR INSERT WITH CHECK (("player_id" IN ( SELECT "players"."id"
   FROM "public"."players"
  WHERE ("players"."user_id" = "auth"."uid"()))));



CREATE POLICY "Players can manage own access grants" ON "public"."locker_access_grants" USING (("player_id" IN ( SELECT "players"."id"
   FROM "public"."players"
  WHERE ("players"."user_id" = "auth"."uid"())))) WITH CHECK (("player_id" IN ( SELECT "players"."id"
   FROM "public"."players"
  WHERE ("players"."user_id" = "auth"."uid"()))));



CREATE POLICY "Players can update their teammates" ON "public"."player_teammates" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."players" "p"
  WHERE (("p"."id" = "player_teammates"."player_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "Players can view their own achievements" ON "public"."player_achievements" FOR SELECT USING (("player_id" IN ( SELECT "players"."id"
   FROM "public"."players"
  WHERE ("players"."user_id" = "auth"."uid"()))));



CREATE POLICY "Players can view their own awards" ON "public"."player_awards" FOR SELECT USING (("player_id" IN ( SELECT "players"."id"
   FROM "public"."players"
  WHERE ("players"."user_id" = "auth"."uid"()))));



CREATE POLICY "Players can view their own earnings" ON "public"."player_earnings" FOR SELECT USING (("player_id" IN ( SELECT "players"."id"
   FROM "public"."players"
  WHERE ("players"."user_id" = "auth"."uid"()))));



CREATE POLICY "Players can view their own progress" ON "public"."achievement_progress" FOR SELECT USING (("player_id" IN ( SELECT "players"."id"
   FROM "public"."players"
  WHERE ("players"."user_id" = "auth"."uid"()))));



CREATE POLICY "Players can view their revenue distributions" ON "public"."revenue_distributions" FOR SELECT USING (("recipient_player_id" IN ( SELECT "players"."id"
   FROM "public"."players"
  WHERE ("players"."user_id" = "auth"."uid"()))));



CREATE POLICY "Public players are viewable by everyone" ON "public"."players" FOR SELECT USING (("visibility" = true));



CREATE POLICY "Public profiles are insertable by everyone." ON "public"."Colleges" FOR INSERT WITH CHECK (true);



CREATE POLICY "Public profiles are updatable by everyone." ON "public"."Colleges" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "Public profiles are viewable by everyone." ON "public"."Colleges" FOR SELECT USING (true);



CREATE POLICY "Public schools are viewable by everyone" ON "public"."schools" FOR SELECT USING (true);



CREATE POLICY "Public teams are viewable by everyone" ON "public"."teams" FOR SELECT USING (true);



CREATE POLICY "Users can create players" ON "public"."players" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can delete their own players" ON "public"."players" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own settings" ON "public"."user_settings" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert messages" ON "public"."messages" FOR INSERT WITH CHECK (("sender_id" = "auth"."uid"()));



CREATE POLICY "Users can insert their own settings" ON "public"."user_settings" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update invites sent to them" ON "public"."team_invites" FOR UPDATE USING (("invitee_email" IN ( SELECT "profiles"."email"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update their own messages" ON "public"."messages" FOR UPDATE USING (("auth"."uid"() = "sender_id"));



CREATE POLICY "Users can update their own players" ON "public"."players" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own settings" ON "public"."user_settings" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view invites sent to them" ON "public"."team_invites" FOR SELECT USING (("invitee_email" IN ( SELECT "profiles"."email"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own messages" ON "public"."messages" FOR SELECT USING ((("auth"."uid"() = "sender_id") OR ("auth"."uid"() = "recipient_id")));



CREATE POLICY "Users can view their own settings" ON "public"."user_settings" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their sent invites" ON "public"."team_invites" FOR SELECT USING (("inviter_user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their teammates" ON "public"."player_teammates" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."players" "p"
  WHERE (("p"."id" = "player_teammates"."player_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "Verification records are viewable by award owners" ON "public"."award_verification" FOR SELECT USING (("award_id" IN ( SELECT "player_awards"."id"
   FROM "public"."player_awards"
  WHERE ("player_awards"."player_id" IN ( SELECT "players"."id"
           FROM "public"."players"
          WHERE ("players"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Video owner can manage tags" ON "public"."video_tags" USING (("video_id" IN ( SELECT "videos"."id"
   FROM "public"."videos"
  WHERE ("videos"."owner_user_id" = "auth"."uid"()))));



ALTER TABLE "public"."achievement_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."achievements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_revenue_summary" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."articles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "articles_owner_insert" ON "public"."articles" FOR INSERT WITH CHECK (("owner_user_id" = "auth"."uid"()));



CREATE POLICY "articles_owner_update" ON "public"."articles" FOR UPDATE USING ((("owner_user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text"))))));



CREATE POLICY "attachments_admin_all" ON "public"."message_attachments" TO "authenticated" USING ((( SELECT ("auth"."jwt"() ->> 'user_role'::"text")) = 'admin'::"text")) WITH CHECK ((( SELECT ("auth"."jwt"() ->> 'user_role'::"text")) = 'admin'::"text"));



CREATE POLICY "attachments_delete_participant" ON "public"."message_attachments" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."messages" "m"
  WHERE (("m"."id" = "message_attachments"."message_id") AND ((( SELECT "auth"."uid"() AS "uid") = "m"."sender_id") OR (( SELECT "auth"."uid"() AS "uid") = "m"."recipient_id"))))));



CREATE POLICY "attachments_insert_if_sender" ON "public"."message_attachments" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."messages" "m"
  WHERE (("m"."id" = "message_attachments"."message_id") AND (( SELECT "auth"."uid"() AS "uid") = "m"."sender_id")))));



CREATE POLICY "attachments_select_participant" ON "public"."message_attachments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."messages" "m"
  WHERE (("m"."id" = "message_attachments"."message_id") AND ((( SELECT "auth"."uid"() AS "uid") = "m"."sender_id") OR (( SELECT "auth"."uid"() AS "uid") = "m"."recipient_id"))))));



ALTER TABLE "public"."award_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."award_verification" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."awards" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "awards_public_select" ON "public"."awards" FOR SELECT USING (true);



ALTER TABLE "public"."cfb_players" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cfb_players_public_select" ON "public"."cfb_players" FOR SELECT USING (true);



ALTER TABLE "public"."cfb_teams" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cfb_teams_public_select" ON "public"."cfb_teams" FOR SELECT USING (true);



ALTER TABLE "public"."claim_tokens" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "claim_tokens_self_select" ON "public"."claim_tokens" FOR SELECT USING (("claimed_by" = "auth"."uid"()));



ALTER TABLE "public"."content_moderation_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_notification_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."integration_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."locker_access_grants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lockers_owner_update" ON "public"."player_lockers" FOR UPDATE USING ((("owner_user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text"))))));



CREATE POLICY "lockers_public_read" ON "public"."player_lockers" FOR SELECT USING (true);



ALTER TABLE "public"."media" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "media_owner_delete" ON "public"."media" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."players" "p"
  WHERE (("p"."id" = "media"."player_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "media_owner_insert" ON "public"."media" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."players" "p"
  WHERE (("p"."id" = "media"."player_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "media_owner_update" ON "public"."media" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."players" "p"
  WHERE (("p"."id" = "media"."player_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "media_public_select" ON "public"."media" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."players" "p"
  WHERE (("p"."id" = "media"."player_id") AND ("p"."visibility" = true)))));



ALTER TABLE "public"."message_attachments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_threads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "messages_admin_all" ON "public"."messages" TO "authenticated" USING ((( SELECT ("auth"."jwt"() ->> 'user_role'::"text")) = 'admin'::"text")) WITH CHECK ((( SELECT ("auth"."jwt"() ->> 'user_role'::"text")) = 'admin'::"text"));



CREATE POLICY "messages_delete_sender" ON "public"."messages" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "sender_id"));



CREATE POLICY "messages_insert_sender" ON "public"."messages" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "sender_id"));



CREATE POLICY "messages_select_participant" ON "public"."messages" FOR SELECT TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "sender_id") OR (( SELECT "auth"."uid"() AS "uid") = "recipient_id")));



CREATE POLICY "messages_update_participant" ON "public"."messages" FOR UPDATE TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "sender_id") OR (( SELECT "auth"."uid"() AS "uid") = "recipient_id"))) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "sender_id") OR (( SELECT "auth"."uid"() AS "uid") = "recipient_id")));



ALTER TABLE "public"."nfl_players" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "nfl_players_public_select" ON "public"."nfl_players" FOR SELECT USING (true);



ALTER TABLE "public"."onboarding_pipeline_runs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pipeline_runs_owner_insert" ON "public"."onboarding_pipeline_runs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "pipeline_runs_owner_select" ON "public"."onboarding_pipeline_runs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "pipeline_runs_owner_update" ON "public"."onboarding_pipeline_runs" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."platform_revenue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."player_achievements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."player_awards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."player_earnings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."player_lockers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."player_season_stats" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "player_season_stats_public_select" ON "public"."player_season_stats" FOR SELECT USING (true);



ALTER TABLE "public"."player_teammates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."players" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "players_owner_insert" ON "public"."players" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "players_owner_update" ON "public"."players" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "players_public_read" ON "public"."players" FOR SELECT USING (true);



CREATE POLICY "players_public_select" ON "public"."players" FOR SELECT USING ((("visibility" = true) OR ("user_id" = "auth"."uid"())));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_admin_all" ON "public"."profiles" TO "authenticated" USING ((( SELECT ("auth"."jwt"() ->> 'user_role'::"text")) = 'admin'::"text")) WITH CHECK ((( SELECT ("auth"."jwt"() ->> 'user_role'::"text")) = 'admin'::"text"));



CREATE POLICY "profiles_delete_own" ON "public"."profiles" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "profiles_insert_own" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "profiles_public_read" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "profiles_self_insert" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "profiles_self_update" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



ALTER TABLE "public"."publisher_revenue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."revenue_distributions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."schools" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."security_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."site_configuration" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "threads_admin_all" ON "public"."message_threads" TO "authenticated" USING ((( SELECT ("auth"."jwt"() ->> 'user_role'::"text")) = 'admin'::"text")) WITH CHECK ((( SELECT ("auth"."jwt"() ->> 'user_role'::"text")) = 'admin'::"text"));



CREATE POLICY "threads_insert_authenticated" ON "public"."message_threads" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "threads_select_participant" ON "public"."message_threads" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."messages" "m"
  WHERE (("m"."thread_id" = "message_threads"."id") AND ((( SELECT "auth"."uid"() AS "uid") = "m"."sender_id") OR (( SELECT "auth"."uid"() AS "uid") = "m"."recipient_id"))))));



CREATE POLICY "threads_update_participant" ON "public"."message_threads" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."messages" "m"
  WHERE (("m"."thread_id" = "message_threads"."id") AND ((( SELECT "auth"."uid"() AS "uid") = "m"."sender_id") OR (( SELECT "auth"."uid"() AS "uid") = "m"."recipient_id")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."messages" "m"
  WHERE (("m"."thread_id" = "message_threads"."id") AND ((( SELECT "auth"."uid"() AS "uid") = "m"."sender_id") OR (( SELECT "auth"."uid"() AS "uid") = "m"."recipient_id"))))));



ALTER TABLE "public"."traffic_sources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_activity" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_devices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_management_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."video_engagement" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."video_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."videos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "videos_owner_insert" ON "public"."videos" FOR INSERT WITH CHECK (("owner_user_id" = "auth"."uid"()));



CREATE POLICY "videos_owner_update" ON "public"."videos" FOR UPDATE USING ((("owner_user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text"))))));



ALTER TABLE "public"."views" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "views_insert_any" ON "public"."views" FOR INSERT WITH CHECK (true);



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."append_pipeline_event"("p_run_id" "uuid", "p_event" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."append_pipeline_event"("p_run_id" "uuid", "p_event" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."append_pipeline_event"("p_run_id" "uuid", "p_event" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."claim_pipeline_run"("p_run_id" "uuid", "p_reclaim_seconds" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."claim_pipeline_run"("p_run_id" "uuid", "p_reclaim_seconds" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."claim_pipeline_run"("p_run_id" "uuid", "p_reclaim_seconds" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_reciprocal_teammate"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_reciprocal_teammate"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_reciprocal_teammate"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_slug"("input_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_slug"("input_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_slug"("input_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_profile_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_profile_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_profile_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."publish_onboarding_run"("p_run_id" "uuid", "p_user_id" "uuid", "p_player" "jsonb", "p_awards" "jsonb", "p_headshot_url" "text", "p_photos" "jsonb", "p_claim_player_id" "uuid", "p_claim_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."publish_onboarding_run"("p_run_id" "uuid", "p_user_id" "uuid", "p_player" "jsonb", "p_awards" "jsonb", "p_headshot_url" "text", "p_photos" "jsonb", "p_claim_player_id" "uuid", "p_claim_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."publish_onboarding_run"("p_run_id" "uuid", "p_user_id" "uuid", "p_player" "jsonb", "p_awards" "jsonb", "p_headshot_url" "text", "p_photos" "jsonb", "p_claim_player_id" "uuid", "p_claim_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at_now"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at_now"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at_now"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_thread_last_message_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."Colleges" TO "anon";
GRANT ALL ON TABLE "public"."Colleges" TO "authenticated";
GRANT ALL ON TABLE "public"."Colleges" TO "service_role";



GRANT ALL ON SEQUENCE "public"."Colleges_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."Colleges_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Colleges_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."achievement_progress" TO "anon";
GRANT ALL ON TABLE "public"."achievement_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."achievement_progress" TO "service_role";



GRANT ALL ON TABLE "public"."achievements" TO "anon";
GRANT ALL ON TABLE "public"."achievements" TO "authenticated";
GRANT ALL ON TABLE "public"."achievements" TO "service_role";



GRANT ALL ON TABLE "public"."admin_revenue_summary" TO "anon";
GRANT ALL ON TABLE "public"."admin_revenue_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_revenue_summary" TO "service_role";



GRANT ALL ON TABLE "public"."articles" TO "anon";
GRANT ALL ON TABLE "public"."articles" TO "authenticated";
GRANT ALL ON TABLE "public"."articles" TO "service_role";



GRANT ALL ON TABLE "public"."award_categories" TO "anon";
GRANT ALL ON TABLE "public"."award_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."award_categories" TO "service_role";



GRANT ALL ON TABLE "public"."award_verification" TO "anon";
GRANT ALL ON TABLE "public"."award_verification" TO "authenticated";
GRANT ALL ON TABLE "public"."award_verification" TO "service_role";



GRANT ALL ON TABLE "public"."awards" TO "anon";
GRANT ALL ON TABLE "public"."awards" TO "authenticated";
GRANT ALL ON TABLE "public"."awards" TO "service_role";



GRANT ALL ON SEQUENCE "public"."awards_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."awards_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."awards_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."cfb_players" TO "anon";
GRANT ALL ON TABLE "public"."cfb_players" TO "authenticated";
GRANT ALL ON TABLE "public"."cfb_players" TO "service_role";



GRANT ALL ON TABLE "public"."cfb_teams" TO "anon";
GRANT ALL ON TABLE "public"."cfb_teams" TO "authenticated";
GRANT ALL ON TABLE "public"."cfb_teams" TO "service_role";



GRANT ALL ON TABLE "public"."claim_tokens" TO "anon";
GRANT ALL ON TABLE "public"."claim_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."claim_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."content_moderation_settings" TO "anon";
GRANT ALL ON TABLE "public"."content_moderation_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."content_moderation_settings" TO "service_role";



GRANT ALL ON TABLE "public"."daily_analytics" TO "anon";
GRANT ALL ON TABLE "public"."daily_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."email_notification_settings" TO "anon";
GRANT ALL ON TABLE "public"."email_notification_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."email_notification_settings" TO "service_role";



GRANT ALL ON TABLE "public"."integration_settings" TO "anon";
GRANT ALL ON TABLE "public"."integration_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."integration_settings" TO "service_role";



GRANT ALL ON TABLE "public"."locker_access_grants" TO "anon";
GRANT ALL ON TABLE "public"."locker_access_grants" TO "authenticated";
GRANT ALL ON TABLE "public"."locker_access_grants" TO "service_role";



GRANT ALL ON TABLE "public"."media" TO "anon";
GRANT ALL ON TABLE "public"."media" TO "authenticated";
GRANT ALL ON TABLE "public"."media" TO "service_role";



GRANT ALL ON TABLE "public"."message_attachments" TO "anon";
GRANT ALL ON TABLE "public"."message_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."message_attachments" TO "service_role";



GRANT ALL ON TABLE "public"."message_threads" TO "anon";
GRANT ALL ON TABLE "public"."message_threads" TO "authenticated";
GRANT ALL ON TABLE "public"."message_threads" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."nfl_players" TO "anon";
GRANT ALL ON TABLE "public"."nfl_players" TO "authenticated";
GRANT ALL ON TABLE "public"."nfl_players" TO "service_role";



GRANT ALL ON TABLE "public"."onboarding_pipeline_runs" TO "anon";
GRANT ALL ON TABLE "public"."onboarding_pipeline_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."onboarding_pipeline_runs" TO "service_role";



GRANT ALL ON TABLE "public"."platform_revenue" TO "anon";
GRANT ALL ON TABLE "public"."platform_revenue" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_revenue" TO "service_role";



GRANT ALL ON TABLE "public"."player_achievements" TO "anon";
GRANT ALL ON TABLE "public"."player_achievements" TO "authenticated";
GRANT ALL ON TABLE "public"."player_achievements" TO "service_role";



GRANT ALL ON TABLE "public"."player_awards" TO "anon";
GRANT ALL ON TABLE "public"."player_awards" TO "authenticated";
GRANT ALL ON TABLE "public"."player_awards" TO "service_role";



GRANT ALL ON TABLE "public"."player_earnings" TO "anon";
GRANT ALL ON TABLE "public"."player_earnings" TO "authenticated";
GRANT ALL ON TABLE "public"."player_earnings" TO "service_role";



GRANT ALL ON TABLE "public"."player_lockers" TO "anon";
GRANT ALL ON TABLE "public"."player_lockers" TO "authenticated";
GRANT ALL ON TABLE "public"."player_lockers" TO "service_role";



GRANT ALL ON TABLE "public"."player_season_stats" TO "anon";
GRANT ALL ON TABLE "public"."player_season_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."player_season_stats" TO "service_role";



GRANT ALL ON SEQUENCE "public"."player_season_stats_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."player_season_stats_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."player_season_stats_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."player_teammates" TO "anon";
GRANT ALL ON TABLE "public"."player_teammates" TO "authenticated";
GRANT ALL ON TABLE "public"."player_teammates" TO "service_role";



GRANT ALL ON TABLE "public"."players" TO "anon";
GRANT ALL ON TABLE "public"."players" TO "authenticated";
GRANT ALL ON TABLE "public"."players" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."publisher_revenue" TO "anon";
GRANT ALL ON TABLE "public"."publisher_revenue" TO "authenticated";
GRANT ALL ON TABLE "public"."publisher_revenue" TO "service_role";



GRANT ALL ON TABLE "public"."revenue_distributions" TO "anon";
GRANT ALL ON TABLE "public"."revenue_distributions" TO "authenticated";
GRANT ALL ON TABLE "public"."revenue_distributions" TO "service_role";



GRANT ALL ON TABLE "public"."schools" TO "anon";
GRANT ALL ON TABLE "public"."schools" TO "authenticated";
GRANT ALL ON TABLE "public"."schools" TO "service_role";



GRANT ALL ON TABLE "public"."security_settings" TO "anon";
GRANT ALL ON TABLE "public"."security_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."security_settings" TO "service_role";



GRANT ALL ON TABLE "public"."site_configuration" TO "anon";
GRANT ALL ON TABLE "public"."site_configuration" TO "authenticated";
GRANT ALL ON TABLE "public"."site_configuration" TO "service_role";



GRANT ALL ON TABLE "public"."system_settings" TO "anon";
GRANT ALL ON TABLE "public"."system_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."system_settings" TO "service_role";



GRANT ALL ON TABLE "public"."team_invites" TO "anon";
GRANT ALL ON TABLE "public"."team_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."team_invites" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."traffic_sources" TO "anon";
GRANT ALL ON TABLE "public"."traffic_sources" TO "authenticated";
GRANT ALL ON TABLE "public"."traffic_sources" TO "service_role";



GRANT ALL ON TABLE "public"."user_activity" TO "anon";
GRANT ALL ON TABLE "public"."user_activity" TO "authenticated";
GRANT ALL ON TABLE "public"."user_activity" TO "service_role";



GRANT ALL ON TABLE "public"."user_devices" TO "anon";
GRANT ALL ON TABLE "public"."user_devices" TO "authenticated";
GRANT ALL ON TABLE "public"."user_devices" TO "service_role";



GRANT ALL ON TABLE "public"."user_locations" TO "anon";
GRANT ALL ON TABLE "public"."user_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."user_locations" TO "service_role";



GRANT ALL ON TABLE "public"."user_management_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_management_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_management_settings" TO "service_role";



GRANT ALL ON TABLE "public"."user_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_settings" TO "service_role";



GRANT ALL ON TABLE "public"."video_engagement" TO "anon";
GRANT ALL ON TABLE "public"."video_engagement" TO "authenticated";
GRANT ALL ON TABLE "public"."video_engagement" TO "service_role";



GRANT ALL ON TABLE "public"."video_tags" TO "anon";
GRANT ALL ON TABLE "public"."video_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."video_tags" TO "service_role";



GRANT ALL ON TABLE "public"."videos" TO "anon";
GRANT ALL ON TABLE "public"."videos" TO "authenticated";
GRANT ALL ON TABLE "public"."videos" TO "service_role";



GRANT ALL ON TABLE "public"."views" TO "anon";
GRANT ALL ON TABLE "public"."views" TO "authenticated";
GRANT ALL ON TABLE "public"."views" TO "service_role";



GRANT ALL ON SEQUENCE "public"."views_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."views_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."views_id_seq" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
