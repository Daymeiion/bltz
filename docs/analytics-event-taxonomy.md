# BLTZ Phase One analytics event taxonomy

## Scope and identity rules

This document covers product events with live triggers in the Player Locker, Film Room, Photos, claim flow, and athlete dashboard. It does not describe reserved event names that do not yet have a product trigger.

Public Locker events support anonymous visitors. The browser creates a random session UUID in `sessionStorage`; it does not fingerprint the visitor and never supplies a user ID. Public events include the athlete UUID already rendered by the public route, and the ingestion endpoint verifies that it belongs to a visible athlete before accepting the event.

Authenticated dashboard events do not accept a browser-supplied user ID or athlete ID. The ingestion endpoint derives the user from the Supabase session and resolves the owned athlete server-side. Claim events are emitted inside the authorized claim endpoint using the validated token's athlete and authenticated user.

Analytics properties contain categories, counts, identifiers, and field names only. They must not contain profile field values, claim tokens, contact information, raw feedback, cookies, or authorization data.

## Implemented events

| Event | Description and trigger | Properties | Auth behavior | Frequency / deduplication |
| --- | --- | --- | --- | --- |
| `locker_viewed` | A non-embedded `/player/[slug]` Locker renders in the browser. | `source` hostname when available; `viewer_mode` | Anonymous or authenticated; athlete visibility re-verified server-side. | Once per athlete, route, viewer mode, and browser tab session. React rerenders and Strict Mode remounts are deduplicated. |
| `film_room_opened` | `/player/[slug]/videos` renders. | `video_count` | Anonymous or authenticated; visible athlete required. | Once per route and browser tab session. |
| `photo_gallery_opened` | `/player/[slug]/photos` renders. | `photo_count` | Anonymous or authenticated; visible athlete required. | Once per route and browser tab session. |
| `media_viewed` | A visitor selects a Film Room video or gallery photo, or opens a video-detail route. | `media_id`, `media_type`, `section` | Anonymous or authenticated; visible athlete required. | Once per media item per browser tab session. Re-selecting the same item is deduplicated. |
| `share_link_copied` | Clipboard writing succeeds from the dashboard welcome card or video detail. | `surface` | Public share surfaces require a visible athlete; dashboard welcome carries its server-rendered athlete ID. | Every successful explicit copy. Clipboard failures do not emit. |
| `locker_shared` | A Locker or video link copy succeeds from an active share surface. | `mechanism` (currently `clipboard`) | Anonymous or authenticated; visible athlete required. | Every explicit successful share action; normal double-click behavior is rate-limited by the ingestion endpoint. |
| `claim_link_validated` | The authenticated claim endpoint validates an unused, unexpired token after the athlete presses the claim CTA. | `entry_point` | Authenticated; user and athlete come from trusted server context. | One logical event per user, athlete, and claim token; delivery retries reuse a deterministic UUID. |
| `claim_completed` | Claim review creation succeeds, including an idempotently reused review owned by the same user. | `reused` | Authenticated; user and athlete come from trusted server context. | One logical event per onboarding pipeline run; recovery responses reuse the run-derived UUID. |
| `profile_edit_started` | The athlete first changes a social-link or Locker-quote control. | `section` | Authentication required; athlete resolved server-side. | Once per section, route, and browser tab session. Input rerenders do not emit. |
| `profile_edit_completed` | The social settings or Locker quote API succeeds. | `section`, `changed_fields` (names only) | Authentication required; athlete resolved server-side. | Every successful save. Failed saves do not emit. |
| `media_uploaded` | Creation of a new dashboard video succeeds. Editing an existing video does not count as an upload. | `media_id` when returned, `media_type`, `visibility` | Authentication required; athlete resolved server-side. | Once per successful create response. Failed requests do not emit. |

## Ingestion and failure behavior

Browser events post to `POST /api/analytics/events` with a required event UUID, occurrence time, random session UUID, page, athlete target when public, and bounded properties. They do not submit `source`, user identity, or privileged attribution fields. The route normalizes the page, derives an allowlisted source from page and event context, gets the user from the authenticated server session, and verifies or resolves the athlete before persistence.

Each intended event keeps one stable UUID across automatic and later delivery retries. `analytics_events.client_event_id` is unique and non-null. The server writer treats a uniqueness conflict for that UUID as accepted with `duplicate: true`, so a lost success response can be retried without double-counting. A new explicit user action without a dedupe key is a new intent and receives a new UUID.

Anonymous limiting uses atomic database buckets rather than querying raw events. It consumes both a 60/minute session bucket and, when a trusted forwarding header is available, a 300/minute pseudonymous network bucket. Network keys are HMAC-hashed, rotate daily, and store no raw address. Authenticated traffic uses a 120/minute user bucket. This is intentionally not fingerprinting: visitors behind one NAT share the network allowance, and deployments that do not provide trustworthy forwarding headers fall back to the session bucket. Bucket cleanup beyond same-key reuse remains an operational retention task.

The route then calls the server-only analytics writer through the service client. Browsers never receive privileged database credentials and cannot insert into `analytics_events` directly.

Tracking is deliberately best-effort. Client transport errors resolve to `false`; call sites do not await analytics before navigation or primary product behavior. Server-side claim tracking catches analytics failures before returning the claim result. Analytics failure therefore cannot block Locker viewing, media use, profile saving, sharing, or claiming.

## Beta Dashboard aggregate contract

`get_beta_intelligence_dashboard(p_since, p_cohort, p_status, p_athlete_id)` is a service-role-only RPC. It returns cohort summary counts, per-athlete action counts and insight categories, the 20 most recent feedback summaries, and athlete drill-down records without sending raw analytics rows to the browser. Every action percentage uses the same explicit denominator: the number of beta participants remaining after all supplied filters. Its numerator is the number of those distinct participant athletes with at least one matching action. Funnel counts are absolute filtered-cohort counts; any stage-to-stage percentage remains a UI computation using the immediately preceding stage as denominator.

## Deferred events

The following requested signals are not documented as implemented because the current product has no complete, durable trigger for them: `career_item_added`, `career_item_corrected`, `award_added`, `media_missing_reported`, `locker_customized`, `feedback_started`, `feedback_completed`, `upgrade_interest_clicked`, `digital_report_interest`, direct public `social_link_clicked` destinations, and social/QR share destinations. `social_link_clicked` is reserved in the canonical ingestion allowlist so the aggregate contract can count it once the owning UI adds a verified trigger. The remaining signals should be added with the workflow that owns the corresponding successful action, not as placeholder clicks.

`locker_id` is also deferred because Agent 1's approved Phase One contract associates events to the canonical athlete and does not include a Locker foreign key. The public route remains available in `page` for route-level analysis.
