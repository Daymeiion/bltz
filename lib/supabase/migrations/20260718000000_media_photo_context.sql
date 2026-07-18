-- =============================================================================
-- 20260718000000_media_photo_context.sql
-- Add photo sorting metadata that is separate from an athlete's playing level.
--
-- competition_level describes where the asset belongs in the athlete's playing
-- career. content_context describes non-competition/media context such as
-- community, training, interviews, or off-field moments.
-- =============================================================================

alter table media
  add column if not exists competition_level text
    check (competition_level is null or competition_level in ('hs', 'cfb', 'pro')),
  add column if not exists content_context text
    check (
      content_context is null
      or content_context in (
        'game',
        'practice',
        'media_day',
        'community',
        'training',
        'lifestyle',
        'interview',
        'off_field'
      )
    );

update media
   set content_context = 'off_field'
 where kind = 'photo'
   and content_context is null
   and (
     title ilike '%off field%'
     or title ilike '%off-field%'
     or title ilike '%community%'
     or title ilike '%interview%'
     or title ilike '%training%'
     or title ilike '%lifestyle%'
     or title ilike '%behind the scenes%'
     or title ilike '%behind-the-scenes%'
   );

update media
   set competition_level = 'pro'
 where kind = 'photo'
   and competition_level is null
   and (
     title ilike '%pro%'
     or title ilike '%nfl%'
     or credits ilike '%nfl%'
     or source_url ilike '%nfl%'
   );

update media
   set competition_level = 'cfb'
 where kind = 'photo'
   and competition_level is null
   and content_context is distinct from 'off_field';

create index if not exists media_player_photo_context_idx
  on media(player_id, competition_level, content_context, display_order)
  where kind = 'photo';
