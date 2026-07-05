# BLTZ icon set

81 SVGs from the [Lucide](https://lucide.dev/) library, the icon set BLTZ uses
across the app. Each filename below maps 1:1 to a Lucide icon name — replace
any SVG in this folder with your own (same filename) and the app will pick it
up wherever the icon appears.

If you want to switch to animated icons later, ship them as Lottie JSON or
animated SVG and we'll wire them in per-component.

## Onboarding flow (Step 2 — Career sweep / MagicMomentLoader)

The five "source scoreboard" cards each use one of these:

- `shield.svg` — NFL Roster card
- `graduation-cap.svg` — College Roster card
- `book-open.svg` — Wikipedia card
- `tv.svg` — ESPN card
- `video.svg` — Highlights card

Found-data panel stats:

- `calendar.svg` — Birthdate
- `home.svg` — Hometown
- `users.svg` — Pro teams
- `trophy.svg` — Awards
- `arrow-right.svg` — "Review my locker" CTA chevron

## Onboarding flow (other steps)

- `check.svg` — slug-available indicator, verification rail checkmarks
- `check-circle-2.svg` — "Go live" completion step
- `loader-2.svg` — spinner during async checks
- `upload.svg` — Headshot uploader
- `lock.svg` — Verification rail (locked field)
- `shield-check.svg` — Verification rail (verified field), Review form
- `alert-triangle.svg` — Validation warnings
- `eye.svg` — Public preview / view counts
- `pencil.svg` — Edit affordance
- `x.svg` — Slug unavailable, modal close

## Player locker / public page

- `heart.svg` — Believer/follow button
- `copy.svg` — Share modal copy-link
- `qr-code.svg` — Share modal QR code
- `user.svg` — Generic user placeholder
- `zoom-in.svg` — Media gallery
- `download.svg` — Media download
- `external-link.svg` — Outbound links

## Video player

- `play.svg` — Play button
- `pause.svg` — Pause button
- `skip-back.svg` / `skip-forward.svg` — Scrub controls
- `volume-2.svg` / `volume-x.svg` — Audio on/muted
- `maximize.svg` — Fullscreen
- `picture-in-picture.svg` — PiP mode
- `bookmark.svg` / `bookmark-plus.svg` — Save / save-new
- `share.svg` / `share-2.svg` — Share variants
- `list.svg` — Playlist / queue
- `film.svg` — Highlight reel
- `bell.svg` — Subscribe / notifications
- `thumbs-up.svg` / `thumbs-down.svg` — Reactions
- `more-vertical.svg` / `more-horizontal.svg` — Overflow menus

## Dashboard / admin

- `award.svg` — Achievements / stats card
- `trending-up.svg` — Growth / trend stat
- `circle-dollar-sign.svg` — Revenue / earnings
- `video.svg` — Video count stat (reused from onboarding)
- `building-2.svg` — Organization / brand
- `school.svg` — School affiliation
- `ban.svg` — Block / disable action
- `trash-2.svg` — Delete
- `filter.svg` — Filter dropdown
- `search.svg` — Search input
- `send.svg` — Send message
- `plus.svg` — New / add
- `mail.svg` / `mail-open.svg` — Inbox states
- `message-square.svg` — Message thread
- `clock.svg` — Pending / time stamp
- `check-circle.svg` — Completed status
- `alert-circle.svg` — Status warning
- `star.svg` — Favorite / featured

## UI primitives (shadcn / ui kit — used internally by Dialog, Calendar, etc.)

- `chevron-down.svg` / `chevron-up.svg` / `chevron-left.svg` / `chevron-right.svg` —
  Navigation, dropdowns, accordion, calendar, select, breadcrumb
- `arrow-up-right.svg` — Tutorial outbound link
- `circle.svg` — Radio group, dropdown radio indicator
- `circle-check.svg` — Toast success
- `triangle-alert.svg` — Toast warning
- `octagon-x.svg` — Toast error
- `info.svg` — Toast info, protected page banner
- `minus.svg` — OTP input separator
- `grip-vertical.svg` — Resizable handle
- `panel-left.svg` — Sidebar toggle
- `pipette.svg` — Color picker
- `laptop.svg` / `moon.svg` / `sun.svg` — Theme switcher

## Replacing icons

1. Keep the filename. If you redraw `shield.svg`, save your new SVG as
   `shield.svg` and drop it in — the React import is by symbol name, not path,
   so we'll need to wire your custom SVGs as React components in a small
   follow-up. Same for animated versions (Lottie JSON or animated SVG).
2. Keep them monochrome (use `currentColor` for the stroke) so they pick up
   the gold/white/muted tints the design system applies. If you ship full-
   color icons we'll need to drop the tinting per-icon — that's fine, just
   a heads-up.
3. Default Lucide stroke width is 2px on a 24×24 viewBox. Matching that means
   your icons drop in without any sizing tweaks.
