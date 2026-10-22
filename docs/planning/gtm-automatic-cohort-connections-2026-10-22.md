# Automatic GTM cohort connections — 2026-10-22

## Objective and scope

Make Add to cohort establish one persistent player relationship across prospect selection, GTM contact, private preview, and canonical Career ID. Repair the nine existing selected prospects and deploy only this GTM work, excluding unpublished Intelligence Lab commit `3006009d`.

Product references: `docs/product/BLTZ_PRODUCT_DOCTRINE.md`, `AGENTS.md`, and the user's explicit instruction to automate selection, connect the existing cohort, validate, and deploy. This increment reuses `players.id`, the existing Player Master reference, contacts, previews, and review workflow. No new application or dashboard page.

## Behavior

- The Admin-authorized selection action calls one database transaction. It validates every GSIS ID, selects/reactivates the prospect, creates or reuses the reference-only contact and private preview, resolves an exact canonical Career ID, and creates the contact-to-Career-ID relationship.
- Where no canonical identity or same-name candidate exists, the existing identity function creates a private, unclaimed, unverified `players` row. A stable GSIS match reuses the existing Career ID and preserves its account and publication state.
- Same-name candidates, duplicate GSIS identities, archived contacts, and conflicting explicit links return a review-required result. Automatic selection never guesses a name match or overwrites a different verified relationship.
- Requests are bounded to 100 distinct IDs, serialize with the existing reviewed identity writer, and reuse rows on retry. Unexpected write failures roll back the whole batch. A disconnected client is told to refresh/retry rather than incorrectly told that no data was saved.
- Content revisions remain unchanged for identity-only preview attachments; normal content edits still increment revisions. This preserves existing preview content, review completion, and enrichment caches.
- Existing GTM views expose saved previews, exact Player Master records, activity/invitations, and canonical Lab links. The selected-player panel distinguishes setup, enrollment, and responses, including unverified interest submitted before campaign enrollment.
- Cohort selection does not grant viewer access, publish a new Locker, create an account or claim, enroll a conversion campaign, or send outreach.

## Existing cohort repair

Production project was verified as `drxtzxnwdtgxwueiqygf` (BLTZ), matching the application configuration and nine live prospects. The repository's temporary project reference pointed elsewhere; it was not used for writes.

All nine selected players now have distinct active contacts, previews, and canonical Career IDs, with exact contact relationships:

| Player | Career ID outcome |
| --- | --- |
| 'Omar Ellison | Created private unclaimed identity |
| Aaron Rodgers | Reused reviewed legacy identity |
| Antoine Cason | Reused reviewed account-linked identity; account link preserved |
| Desmond Bishop | Reused reviewed legacy identity |
| J.J. Arrington | Reused reviewed legacy identity |
| Keith Rivers | Reused exact existing GSIS identity and preview |
| Kris Wilson | Created private unclaimed identity |
| Lavelle Hawkins | Reused reviewed legacy identity |
| Roland Williams | Created private unclaimed identity; reused exact preview relationship |

The backfill created **3 contacts, 2 private preview drafts, and 3 private Career IDs**. Five legacy record IDs were individually reviewed using their unique name and recorded college context. The migration pins those IDs and checks that context, uniqueness, existing GSIS, and any available birth date before attaching them; it does not introduce a general name matcher. The unrelated duplicate Roland preview remains untouched.

## Database and migration changes

Active tracked migrations, created with Supabase CLI:

1. `supabase/migrations/20261022190320_connect_gtm_player_cohort.sql`: private authorized transaction, public invoker RPC, conflict-safe legacy promotion entry, identity-writer locking, and identity-only revision preservation trigger.
2. `supabase/migrations/20261022190727_backfill_selected_gtm_player_connections.sql`: bounded, audited repair of the nine previously selected prospects, preserving existing record IDs.

Both were applied atomically with their migration-history records through the authenticated Supabase CLI Management API. Production preservation assertions checked all preexisting Career ID content except GSIS/update time, preview content including revision except the identity link/update time, and existing contacts. Account counts, publication-link counts, and campaign counts stayed unchanged. The same assertions passed in a rolled-back production-schema dry run before application.

