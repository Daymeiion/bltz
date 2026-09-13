# Contact pipeline simplification — local review

## Summary and scope
Authorized UI follow-up on `codex/preview-conversion-sprint`, based on release `40835889015011d124ae6a3a7264d3448b961a25`. Existing sprint commits retained; this follow-up is uncommitted. No main checkout changes, merge, push, production data writes, or deployment.

Contact stages describe the conversation: Identified, Contacted, In conversation, Follow up later, Closed. Closed means no further outreach planned, not successful conversion. Preview sent, claim interest, bookings, and walkthroughs remain separate evidence in Preview funnel. No stage auto-advances when an athlete submits interest.

## Files and routes
- `lib/gtm/types.ts`: allowed stages and plain-language definitions.
- `lib/gtm/classification.ts`: relationship strength remains null until reviewed; inferred factors cannot produce a complete enterprise score.
- `lib/gtm/server.ts`: stage metric contract, reviewed-factor indicator, authorized batched preview joins, and missing-migration guard.
- `components/admin/gtm/GtmContactsWorkspace.tsx`: updated metrics/filters, enterprise priority labels, desktop and mobile preview links.
- `components/admin/gtm/GtmContactDrawer.tsx`: stage definitions, enterprise-only scoring section, provenance and weights.
- `components/admin/gtm/GtmOverview.tsx`: matching stage counts and follow-up queues.
- Existing GTM unit/UI contract tests updated; added linked/unlinked shortcut coverage.
- `scripts/verify-gtm-pipeline-local.cjs`: rollback-only real PostgreSQL verification.
Routes affected: `/admin/gtm`, `/admin/gtm/contacts`; shortcut targets existing `/preview-lockers/[slug]`. No new routes.

## Database and migration
`20260911210051_simplify_gtm_contact_pipeline.sql` changes the existing contact stage constraint and updates both GTM metric RPCs. No new tables, roles, or columns.

| Old stage | New stage |
|---|---|
| identified | identified |
| connected | contacted |
| engaged, discovery, demo_candidate, pilot_candidate, active_pilot | in_conversation |
| nurture, not_now | follow_up_later |
| converted | closed |

The existing contact audit trigger retains previous/new stages, including archived records. Existing structured discovery, interactions and conversion events are preserved. Only auto-classified, unlocked relationship scores equal to the old inferred default are cleared; reviewed values and explanation history are preserved.

Stage counts describe the current non-archived portfolio. In-conversation counts use the stage; overdue follow-up counts and UI queues exclude closed contacts. Discovery metrics retain the explicit reporting window. Removed demo/pilot/conversion stage cards are not relabeled as athlete outcomes. RPC type remains JSON; Supabase types were regenerated locally and confirm the stage column remains `string`, with the narrowed application stage union and metric read model updated in source.

## Preview shortcut and permissions
Links resolve through existing conversion campaign/contact relations or explicit Player Master preview links. No name/email guessing, automatic creation, or viewer assignment. Missing links produce no button; conflicting explicit preview links produce no shortcut. Existing previews can be opened while preparation is in progress or after a response; the conversation stage does not determine preview existence or claim ownership. Both the contact query and target preview retain their existing Admin/authentication/RLS checks. No permissions or environment variables added.

## Verification
- Full Vitest: 594 passed, 24 pre-existing skips.
- Repository error-level ESLint: passed.
- TypeScript and local production build (`next build --webpack`, system CA): passed. Build is validation only, not a release.
- `git diff --check`: passed.
- Real isolated local Supabase: migration applied successfully; rollback assertions verify old-stage mapping, exact converted-to-closed audit, inferred score cleanup, reviewed-score preservation, stage counts, closed follow-up exclusion, old-stage rejection, and non-Admin denial.
- Browser: Contacts renders all five stages and real metric counts; direct link opens Synthetic Teammate private preview; Admin/test activity remains excluded. Saved In conversation through the form and refreshed: 4 Identified / 1 In conversation. Mobile list link is a separate keyboard-accessible anchor, not nested inside its contact button; keyboard Enter opened the preview.
- Existing empty, error, authentication, and preview tests remain green. No real outreach or external booking.

## Product direction and limits
Strengthens navigation between existing contact relationships and athlete previews; remains useful after an athlete leaves an organization. No new canonical identity, Moment, Value Graph, media workflow or third-party workflow duplication. No scope expansion into generalized media management.

Local previews use synthetic data. Standalone previews without an explicit contact or Player Master relationship cannot safely receive an automatic shortcut. Existing score judgments not identified as untouched classifier defaults are preserved. Broader visual redesign, staging rollout and production deployment are deferred for user review. Local browser proof leaves Synthetic Teammate in In conversation as a visible example.

