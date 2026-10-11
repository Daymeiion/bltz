# Preview invitation email — 2026-10-11

The user selected existing IONOS Webmail, sender dante@bltz.me, and deferred credentials. This checkpoint adds invitation transport reporting to the existing Admin funnel with sending and mailbox checks OFF. No real email has been sent; IONOS authentication and live delivery/bounce behavior remain unverified.

## Approved scope and behavior

- One explicitly reviewed invitation to an existing GTM contact; no bulk or automatic outreach.
- A private preview requires the recipient to match its assigned, unexpired 48-hour viewer grant. Neither preparing nor sending creates/renews access, shares drafts, enrolls a cohort, or changes manual sent_at.
- An immutable application request and deterministic Message-ID protect retries. Only an atomic prepared-to-sending claim can invoke SMTP. Existing sending, accepted or uncertain attempts are never automatically resent. A retry can safely recover a crash before that claim.
- SMTP acceptance is not delivered/read. States: prepared, sending, smtp_accepted, delivery_delayed, delivery_reported, bounced, send_failed, send_uncertain.
- Read-only IMAP examines only bounded matching RFC3464 delivery-status reports, not ordinary replies. It leaves flags/folders/messages untouched and stores no mail body or diagnostic text. Reports match Message-ID/envelope ID and exact frozen recipient.
- Stable UIDVALIDITY:UID receipts deduplicate scans. Delays cannot erase reported delivery; a later failed report can produce a bounce. Bounce evidence is retained. No suppression, account ownership or access changes derive from mailbox evidence.
- Admin counts are current attempt states; history is latest20, with exact totals and a limited indication. Manual “Mark invitation sent” remains separate staff evidence. Analytics reports are distinct from email delivery.

## Changed files and routes

Routes: existing /admin/gtm/funnel; new POST /api/admin/preview-lockers/[id]/invitation-email; new QStash-signed POST /api/internal/preview-email/check-bounces. No public locker layout/claim behavior changes.

Files: app/admin/gtm/funnel/page.tsx, PreviewActivityPanel.tsx, PreviewInvitationEmailPanel.tsx, PreviewInvitationEmailForm.tsx; both new route.ts files; lib/preview-lockers/invitation-email.ts, invitation-email-report.ts, invitation-email-server.ts, invitation-email-bounces.ts, ionos-email.ts, ionos-dsn.ts; lib/analytics/bltz-event.ts; package.json/package-lock.json; migration20261011213800_preview_invitation_email.sql; scripts/verify-preview-invitation-email.mjs, generate-preview-invitation-email-types.mjs; types/preview-invitation-email.generated.ts; seven focused new test files and corrected tests/analytics/contracts.test.ts.

The existing analytics coverage test incorrectly treated preview engagement names as canonical Player events. It now validates both existing separate contracts without broadening the canonical event registry.

## Database and permission changes

Migration20261011213800 adds private.preview_invitation_email_attempts and private.preview_invitation_email_receipts, restrictive FKs, RLS and revoked direct access (including service_role), immutable snapshot/receipt triggers, metadata-only audits and six explicitly granted public RPCs. Prepare/report require authenticated internal Admin authorization; begin/settle/pending-check/record-DSN are service-only. Definer functions use empty search_path and schema qualification.

No auth/profile/organization/Career/Moment/Value schema or permission is changed. Only the private analytics builder admits six new email_* operational kinds; public/browser capture allowlists remain unchanged. The existing outbox→QStash→Tinybird pipeline carries opaque preview UUID and kind, never recipients, mailbox bodies, private links/tokens or raw errors. Email facts require operational/server_workflow with a null session and cannot be counted as audience events.

Staging applied and verified: system7666007964130682852, projectyevihzsgqagvuulymqum; 63 migrations/latest20261011213800. SourceSHA256 f7ac2453419f2af14ee1bf606c9c70d6d243f28f7386141f5931b0f3e62955ad. All prior migration history unchanged; captureOFF; existing18outbox rows/2batches preserved; zero persistent invitation attempts/receipts/fixtures. Production application/promotion is recorded in the release receipt appended below when completed.

Scoped generated types represent only six public RPCs, from the actual staging catalog. Regenerate with node scripts/generate-preview-invitation-email-types.mjs <downloaded-catalog.json> [--check]; private recipient tables are deliberately excluded.

## Server-only configuration and activation

Configure in .env.local and the intended Vercel environment; never paste or commit the mailbox password:

```dotenv
BLTZ_PREVIEW_EMAIL_FROM=dante@bltz.me
BLTZ_PREVIEW_EMAIL_PASSWORD=<configure privately>
BLTZ_PREVIEW_EMAIL_ENABLED=false
BLTZ_PREVIEW_EMAIL_BOUNCE_SYNC_ENABLED=false
BLTZ_PREVIEW_EMAIL_BOUNCE_WORKER_URL=https://bltz.vercel.app/api/internal/preview-email/check-bounces
```