`types/database.generated.ts` includes the new RPC signature regenerated from the deployed schema; unrelated generated schema changes were excluded.

Permissions: existing internal Admin authorization remains mandatory at the action and database boundaries. The public RPC is security invoker; the private definer explicitly checks `auth.uid()` and `is_internal_admin()`, fixes its search path, and grants execution only to authenticated callers. Anonymous/service-role execution of the new RPC is revoked. No organization role, claim, rights, or public-read permissions changed.

Environment variables: none added or changed. Existing credentials remained server-side. No mailbox or invitation configuration was enabled.

## Files and routes

Automatic workflow files:

- `app/admin/gtm/players/actions.ts`
- `components/admin/gtm/GtmPlayerProspectsWorkspace.tsx`
- The two migrations above and `types/database.generated.ts`
- `tests/admin/gtm-cohort-actions.test.ts`, `tests/database/gtm-cohort-connections.test.ts`
- Updated existing workflow/reference contract tests and this report.

The release also includes the previously validated connection/navigation commit `f3b55125`; its complete file list is in `docs/planning/gtm-live-cohort-audit-2026-10-22.md`.

Existing routes affected: `/admin/gtm/players`, `/admin/gtm/contacts`, `/admin/gtm/funnel`, `/admin/preview-lockers`, and the identity-review entry at `/admin/preview-lockers/[id]/edit?identity=review`. Canonical navigation points to the existing `/admin/intelligence?athlete=<players.id>` route. No Intelligence Lab implementation file or new page/API route is included.

## Validation

- Full suite: **230 files passed, 2 skipped; 1,852 tests passed, 24 existing opt-in hosted tests skipped**.
- Database regression tests exercise anonymous/non-admin denial, private creation, exact identity reuse, account/publication preservation, repeated selection, name-only review, duplicate/conflicting identities, archived contacts, transaction rollback, revision preservation, normal content edits, and the exact nine-player backfill including repeat execution.
- Server-action tests verify validation/authorization, one atomic RPC, destination refresh, review-required results, missing migrations, and uncertain transport outcomes.
- TypeScript: passed after adding explicit SQL test result types. No runtime or application behavior changed in that correction.
- Full lint: 0 errors, 296 preexisting warnings. Changed-file lint: clean.
- Next.js 16.3.6 production webpack build: passed.
- Production-schema dry run: passed and rolled back before application. Persisted post-migration query independently verified all nine distinct connections.
- Security advisors: 19 existing findings before and after, **0 new findings**.

## Release and verification

Release staging and authenticated production browser verification are in progress. The prior production rollback artifact is `dpl_DGKPk44qnY9NJG8WBguFNLS1cP9E` (`bltz-3kujga6jq-daymeiions-projects.vercel.app`).

The release branch descends from production cleanup `1baebd59`, includes `f3b55125`, and excludes unrelated Lab commit `3006009d`. The shared root checkout and its ongoing changes are preserved.

Rollback: the previous frontend can be restored without deleting the repaired identities or relationships. The additive database RPC remains Admin-only and backward compatible. Do not delete the backfilled Career IDs, claims, relationship history, or audit entries to roll back UI code.

## Limitations and deferred work

The new Aaron Rodgers and 'Omar Ellison previews are drafts requiring content review. Existing drafts remain incomplete until their content is reviewed. Contacts still need reviewed recipient information before email outreach. Conversion enrollment still needs real campaign/source/channel attribution; it remains separate from cohort selection. Email delivery and athlete responses have not been fabricated or tested by sending messages. The unrelated Lab signals/directory work remains excluded, as does resolution of the extra Roland preview.

## Product-direction completion

Strengthened Player Master → selected prospect → contact → preview → persistent Athlete Career ID connections, plus access to recorded discovery/engagement signals. These relationships remain useful after the athlete leaves an organization. No new Moment or Value Graph relationships or future-phase schemas were created, no mature third-party workflow was duplicated, and no generalized media-management scope was introduced.