## Reporting period follow-up
Added a labeled 30 days / 90 days / All time selector directly beside GTM metrics on `/admin/gtm/contacts`. URL query `period` controls the existing server-side RPC reporting window and persists across refresh; invalid values default to 30 days. All time passes PostgreSQL negative infinity, without an arbitrary historical cutoff. Contact and pipeline totals remain current portfolio measures; discovery counts and analysis use the selected history window. The optional contact query is preserved. No database migration, new environment variable, permission change, or graph model change.

Files: Contacts page, Contacts workspace, `lib/gtm/metrics-period.ts`, and its tests. Verified the 90-day view and changing the selector to All time in the local browser. TypeScript, changed-file ESLint, diff check and local production compilation passed; full suite now 596 passed / 24 existing skips. Still uncommitted and not deployed. Local synthetic history is sparse; selector does not fabricate additional historical records. Overview retains its existing default window; requested selector is on Contacts.

## Visual preview funnel follow-up
Redesigned `/admin/gtm/funnel` for a 100-preview operating cohort. Visual bars show viewed, claim-interest submitted, confirmed booking and completed walkthrough against the same sent-preview denominator. Measures are independent, not sequential attrition. Full conversion numerators, denominators, unique previews and event counts remain in an expandable table. Event totals include all enrolled previews and are explicitly distinguished from sent-cohort numerators.

Preview summaries use searchable/sortable 15-row pagination. Queue buttons replace the separate long dashboard-request, booked-call and decline lists. Selecting an athlete opens an accessible Sheet with response, existing Admin actions, navigation and a 15-event paginated timeline. Referral preparation has its own searchable paginated section and detail panel. Existing enrollment, reviewed matching, booking and walkthrough actions continue using the same protected server action. Escape closes the panel and focus returns to the originating row.

Files: `app/admin/gtm/funnel/page.tsx`, `FunnelWorkspace.tsx`, `AdminForms.tsx`, `lib/preview-lockers/funnel-workspace.ts`, `tests/gtm/funnel-workspace.test.tsx`, and the wireframe in `docs/design-reference/preview-funnel-wireframe.md`.

Server event reads now page beyond 1,000 records. The bounded limit is 20,000 events; totals are withheld if reached. Existing 1,000-preview/cohort/preparation list safety bounds remain explicit. No migration, schema/type regeneration, permission, environment, or public route changes for this redesign. No canonical identity, Moment, rights or Value Graph changes. The improvement helps operators maintain existing athlete/contact/preview relationships without duplicating media-management tools.

Verification: full suite 601 passed, 24 existing skips; repository error-level ESLint passed; diff check passed. A 100-athlete fixture verifies seven pages without duplicates/missing rows, search across the whole cohort, response queues and 15-row initial rendering. Event-reader tests cover 1,205 events and error/cap behavior. Live local browser checks: visual overview, response Sheet, 17-event timeline pagination, decline filtering, referral detail links, Escape and focus restoration. Existing auth, empty/error and conversion tests remain green. Screenshot review used the actual in-app viewport; responsive grids and stacked rows preserve the mobile hierarchy. No fresh narrow-device browser override was used in this pass.

All UI work stays uncommitted for review. No deployment, outreach or production mutations. Large-cohort testing is synthetic; the local visible cohort has five test-workflow previews, not 100 live athletes. Deferred: database-side aggregate/virtualized loading beyond the documented caps and production rollout.

## Create and enroll follow-up
The ordinary `/admin/preview-lockers/new` form now defaults to Create and enroll when `PREVIEW_CONVERSION_ENABLED=true`. Admins explicitly choose the GTM contact, campaign, source, channel, relationship and test flag. They may turn enrollment off to save a private-only draft. Existing referral preparation retains its reserved-ID automatic enrollment and does not ask for duplicate attribution. Editing an existing preview and Player Master create-or-open retain their prior behavior; the separate funnel enrollment control remains available for those already-created previews.

`POST /api/preview-lockers` accepts an optional validated enrollment object. Media validation and Admin authorization run before the combined RPC. `20260911223514_create_and_enroll_private_preview.sql` introduces `preview_conversion_create`, a SECURITY INVOKER function with an explicit internal-admin guard and the existing limited column grants. It creates the preview and calls the existing audited enrollment transaction together. Stable-ID advisory locking makes identical create retries safe. A contact/attribution conflict rolls creation back. No new tables or public access, viewer grants, athlete identity, claims, rights, outreach, or sent events. The sole new execute grant is authenticated access to an explicitly Admin-guarded function; RLS stays active. No application environment variables added.

