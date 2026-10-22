# GTM live cohort audit and connection fixes

## Objective and scope

Check the deployed GTM funnel against the selected Player Master prospects, preview activity, invitations, responses, and Intelligence Lab identity links. Reference: the user's live audit request and `docs/product/BLTZ_PRODUCT_DOCTRINE.md` (persistent identity and connected discovery signals).

Included: existing GTM funnel, Player Master, contacts, preview editor, and navigation. Excluded: the separate unpublished Intelligence Lab redesign/signals commit `3006009d`, email enablement/sending, automatic campaign attribution, bulk identity creation, identity merges, and public sharing changes. The fix is isolated on `codex/gtm-player-connections-2026-10-22` from production cleanup commit `1baebd59`.

## Live findings

Audit performed October 22, 2026 through the signed-in production Admin UI and read-only data queries. No invitation, response, claim, enrollment, identity link, publication, or deletion was submitted.

| Selected prospect | Contact | Linked preview | Canonical Career ID | Shared preview |
| --- | --- | --- | --- | --- |
| 'Omar Ellison | Missing | Missing | Missing | No |
| Aaron Rodgers | Missing | Missing | Missing | No |
| Antoine Cason | Created | Draft | Missing | No |
| Desmond Bishop | Created | Draft | Missing | No |
| J.J. Arrington | Created | Draft | Missing | No |
| Keith Rivers | Created | Draft / incomplete | Linked | Public |
| Kris Wilson | Created | Draft | Missing | No |
| Lavelle Hawkins | Created | Draft | Missing | No |
| Roland Williams | Missing | Draft | Missing | No |

- Nine selected prospects, six active associated contacts, seven exact Player Master-to-preview relationships. All six contacts have no email recorded.
- Zero real conversion campaign enrollments. The existing conversion list reads `preview_conversion_campaigns`, not `gtm_player_prospects`; selection/contact creation does not perform enrollment. No real enrolled invitations or conversion responses appear in that list.
- Keith's 90-day production activity: 2 Locker views, 5 photo-room visits, 3 film-room visits, 26 photos opened, 2 videos opened, 1 claim click, 0 accepted interest, and 0 claim-interest submissions. These are events; two tab sessions do not prove two people.
- Keith has 39 accepted analytics events, all acknowledged by Tinybird. No pending, retry, quarantine, or dead-letter items were reported for that preview. The other six selected previews have no accepted events in the production preview delivery registry examined.
- Email sending is disabled. Keith's report has zero tracked email attempts. The current live UI withholds invitation history for unshared previews, so the audit does not certify their historical SMTP attempt counts. Analytics acknowledgments do not prove email delivery. Sending has not been tested by sending a real invitation.
- The single public inquiry found belongs to a synthetic email-test preview, not one of these selected athletes. No public inquiries were found for the seven selected previews.
- Keith's Lab record opens through canonical `players.id` and displays his preview plus two Moments. His GTM contact nevertheless displays "No Player match": the preview identity link exists, but there is no corresponding `gtm_contact_players` row. A saved preview link is not silently represented as a verified contact match.
- A second unassociated Roland WIlliams preview and a synthetic email-test preview exist. Neither was merged, deleted, or treated as an exact Player Master relationship.

## Root causes

1. Prospect selection, contact creation, preview creation, canonical identity connection, sharing, conversion enrollment, invitation sending, and response submission are separate persisted steps. The interface did not show the gaps together.
2. GTM's navigation called the master list only "Players", omitted the saved-preview list, and offered no direct Lab connections. The sidebar's Preview Lockers entry opened the new-preview builder.
3. The contact drawer received the saved preview relationship but did not render navigation from it or use its explicit canonical identity link for Lab navigation.
4. The conversion list only included enrolled previews, hiding the selected prospects and any pre-enrollment public interest submissions.

## Changes

- The existing GTM funnel now includes a selected-player table showing contact/email readiness, preview state, conversion enrollment, responses/public interest, and existing record connections. Conversion filters do not change these setup states. The first 50 selected players are shown with an explicit link to the complete paginated master view.
- Added exact-GSIS navigation to Player Master to avoid punctuation and name ambiguity. Filters preserve the selected/contact view and exact reference.
- Added saved Preview Lockers and Intelligence Lab navigation; corrected the sidebar to the saved-preview list.
- Contact and Player Master views expose preview management, activity/invitations, and the canonical Lab destination. An unlinked preview opens the existing reviewed identity connection controls in the preview editor. Conflicting explicit Career IDs do not open a guessed Lab record.
- Preserved ambiguity when a contact is associated with multiple distinct previews; later rows cannot restore an arbitrary link.
- Public interest on selected previews is visible before enrollment, labeled unverified and separate from account-based conversion responses. Bounded reads explicitly report incomplete results.

