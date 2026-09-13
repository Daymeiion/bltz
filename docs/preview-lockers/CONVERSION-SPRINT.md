# Preview conversion sprint

Baseline: `40835889015011d124ae6a3a7264d3448b961a25`, verified remote main. Worktree/branch: `preview-conversion-sprint` / `codex/preview-conversion-sprint`. No production writes, outreach, merge or deployment authorized. The newer user-supplied Career Identity Network instructions override the older checkout AGENTS.md; the named Product Doctrine file is absent from this baseline and the original checkout.

## Gap analysis and implementation plan

Existing Next 16 App Router, npm, Supabase SSR sessions, private signed media, admin assignment/revocation, UUID previews, revision-aware admin completion, GTM contacts and Player Master associations remain authoritative. Existing analytics target canonical players and cannot accurately represent private demo conversion. There is no complete conversion response/ledger/report in this release.

Candidate `d7855c8` uses bearer snapshot access, incompatible with assigned viewers and current private uploaded media. Do not import those routes/functions. Selectively adapt its exact-email matching, first-touch intake and reserved-ID concepts. Candidate `8a51370` is unrelated LinkedIn review persistence: inspect only, preserve existing reviews and do not import or alter that workflow.

Planned files: one additive migration under `supabase/migrations`; scoped generated database types; `lib/preview-lockers/conversion.ts` validation/metrics; conversion API and client controls; instrumentation inside existing private Locker/Photo/Film routes; authenticated `/preview-referrals/[token]` self-intake; existing Admin preview form reserved-ID support; `/admin/gtm/funnel` plus existing GTM navigation; focused UI/API/database tests and evidence scripts.

Schema: `preview_conversion_campaigns` links one existing preview UUID to one GTM contact plus immutable first outreach attribution. `preview_conversion_responses` stores private form contents separately. `preview_conversion_events` is append-only and contains only bounded event data, session/request IDs and server timestamps. `preview_conversion_referrals` stores first-touch self-intake, referring preview, contact, reserved ID and eventual private preview. All writes use authenticated, authorized transactions; ordinary users receive no table reads. Referral tokens permit self-intake only, never preview reads. A referred athlete signs in and confirms their own account email before intake. No canonical players or ownership claims are created.

Acceptance occurs atomically with persisted claim submission. Admin completion remains unchanged. Booking click, manual booking confirmation and manual walkthrough completion are separate events. Explicit test campaigns and admin athlete activity are excluded by the database. Hydrated visible-page POSTs avoid GET/prefetch tracking; authenticated automated browsers remain a measurement limitation. Unique-preview conversion is independent of session/event totals.

## Wireframe

Primary athlete action: Claim my Locker; secondary: Not interested. A compact, responsive action region precedes the existing private Locker. Claim opens email, explicit updates permission and optional dashboard interest; decline opens optional reason. Persisted confirmation offers walkthrough and teammate referral. Failed writes retain inputs.

Admin primary action: review cohort funnel and follow-up queues. Filters precede metric numerators/denominators; enrollment sits in a disclosure; each preview expands to response/timeline and existing GTM contact/discovery link. Dashboard requests, booked calls, declines and pending referrals are separate sections. Wide reports scroll; controls have labels and keyboard focus. No Locker redesign or separate research platform.

## Completed implementation and metric definitions

All planned application surfaces are implemented. A fifth, private table (`private.preview_conversion_limits`) admits at most 120 successful authenticated requests per account/hour, including duplicate events; malformed/unauthorized transactions roll back. The current grant row is locked during athlete writes so revocation serializes with in-flight authorization. Public invoker RPCs call a private definer with explicit Admin/viewer checks and an empty search path. No anonymous or service-role table/RPC access was added. Admin reads use RLS. Response data never enters event metadata; metadata permits only three bounded UTM campaign codes. No email, name or arbitrary query parameter is copied from URLs.

The experiment permits one enrollment per preview and per GTM contact. Enrollment attribution is immutable: a conflicting retry fails rather than silently moving a preview to another person/cohort. Existing Player Master preview associations must agree with the selected contact. Unenrolled previews hide the conversion UI. Existing canonical Player IDs, claims, rights, imports and reviewed contact matches are not modified.

