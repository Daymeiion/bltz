# Keith Rivers: approved one-time re-arm

## Scope and approval

On 2026-10-16 the user explicitly approved returning Keith Rivers' published preview link to Pending, preserving his previous access history, and starting a fresh 48-hour window only on the next eligible visitor open. Player invitation email sending must remain off. This supersedes the outstanding re-arm decision in `KEITH-MOBILE-QA-2026-10-16.md`; the historical QA finding remains accurate.

The repair targets only preview `556ca192-d9b7-494f-93d6-a498af76ba5a`, canonical player `c5dae871-a277-4256-9a0c-17a40940ad3f`, and the existing `keith-rivers` alias. It does not republish, change content, replace identifiers, or change any other locker.

## Changes and safety

- Migration: `supabase/migrations/20261016174524_rearm_keith_preview_after_mobile_qa.sql` clears only the current three access timing fields. The existing timestamp trigger may update `updated_at`.
- The prior start (2026-10-13 22:56:51.811674 UTC), expiry (2026-10-15 22:56:51.811674 UTC), and full previous link row are preserved in a new protected `preview.link_access_rearmed` audit. Existing start/extension audits are not removed.
- A permanent request receipt prevents replay from resetting a subsequently started window. Identity checks and row locks protect the targeted repair.
- No routes, UI, API, schema, permissions, RLS, environment variables, or generated database types change. No general reset capability is introduced.
- Existing visitor admission starts the fresh 48 hours; verified Admin inspection does not. Do not verify the fresh window by opening Keith as a guest.

Production application requires a fresh read-only preflight and one atomic packet containing the exact reviewed migration, history registration, and postconditions. Pin the project/system identity, full target row, content, other links, old audits, and admission function fingerprints. If an application response is uncertain, reconcile read-only instead of retrying.

## Validation and handoff

`node scripts/verify-keith-preview-rearm.mjs` passed 35 disposable PostgreSQL assertions covering Pending, history preservation, a synthetic next-open window of exactly 48 hours, repeat opens, migration replay, audit-failure rollback, target guards, unauthorized role rejection, and absent-target portability. These tests execute the actual migration and released lifecycle functions without production access or email. They do not simulate independent database clients.

Production verification must confirm Pending with null current timing fields, one re-arm receipt containing the old window, unchanged prior audits/content/other links, registered migration history, and no new Keith invitation-email attempts. Inspect only the protected production Admin link status and confirm built-in email sending remains disabled. Keep raw operational receipts under ignored `output/keith-rearm-2026-10-16/`; do not commit credentials or environment files.

No new application code is changed, so the previously validated mobile application remains in place. The Git-triggered deployment must still report Ready for the release commit. Physical-device QA and any actual visitor open remain separate from this repair.

## What email sending off means

`BLTZ_PREVIEW_EMAIL_ENABLED=false` disables invitations sent by BLTZ through its built-in IONOS integration. It does not block manually emailing or messaging a published locker link, or athletes supplying an email through the interest form. Record the actual sharing channel/time in Admin. Manual email delivery and bounces are not automatically correlated to a BLTZ SMTP attempt; eligible locker visits and form activity remain trackable.

## Product direction and deferred work

This preserves the existing Athlete Career ID and restores the authorized Locker-claim opportunity without deleting history. It adds no Moment/Value relationships, organization workflow, or third-party workflow replacement. No broad reset UI, analytics rebuild, new provider, or automatic player invitation is included. The career identity remains useful after an athlete leaves an organization.
