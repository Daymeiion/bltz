# Player Locker Gap Analysis

Updated: August 6, 2026

This document tracks Phase 1 of `BLTZ_MASTER_BUILD_ORDER_UPDATED.md`. Status values are limited to `complete`, `partially_complete`, `not_started`, `broken`, `blocked`, and `out_of_scope`.

## Current Status

| Area | Status | Notes |
| --- | --- | --- |
| Public Locker route and athlete identity | complete | Public players load by slug. The development demo uses `test-null-user-id` without changing production behavior. |
| Mobile Locker | complete | Existing phone-first layout remains available at mobile widths. |
| Desktop Locker | complete | The public Locker now uses a full desktop canvas, document scrolling, a responsive hero, wider film shelves, photo grid, and desktop sticky header. |
| Film Room | complete | Public videos load from Supabase, are grouped into High School, Collegiate, Professional, and Off the Field collections, and connect to individual video routes. |
| Individual video page | complete | `/player/[slug]/videos/[videoId]` validates public player ownership and public video visibility, then loads playback, metadata, tags, archive navigation, sharing, and view totals. |
| Legacy watch links | complete | `/watch/[id]` now redirects eligible public records to the canonical Locker video route. It no longer exposes arbitrary video rows or fabricated production fallback content. |
| Photos and photo rights gate | partially_complete | Public Locker photos require approved license status and public approval. Full organization rights workflow belongs to later phases. |
| Video rights enforcement | blocked | The current `videos` contract has visibility but no canonical link to `media` rights records. A migration must follow the Phase 8–10 media and rights sequence rather than introducing a parallel Phase 1 model. |
| Awards and achievements | partially_complete | Verified rows load, but richer images and source evidence remain incomplete. |
| Career statistics | partially_complete | Public presentation exists; several metrics and game-log values remain placeholders until canonical sport-specific data contracts are approved. |
| Interviews, podcasts, and social content | partially_complete | Public states and fallbacks exist; provider ingestion and athlete account connections are deferred. |
| Merchandise | not_started | Deferred until a commerce contract and athlete permissions are approved. |
| Teammate, alumni, school, and team relationships | partially_complete | UI concepts exist; canonical athlete-team-season relationships belong to Phase 2. |
| Public/private visibility | complete | Player routes require public player visibility and video routes require `visibility = public`. Individual videos must belong to the routed player. |
| Loading, empty, and error states | partially_complete | Film and photo empty states exist and invalid video routes return 404. Route-level loading skeletons still need a dedicated pass. |
| SEO metadata | partially_complete | Individual video metadata and Open Graph content exist. Locker and gallery metadata need a complete audit. |
| Shareable URLs | complete | Locker, Film Room, Photos, and individual public videos have stable slug-based URLs. |
| Basic Locker analytics | partially_complete | Existing video view totals are readable. Public view-event writes, share tracking, and retention rules are deferred. |
| Comments and reactions | blocked | Query helpers are placeholders and no completed comments contract exists. The public video page displays an honest unavailable state. |
| Locker claim and athlete editing | partially_complete | Existing onboarding and claim work remains separate from this public UI cycle and requires the approved authentication contract. |
| Accessibility | partially_complete | Semantic headings, labels, native video controls, focusable archive navigation, and reduced-motion handling exist. A full keyboard and screen-reader audit remains. |

## Acceptance Check

- Public demo Locker, Film Room, and individual video routes return `200`.
- Unknown development video IDs return `404`.
- Public video queries require both a visible player and a public video owned by that player.
- Desktop Locker is usable at 1280×720 without horizontal overflow.
- Mobile Locker and individual video layouts are usable at 390×844 without horizontal overflow.
- Private video data is not included in public Film Room or individual video queries.

## Deferred Phase 1 Work

1. Add route-level loading skeletons and a complete error-boundary pass.
2. Complete Locker, Film Room, and Photos SEO metadata audits.
3. Replace placeholder sport statistics after canonical athlete and sport contracts are approved.
4. Connect video assets to canonical media-rights records through an approved migration and regenerated database types.
5. Add tested view-event, share-event, comment, and reaction services only after their retention and authorization rules are defined.