| Metric | Definition |
| --- | --- |
| Enrolled | Non-test preview/contact pairs in the selected UTC enrollment-date cohort |
| Sent | Explicit Admin mark with server timestamp; assignment and enrollment alone do not count |
| View | Hydrated, visible, authorized Locker visit; one event per preview/session, no email-open claim |
| Photos / Film | Separate visible authorized room visits, each deduplicated per preview/session |
| Claim click | CTA interaction, not acceptance or a submitted form |
| Accepted / submitted | Two ledger facts written atomically with one protected response; email plus explicit updates permission required; not verified ownership |
| Declined | Explicit persisted response; reason optional; never inferred from inactivity |
| Dashboard interest | Persisted optional checkbox; safe retries retain the original choice |
| Booking click | Opening the configured scheduling URL; never a confirmed booking |
| Booking confirmed / walkthrough completed | Separately authorized Admin records, with actor, server time and audit entries |
| Referral created / copied | Link issuance and successful clipboard copy; neither is athlete acquisition |
| Referral submitted | One first-touch self-intake per confirmed account/email; self-referrals and already-enrolled contacts do not create acquisitions |
| Referred prepared | Manual private-preview save consumes the intake's reserved UUID, links contact/cohort and records this event atomically |
| Referred claimed | The prepared referral's later accepted interest submission, attributed back to its original intake; not verified ownership |

Every stage reports **distinct sent previews reaching that stage / sent previews**, alongside all unique previews and event counts. Referral stage preview counts refer to **referring** previews; referral event counts represent distinct intakes where applicable. Unique athlete counts mean distinct GTM contacts, not deduplicated canonical people. Session counts are preview/browser-session pairs. Refresh/retry/concurrency cannot increase unique-preview conversion. The UI withholds metric totals when cohort/activity lists hit the 1,000-row cap and warns separately when preparation/contact lists are incomplete. Filtered follow-up queues share the selected cohort.

Responses are immutable within this bounded experiment. Repeated same-state submissions return saved status; an attempted state reversal requires manual follow-up via existing GTM notes. No researched objections platform, automated contact merge, outreach or email integration was added.

## Validation and browser evidence

**Implemented:** yes. **Locally verified:** yes, including real authenticated athlete-to-Admin persistence. **Staging verified:** no. **Deployed:** no. The remote main source baseline was verified; a deployed production artifact/commit was not established and no deployment was requested.

Validation on September 11, 2026:

- Full Vitest suite: **593 passed, 24 skipped**, 87 passing files / 2 skipped files. The skipped pre-existing live suites were not represented as passes.
- Repository error-level ESLint: pass. TypeScript `--noEmit`: pass. `git diff --check`: pass.
- Final production build: `node --use-system-ca node_modules/next/dist/bin/next build --webpack` — pass. First font fetch failed certificate trust; the explicit Node system-CA option fixed it without disabling TLS verification or changing app configuration.
- Existing preview/middleware subset: 88 passing tests. New conversion validation/API/UI tests cover permission requirements, bounded attribution, unique denominators, anonymous/forged-admin denial, admin/prefetch/crawler exclusion, HTTP failure preservation, stable retry IDs, decline behavior and unenrolled hiding.
- Embedded PostgreSQL: 31 assertions, using the actual released viewer-grant migration and a synthetic dependency boundary. This was supplemental, not the final integration proof.
- A new independent Supabase stack (`bltz-conversion-20260911`, API 62321, DB 62322) replayed the approved local schema baseline and all release migrations plus the new migration. No existing local stack was reset or reused for writes. Final function refinements/private request admission were applied only to this stack and retested. Types were regenerated from its actual full schema using Supabase CLI.
- Real Supabase/PostgREST concurrency: **16 simultaneous claim submissions → one response and three atomic acceptance/submission/intent events**. **12 concurrent referral retries → one original intake**, preserved name/source and reserved ID. Anonymous/non-viewer denial and Admin exclusion pass.
- Full-schema rollback-only proof: event-write failure rolls back the response; optional decline is not acceptance; test activity excluded; unenrolled state hidden; request admission enforced; ambiguous matching leaves two reviewed contacts intact, queues an unresolved intake, and permits only explicit Admin resolution. All these extra fixtures roll back.
- Supabase security/performance advisors: no sprint-related WARN/ERROR findings. Added the two reported missing FK indexes. Remaining INFO findings are unused indexes on tiny fixtures and RLS-with-no-policy on the intentionally inaccessible private request-limit table; no broad access policy was added merely to silence that notice.