Existing QSTASH_CURRENT_SIGNING_KEY/QSTASH_NEXT_SIGNING_KEY are reused for worker signature verification; neither is public. Server deployment VERCEL_ENV determines email environment independently of analytics flags. IONOS SMTP is fixed TLS smtp.ionos.com:465; IMAP is fixed TLS imap.ionos.com:993. Only the approved sender is accepted; invitations use a frozen alias on https://bltz.vercel.app.

Next activation sequence: confirm credentials without logging values; use a user-approved controlled recipient (not Keith or other players); enable sending only for that controlled test and verify SMTP result and actual supported DSNs; test retries/receipts and metadata delivery to Tinybird; then enable bounce sync and create the reviewed QStash15-minute schedule targeting the fixed worker URL with JSON {}. Require both signed raw-body/destination checks and server-only keys. No live/paused schedule was created in this implementation.

## Validation and limitations

- 429 preview/analytics tests passed across56 files;5existing tests skipped (one test file). New meaningful cases cover unauthorized/disabled calls, once-only send claiming, uncertain outcomes, request reuse, report privacy, real RFC3464 fixtures, TLS settings and read-only mailbox behavior.
- 124 embedded PostgreSQL assertions passed; hosted rollback-only lifecycle/grant/privacy validation passed before applying the exact staging migration. Hosted multi-session concurrency was not independently tested.
- TypeScript and scoped ESLint passed. Full Next16.3.6 Webpack production build passed after using the existing trusted CA bundle; all97static pages completed. Initial font fetch without that CA failed certificate validation; no TLS verification was disabled.
- npm ci --ignore-scripts --dry-run passed. New dependencies are pinned. Existing package versions/topology retained. Existing npm audit reports11baseline vulnerabilities (2moderate/9high); no blanket upgrades or audit-fix applied.
- No SMTP/IMAP connection or real recipient email test. IONOS/recipient-server DSN availability is not guaranteed; silence stays accepted/uncertain, never delivered. A delivery-status email is reported transport evidence, not a cryptographically signed callback or a read receipt.
- Checks fairly rotate20attempts per call for14days, scan at most20matching reports with256KiB/source and25second total IMAP budget. Very late DSNs outside14days need explicit manual review. No campaign suite, open pixel, automatic resend, suppression system or mailbox management was introduced.
- This strengthens the preview-to-contact/invitation/claim-interest loop. Career identity/claim ownership is unchanged; Moment/Value relationships are not introduced. It remains useful across organization changes and integrates mature mail transport rather than rebuilding it. No generalized CRM/media-management scope added.

## Continuation safety

Primary checkout C:/Users/Administrator/bltz contains unrelated work and was not staged/deployed. Implementation lives in managed worktree C:/Users/Administrator/.codex/worktrees/preview-tracking-release/bltz on codex/preview-invitation-email-2026-10-11. Preserve the latest production source2c175bdfac36b7a3a95636e90b646ba6b2d9ee0b. Do not repeat migration/deployment scripts blindly; inspect sanitized receipts under primary output/preview-invitation-email-2026-10-11 and fresh migration/deployment preflight first.

## Released checkpoint

- Implementation commit: d06a52d68d43e7a6c4d3f537e1e64087bed36c2f, pushed to origin/codex/preview-invitation-email-2026-10-11. Documentation-only follow-up may be the branch HEAD.
- Production READY deployment: dpl_9mWWTXDSMzPwB8VGLDTBgFyddfNz, https://bltz.vercel.app (candidate https://bltz-7yn99oau6-daymeiions-projects.vercel.app). Previous deployment dpl_8HAGDHJ2ra1RySJzvjNhMzYDD7zB; no unrelated source changes promoted.
- Production migration20261011213800 applied from exact staging-verified source;80migrations, all previous history unchanged. Capture remains production;0email attempts/0receipts;Keith intact. Both email flags are explicitly false on this deployment; project/mailbox credentials were not configured.
- Candidate smoke: anonymous Admin redirect; unauthorized invitation send401; unsigned email worker401;Keith public locker200.
- Authenticated live Admin verification: Keith selected, available zero email history, explicit disabled configuration/sending/bounce statuses and disabled recipient/confirmation/send controls. At390px, panel358px/scroll356px; no horizontal overflow. Temporary viewport override restored. Keith currently has no eligible linked GTM contact with an email; add/review one before a later player invitation.
- Real QStash control job msg_7YoJxFpwkEy5zBp1xoPnifPrhVNtzJknvjUStuEQNT2eiBVR6wjox reached the worker withDELIVERED/HTTP200. Body{};mailbox checksOFF. This verifies scheduler-to-hosted-worker authorization, not SMTP/IMAP or recipient delivery. No schedule created.
- SMTP/IMAP credentials, one reviewed controlled email recipient, actual DSN support, new email-state end-to-end Tinybird observations and15-minute check schedule are deferred until user configuration. Existing analytics pipeline/locker activity are unchanged.
