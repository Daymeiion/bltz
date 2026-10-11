# Preview Locker activity and delivery workflow — 2026-10-11

## Approved scope and release status

Add activity and analytics delivery status to the existing Admin funnel for Keith Rivers and future shared preview lockers. Verify the currently implemented preview-to-interest workflow through a controlled hosted staging test. No real-player invitation, form submission, account claim, payment, or contact was made.

The isolated release branch is `codex/preview-funnel-workflow-2026-10-11`, based on the latest production release `7a50949093127f7da3ca978f6e6769326f6fa960`. That baseline preserves the newer production UI and reviewed PFR structured-stats work. The primary dirty checkout and pitch-deck files were not staged, reset, or deployed. Production deployment is pending at this checkpoint; the final release readback will be added here after promotion.

## Summary and files changed

| File | Purpose |
| --- | --- |
| `app/admin/gtm/funnel/page.tsx` | Load the authorized activity report alongside the existing cohort funnel. |
| `app/admin/gtm/funnel/PreviewActivityPanel.tsx` | Add a read-only locker selector, engagement and delivery panels using existing design foundations. |
| `lib/analytics/preview-funnel.ts` | Authorize before reads; discover shared previews, query existing Tinybird reports, and count only selected-preview outbox metadata. |
| `app/player/[slug]/videos/[videoId]/VideoDetailView.tsx` | Record preview referral link-copy intent only after successful clipboard copying; preserve canonical public sharing. |
| `tests/analytics/preview-funnel.test.ts` | Cover authorization, scope, counts, partial/unavailable data and private-assignment discovery. |
| `tests/gtm/preview-activity-panel.test.tsx` | Cover panel labels, selection, counts, truncation and unavailable states. |
| `tests/preview-lockers/preview-event-tracker.test.tsx` | Cover clipboard success/failure and preserve non-preview behavior. |

## Routes, database, environments and permissions

- Existing Admin route: `/admin/gtm/funnel`, optional `activity_preview` selection. Existing cohort filters and manual operations remain unchanged.
- Existing preview video detail route receives a clipboard-success tracking fix. No new API routes.
- No schema changes, migrations, generated database types, grants, production data mutations, or new environment variables.
- Existing production analytics configuration and QStash schedule remain in place. Intelligence and general legacy analytics export remain disabled.
- Existing Admin authorization is required server-side before registry, delivery or Tinybird reads. Private assignment uses the existing authorized `preview_locker_has_viewer` RPC, not revoked grant-table SELECT. Assigned status does not assert that a private viewing window is still active.
- Discovery allows public Keith and future shared previews without enrolling them in the private conversion cohort. Explicit test campaigns are excluded; drafts and unknown assignment states are identified. Private assignment discovery has a five-second total budget and a bounded query limit.
- Delivery uses only event/batch IDs, timestamps and states. Contact details, form text, invitation tokens, media URLs, credentials and full event envelopes never cross the Admin report boundary.
- Counts remain scoped to the selected preview even when a transport batch contains multiple previews. A 1,000-event sample limit, missing providers, incomplete reports and timestamp differences are disclosed rather than reported as complete zeros.
- Interest/acceptance is not a verified ownership claim; tab sessions are not unique people. Analytics acknowledgment is not email, SMS or invitation delivery. Link copying is not proof that a referral recipient visited.

## Automated validation

- **132 tests passed across 12 focused files**: new report/panel, existing funnel, preview capture/client/interaction/inquiry, and delivery route/production/worker/retry suites.
- TypeScript: `tsc --noEmit --incremental false` passed.
- Scoped ESLint: zero errors; one pre-existing, untouched `set-state-in-effect` warning in video search.
- Independent focused review, including Vercel React Best Practices: no blocking findings.
- Local Webpack production build failed in the existing Next Google-font loader (`Cannot read properties of null (reading '1')`). It is not represented as a successful build. Hosted Vercel staging compilation succeeded; the production build is checked before promotion.

## Controlled hosted end-to-end test

The existing isolated staging fixture was used with generated synthetic photo/video assets and synthetic college/structured college stats. The staging source baseline `84cbe275c43a970f2724bc389c99a80fdd8d8dcd` matches its older database schema; the four new runtime files were overlaid exactly. This staging compatibility choice does not revert production's newer PFR changes.

- Hosted staging deployment: `dpl_a4AbjA4hpgHdxBgBoCo3WYnUR5ty`, READY, dedicated alias `bltz-preview-sprint-2026-10-09.vercel.app`.
- Synthetic preview ID: `b17a0000-2026-4009-8000-000000000001`; anonymous session: `95b20a13-e84f-4448-9edf-6fbf07b1f8f8`.
- Browser path verified: locker → photo room → photo → back → film room → video → naturally watched native playback → structured stats and college → mobile claim-interest form.
- At 390px width, an intentional 503 inquiry failure preserved form fields; one successful retry produced a saved acknowledgment without horizontal overflow.
- First reconciliation stopped safely on a missing video copy-intent event **before any dispatch**. The minimal clipboard handler fix and three regression tests corrected it. Only the missing copy action was repeated; the saved form was not submitted as a second new test.

| Event kind | Expected and reconciled |
| --- | ---: |
| `locker_view` | 1 |
| `photos_view` / `photo_open` | 1 each |
| `film_view` / `video_open` / `video_play` | 1 each |
| `video_progress` | 3 (25%, 50%, 75%) |
| `video_complete` | 1 |
| `stats_view` | 1 |
| `referral_link_copied` | 1 |
| `claim_click` / `accepted` / `claim_submit` | 1 each |

All **15 immutable events** were published once by hosted dispatch through QStash and received by the signed hosted worker. Batch `3d20a734-19a5-4d9e-89ae-c4f704db63a0` was acknowledged with one worker attempt. Tinybird reconciliation matched every event ID and payload hash, with **one physical row per event**. The preview report matched all expected counts.

Negative/retry checks passed: unavailable preview 404; invalid consent 400; bot exclusion; same event ID returns duplicate; same inquiry retry remains saved with unchanged event IDs/hashes; a second dispatcher call is idle with zero events. No raw email, feedback, tokens or media storage paths entered analytics. Staging capture was restored OFF before dispatch and remains OFF. Previous test history was retained.

## Manual verification, limits and deferred work

The controlled test proves the implemented room/media/stats/interest workflow and analytics transport, not outbound invitation delivery or real athlete identity verification. Synthetic inquiry persistence was checked in staging; Keith's production contact and claim records were not altered. Hosted worker tests were performed without weakening TLS or endpoint protection.

Existing Spotify iframe CSP errors appeared during browser QA; they did not prevent the controlled workflow and were not changed in this scope. A future YouTube API integration would be needed to report embedded-player watch milestones; this test used a native generated video. External video links cannot prove playback.

Actual email/SMS provider delivery, bounces, opens, Calendly confirmations, canonical claim/verification and payouts are excluded. The existing manually maintained cohort delivery/conversion fields remain separate. Do not infer those integrations from Tinybird acknowledgment.

This strengthens the preview-to-interest measurement loop around persistent athlete identity. It creates no new Career/Moment/Value schemas or economic entitlement, remains useful across organization changes, and duplicates no mature third-party delivery or media workflow. Organization dashboards, generalized CRM, Intelligence expansion and future CSV ingestion remain deferred.

Ignored local evidence is under `output/preview-funnel-2026-10-11/` (deployment receipts, guarded test helpers and end-to-end reconciliation). Secrets stay in existing ignored environment files and are never committed. This document is the durable, sanitized continuation record.