Browser walkthrough ran against the production build, first on `localhost:3107`, with a final-build persistence smoke check on `localhost:3108`. Real local Supabase login, session cookies, RLS, RPCs and Admin reads were used. Only one deliberately failed-save request was intercepted; the retry and all successful saves used the real backend.

1. Assigned synthetic athlete logged in and visited Locker, Photo Room and Film Room. SQL confirmed one event for each, despite repeated navigation.
2. At 390×844, Claim my Locker opened the short form. A simulated 503 retained email, consent and dashboard intent. Retrying saved one response and showed next steps. [Retained failure](evidence/claim-failure-retained.png), [saved mobile response](evidence/claim-saved-mobile.png).
3. A separate Admin session showed the accepted response, dashboard request and matching event timeline. Booking click remained separate from Admin-confirmed booking and completed walkthrough. [Persisted Admin response](evidence/admin-persisted-response.png).
4. Copied referral link required login and asked the teammate for their own confirmed email/name/permission. One intake/contact appeared in the preparation queue. Existing Admin creation saved manually entered career content using reserved ID `a0bc3dad-da13-4e19-8dc7-531279593a77`; no empty preview was auto-published and viewer assignment was a separate explicit action.
5. Referred athlete opened the assigned preview and submitted using Tab/Enter navigation. The parent funnel showed one referred-prepared and one referred-claimed event. The same referred account received **404** when visiting the original athlete's private preview.
6. Admin was inspected at desktop and 390×844; wrapping/scrolling preserved readable controls and stage numerators. [Mobile Admin report](evidence/admin-mobile.png). Loading status and honest failed-data UI are implemented; no failure is rendered as zero conversions.
7. On the final build, the separate assigned decline fixture opened Not interested and saved with a blank optional reason. The browser displayed the saved-response confirmation, and the Admin cohort was reloaded for the persisted decline.

Synthetic runtime config, sessions, fixtures and raw CLI snapshots remain ignored under `output/conversion` and `.playwright-cli`. Never publish those session/config files. Checked-in screenshots contain only synthetic identities. Supplemental scripts: `seed-preview-conversion-local.cjs` (fresh isolated stack only), `verify-preview-conversion-live.cjs`, `verify-preview-conversion-atomic.cjs`, `verify-preview-conversion.mjs`, and `generate-preview-conversion-types.cjs`. The live scripts assert the exact local API address/container. Their fixture input is produced by the local seed script after Supabase status is saved to `output/conversion/local-config.json`; no hosted connection is accepted. The embedded script takes a local installed PGlite module path.

## Files, routes, migration and rollout

Focused implementation commits: `8d0ed55` (transactions/API/types/proofs), `5d23754` (athlete journey, referral preparation and GTM UI). Original checkout tracked-diff hash remained `d47d1b88d1513278fd9d4dedea9f5ef3ce6a1ab8`; its branch and uncommitted work were preserved. Final synthetic cohort proof is checked in at [final-report-proof.json](evidence/final-report-proof.json): 3 enrolled, 2 marked sent, 2 accepted (1 of the sent cohort), 1 declined, 1 dashboard request, 1 confirmed booking/completed walkthrough, and 1 referred-prepared/referred-claimed chain. Rendered Admin numerators/denominators were compared with those records.

Files changed are the planned API, UI, validation, migration, scoped types, proof scripts/tests and this report/evidence. Existing integration edits are limited to preview page composition, referral reserved-ID support in the Admin form, GTM navigation, private no-store headers, onboarding redirect exemption for authenticated referral intake, and ignored local verification output. No package, framework, Supabase client, LinkedIn import or backend replacement.