### Files changed

- Funnel: `app/admin/gtm/funnel/page.tsx`, `SelectedProspectsPanel.tsx`, `PreviewActivityPanel.tsx`.
- Shared navigation and connections: `components/admin/AdminSidebar.tsx`, `components/admin/gtm/GtmNavigation.tsx`, `GtmPlayerConnections.tsx`, `GtmContactDrawer.tsx`, `GtmPlayerProspectsWorkspace.tsx`.
- Read models: `lib/gtm/player-prospect-contract.ts`, `player-prospects.ts`, `server.ts`.
- Existing identity review entry: `app/admin/preview-lockers/PreviewLockerForm.tsx`, `app/admin/preview-lockers/[id]/edit/page.tsx`.
- Tests: `tests/admin/gtm-player-connections.test.tsx`, `gtm-player-preview-workflow.test.ts`.
- This report.

### Routes, data, and permissions

Existing routes changed: `/admin/gtm/funnel`, `/admin/gtm/players` (optional exact `gsis` filter), `/admin/gtm/contacts`, `/admin/preview-lockers/[id]/edit` (optional `identity=review` entry). Existing destinations: `/admin/preview-lockers`, `/admin/intelligence?athlete=<canonical players.id>`. No new page or API route.

No database writes, schema changes, migrations, new environment variables, or permission changes. Reads use existing authenticated Admin guards and RLS. The service-role credential was used only server-side for the read-only audit. No credential, private contact email, or link token is included in this report.

## Validation

- Full Vitest suite: **228 files passed, 2 skipped; 1,837 tests passed, 24 skipped**. Skips are the existing opt-in hosted checks.
- Full lint: **0 errors, 296 existing warnings**. Final changed-area lint: **0 errors, 6 existing warnings**.
- TypeScript `tsc --noEmit --incremental false`: passed.
- Next.js 16.3.6 production webpack build: passed, 105 static pages generated.
- Local production-mode authentication smoke check: `/auth/admin` returns 200; GTM funnel, exact-GSIS Player Master, contacts, and identity-review editor routes return 307 to Admin login for an unauthenticated visitor.
- New regression coverage: canonical versus preview identifiers, exact GSIS filtering, conflicting identity links, unlinked identity review, selected players without enrollment, test enrollment labels, unavailable data, and unverified interest before enrollment.
- Live manual checks: selected prospects and contacts agree with database links; Keith's analytics and delivery evidence agree; live Lab opens Keith and his two Moments; unshared preview reports show the existing exclusion message; sending is disabled; the unfiltered conversion cohort is empty.
- An initial sandboxed Vitest run could not rename temporary cache files (`EPERM`); rerunning with the required Windows process permissions resolved the environment failure. A source-projection assertion was updated for the added `player_id` field; the final full suite passed.

## Remaining setup and limitations

- This connection fix is validated in its isolated branch and has **not been deployed**. The separate Lab commit remains excluded. Production still has the audited navigation gaps until this branch is released.
- Authorized browser verification of the new UI must follow deployment; local automated tests cover its rendered states. Existing production was inspected with the user's signed-in Admin session.
- Six previews need reviewed Career ID connections. Aaron Rodgers and 'Omar Ellison need preview/contact setup; Roland Williams needs a contact.
- Enroll the intended preview/contact pair with real campaign, source, relationship, and channel attribution. Do not fabricate historical sent times. Review sharing/access and recipient details before outreach.
- Do not enable sending or send athlete invitations as part of this audit. A controlled, explicitly authorized email test remains deferred. No claim can be made about end-to-end SMTP delivery or an athlete's future response.
- Keep the duplicate Roland draft for separate identity review. No new Lab signal or opportunity is created merely by enrollment or contact creation.

## Product-direction completion

The change exposes existing Player Master → prospect → contact → preview → canonical Athlete Career ID relationships and connects them to permitted discovery signals. These relationships remain useful after an athlete leaves an organization. No new Moment or Value Graph relationships are created. No mature external workflow is duplicated, no new dashboard page is introduced, and no generalized media-management scope is added.