Files: new-preview page, PreviewLockerForm, preview create API, conversion validation, generated conversion database types, new migration, `scripts/verify-create-enroll-local.cjs`, and enrollment-input tests. Full existing suite: 601 passed / 24 existing skips; two added input validation tests passed separately. TypeScript, changed-file ESLint and diff checks passed. Live isolated PostgreSQL assertions verified create/enroll persistence, identical retries, conflict rollback, audit entry and non-admin rejection. Browser created a synthetic test-marked preview and showed successful enrollment with no assigned viewer. Test preview remains excluded from funnel totals. Ordinary draft and referral paths retain the existing regression suite.

Local migration applied only to the conversion test stack; generated types refreshed from that schema. All edits remain uncommitted. Production rollout and adaptation of the separate Player Master create-or-open UI are deferred. This change strengthens explicit GTM-contact/athlete-preview attribution, remains useful across organization changes, and introduces no Moment/Value Graph or generalized media-management scope.

Build verification passed after limiting local worker concurrency with CIRCLE_NODE_TOTAL=3. The first attempt compiled/typechecked but a Windows worker crashed at 31-worker page collection; no repository build configuration was changed.

## Preview editor navigation follow-up

The sticky dirty flag blocked page links after fields were restored to their original values. The editor now compares actual draft/enrollment values with their initial or last-saved values. A visible Close preview link returns to saved previews; navigation with unsaved changes opens Stay and edit / Discard and leave confirmation. Active save/discovery protections remain.

Files: app/admin/preview-lockers/PreviewLockerForm.tsx, tests/preview-lockers/form.test.tsx, and this report. Routes: existing /admin/preview-lockers/new and /admin/preview-lockers/[id]/edit. No database, migration, environment, or permission changes for this fix.

Validation: TypeScript and component lint passed; production build passed using two workers. Full suite: 604 passed, 24 existing skips. Updated navigation regression verifies confirmation and retained text after Stay; reverted biography and cleared new-name checks verify unload is no longer blocked. Browser verified confirmation, Stay, restored empty/default fields, and Close returning to the saved preview list. Browser reload retains the native unsaved-changes prompt; active operations must finish or discovery be canceled before departure.

Graph impact: supports the private Locker preparation/claim workflow; no new Career, Moment, or Value Graph relationships. Useful regardless of current organization; no third-party workflow duplication or media-management scope expansion. Nothing merged or deployed. No further work deferred for this navigation fix.

## Save draft and searchable preview list

Summary: exposed an explicit Save draft action at the top and bottom of the editor. It uses existing private persistence without requiring the review checkbox or sending enrollment metadata. Existing reviewed save/enroll and cohort completion actions remain distinct. The saved list now has compact labeled icon links for Locker, Photos and Film Room, a visible Edit label without a repeated name, server-side case-insensitive name search across all pages, and newest/name ordering. Search resets pagination and page links retain filters.

Files changed: app/admin/preview-lockers/PreviewLockerForm.tsx; app/admin/preview-lockers/page.tsx; tests/preview-lockers/form.test.tsx; tests/preview-lockers/list.test.tsx; this report. Routes affected: /admin/preview-lockers, /admin/preview-lockers/new, /admin/preview-lockers/[id]/edit. Database schema/migrations/environment variables/permissions: no changes. Existing authorized Admin persistence, revision conflicts, media validation, RLS, and audit triggers remain in use. No merge, commit, or deployment performed.

Validation: 609 tests passed, 24 existing skips; component/test lint and TypeScript passed; production build passed (two local workers). Regression tests cover draft save without review or enrollment, invalid media rejection, retaining failed saves, search pagination and ordering, accessible icon destinations, empty/error states, and Admin authorization. Browser verification: name-only synthetic draft saved without review or enrollment, closed normally, appeared in the list, reopened with persisted content and no viewer assigned; uppercase name search matched the expected fixture. Desktop screenshot verified row spacing and icons. Mobile wrapping uses existing responsive flex patterns; a separate narrow-viewport browser pass was not performed.

Known limits: a draft still requires a valid name/slug and valid metadata for any rows or media already added; blank optional sections are permitted. Save draft does not persist pending enrollment attribution; enroll later through the funnel. Saving changes to an existing preview updates the version its assigned viewers can see; this is not a separate unpublished revision system. Search uses the database's alphabetical collation. Local synthetic draft: 48796b1c-2aa8-4ad1-8a51-a512d9e9a7b9; not enrolled in metrics. Product Doctrine file was absent from both worktree and original checkout; followed supplied AGENTS product direction.

Product impact: improves private Locker preparation and resumption, supporting the eventual claim loop without creating canonical identity relationships. No Moment or Value Graph additions. Useful after an athlete leaves an organization; no commodity media workflow duplication or scope drift. No further work deferred for this request.