New routes: `/api/preview-conversion`, `/preview-referrals/[token]`, `/admin/gtm/funnel`. Existing routes augmented: `/preview-lockers/[slug]`, `/photos`, `/videos`, and `/admin/preview-lockers/new?intake=...`.

One additive migration: `20260911185101_preview_conversion_sprint.sql`. Prerequisites are the released private preview, assigned-viewer, GTM prospect-preview and preview-media/stat migrations through `20260909035336`. It adds four protected public tables, one private admission table, indexes/FKs, append-only enforcement, private authorized transactions/public invoker wrapper and a reserved-ID preparation trigger. Existing tables and data are preserved; no backfill is performed.

Future rollout sequence (not executed):

1. Confirm the intended non-production release and existing migration ledger. Apply only this additive migration after prerequisites; do not blindly replay historical production migrations.
2. Configure `PREVIEW_CONVERSION_ENABLED=true` and optional `PREVIEW_BOOKING_URL` with the real HTTPS scheduling URL. Without a URL, the UI offers manual coordination. The local example.com URL is a test placeholder, not a booking integration.
3. Verify the same synthetic full journey in staging, including its actual Auth email-confirmation settings, callback URLs and deployed host origin handling.
4. Review and release source through the existing deployment workflow only after explicit authorization. Never deploy this local prebuilt `.next`, which embeds the fixture API address. No service key is exposed to clients.
5. Enroll reviewed previews/contact pairs, assign their intended existing accounts, then manually mark sent only after actual authorized outreach. Neither this task nor these controls send messages.

Permissions: existing Admin grants and assigned-viewer authorization preserved. New responses/intakes/events are Admin-readable only; writes run through an authenticated checked RPC. A referral token permits self-intake only and grants no private-preview access. No canonical claim/ownership permission is granted.

## Remaining limits and deferred work

- Staging/production rollout is unverified and not performed. The scheduling destination, actual campaign cohort and real athlete email/login experience must be confirmed for the intended staging host.
- View measurement avoids GET/prefetch and recognized bots but cannot prove an authenticated human; session storage can be cleared. This does not inflate unique-preview conversion.
- Exact-email matching is deliberately conservative. Ambiguity requires existing GTM review; no automatic identity merges. This can undercount/refuse acquisition when an existing enrolled contact submits again.
- Responses and first-touch enrollment are immutable in this sprint. Correction/reversal workflows, email-open integrations, automated bookings, bulk outbound campaigns, scoring, payments and dashboard rebuilds are deferred.
- Local browser fixtures used empty media rooms to verify authorization/activity capture. This task does not claim a new end-to-end storage-upload verification; existing media behavior and regression tests were preserved.
- The report is bounded at 1,000 rows per loaded list. Capped totals are withheld rather than extrapolated.

Product impact: strengthens preview-to-GTM identity relationships, explicit athlete interest and attributable teammate recovery/intake relationships. These remain useful after leaving an organization. No Moment or Value Graph schema was introduced, no mature third-party workflow was duplicated, and there was no drift into generalized media management.

## PR-ready description

Private preview administration could mark content complete but could not measure an athlete's response through to follow-up or teammate recovery. This adds an authenticated preview conversion workflow on the existing viewer grants: explicit unverified claim interest or decline, separate dashboard/booking intent, first-touch teammate self-intake, reserved private-preview IDs and an Admin/GTM funnel with unique conversion denominators and follow-up queues.

The migration keeps form contents private and events append-only, serializes retries and revocation, preserves reviewed GTM matches, excludes Admin/test activity and enforces per-account admission. Existing canonical claims and Admin preview completion retain their separate meaning. Validation: 593 tests pass (24 existing skips), lint/type/build pass, full local Supabase concurrency/rollback proofs pass, and real desktop/mobile browser actions persisted through to Admin. Staging and deployment remain unperformed; apply the additive migration before enabling the rollout flag.
