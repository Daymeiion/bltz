# Manual preview Admin handoff — 2026-10-13

## Objective and scope

Support the approved manual pilot of approximately ten reviewed Preview Lockers: enroll an intended contact without email, manually share a published link, record the actual channel and sent time, review unverified visitor interest, and extend an opened viewing window after a personal request. The rollout plan and Product Doctrine control this scope. No outreach automation, new Career/Moment/Value schema, identity verification, ownership claims, or CRM expansion is included.

## Admin behavior

- `/admin/preview-lockers/[id]/link` shows pending, active, expired, extended, and unpublished access with start, expiry, last-extension, and observation times. The first eligible visible **nonstaff visitor** open starts the shared window; that visitor may be someone other than the intended athlete. A verified Admin session inspecting on the same host does not start it. Renaming, publishing, and republishing preserve its original timing.
- An Admin can extend an active or expired published window by 48 hours after entering a 10–500-character reason and confirming a personal request. Pending windows cannot be extended. The server computes the deadline. A stable request reference recovers an uncertain result without applying another extension.
- `/admin/gtm/funnel` accepts Instagram, Facebook, LinkedIn, and text/SMS alongside the existing channels. Enrollment attribution remains immutable. Manual sent evidence records its own actual channel and selected past time; browser local time is converted to UTC and retained on retry. Recording it sends no message or email.
- Public inquiries have a separate “Public interest” queue and leave “Awaiting response” without fabricating an account-based response. Submitted email and feedback remain unverified. An explicitly reviewed email can be copied only to the exact enrolled contact while its email is empty; the guarded RPC audits the change and refuses overwrite or association conflicts.
- Existing publication review, builder/PFR controls, conversion denominator, analytics panel, and email/bounce panel are retained. Manual sent marks remain separate from SMTP and delivery evidence.

## Changed surface and dependencies

Admin link page and new `PreviewAccessWindow`; existing funnel page, `AdminForms`, actions, and `FunnelWorkspace`; channel validation and funnel read model; focused interaction/action tests. Backend work supplies the additive migration, generated lifecycle/sent/review fields, audited extension endpoint and email-review RPC, access predicates, and database verification. There are no new UI environment variables or client credentials. Admin authorization is rechecked for every server action.

## Manual verification

Local checks passed: 52 tests across eight focused UI/action/tracking/email suites, scoped ESLint with no findings, and integrated TypeScript (`tsc --noEmit --incremental false`). Production build and hosted manual verification remain with the release owner.

1. Enroll a preview against a contact without email. Publish after the existing rights review; inspect its Admin page and confirm the window is still pending.
2. Manually share it through one of the pilot channels. Record that channel and the actual past sent time. Verify enrollment attribution is unchanged and no email attempt is created.
3. Open the link as an eligible visible nonstaff visitor. Check that Admin shows one start and deadline. Retry, rename, and republish; verify those do not restart it.
4. Submit the public interest form. Verify the cohort shows unverified interest and submitted email while the contact email and ownership remain unchanged.
5. Explicitly review and copy the submitted email to its empty enrolled contact. Confirm audit creation. Test a nonempty/concurrently changed contact and mismatched contact; existing email must remain intact.
6. After a personal request, extend an active and an expired window. Confirm the audited deadline is 48 hours after the later of the old deadline or server time. An unauthorized actor and a pending window must fail. Simulate a lost response and retry the same request; it must apply once.
7. Verify expired direct, alias, room, media, and inquiry paths fail for nonstaff. Inspect narrow/mobile layouts, keyboard controls, failure messages, empty states, and the preserved email/PFR panels.

## Release baseline already verified by the release owner

Phase 1 commit `e42a0d26b6033ad33ddc4feaaf0abefe01ab77fb` is deployed and READY on both production aliases. Production invitation sending remains disabled; read-only bounce sync is enabled. The single approved synthetic IONOS send was accepted by SMTP, then a genuine failed DSN matched the attempt and appeared as Bounced in Admin. Two signed worker replays preserved one receipt. SMTP-accepted and bounced events each reached exactly one physical Tinybird row with matching payload hashes. The synthetic Locker was unpublished afterward; no real player was contacted. Evidence: `output/bounce-verification-2026-10-13/final-scoped-receipt.json` in the primary workspace.

The final local Next16.3.6 Webpack production build passed (98 generated pages); TypeScript and scoped lint passed. The disposable PostgreSQL proof passed 48 assertions covering clock preservation, expiry, permissions, audited extension retries, no-email manual sent evidence, inquiry review, and the 32-item affiliation cap. Independent review found and resolved pagination URLs outliving the deadline and legacy viewers minting long-lived Storage URLs. A broader regression run identified two stale mocks/authorization guard fixtures; those were corrected without application changes. The final regression suite passed 611 tests with five opt-in live tests skipped; both changed shared player route/photo test files passed nine further tests.

## Hosted checkpoint and controlled verification

Code checkpoint `7ec12accbb3d5b4a0cb574371d2902810818c912` was committed, pushed to main and deployed READY as `dpl_HwYBd9YpdJTjit68utAX3Bvk9udP` on bltz.me and bltz.vercel.app. The atomic drift-guarded migration applied once to the verified canonical database, bringing history80→81. Production Config and source still keep player emailOFF and bounce syncON; the new signed worker returned200. Unauthorized extension returned401 and admission without a valid origin returned403.

The retained synthetic Locker was enrolled against one new manual-only contact with no email and no canonical player link; its test cohort is excluded from pilot conversion/engagement metrics. Publishing and signed-in Admin inspection remained pending. A verified signed-out visible browser admission on bltz.me started at `2026-10-13T16:54:15.164208Z`, expiring exactly48 hours later. Reload, Photo Room and Film Room visits preserved the clock. One user-approved synthetic Admin extension changed the deadline by exactly48 hours to `2026-10-17T16:54:15.164208Z`, retaining the original start. Production showed one start audit and one extension audit.

One synthetic public interest request saved and appeared in Admin as unverified; the enrolled contact email remained empty. The test generated no further invitation attempt: today's count remained one. No manual social delivery or sent evidence was fabricated. The test cohort is intentionally hidden from the ordinary funnel; manual sent and explicit reviewed-email copy were proven locally, not falsely reported as exercised in the hosted ordinary cohort. No real Locker clock was started; Keith's remained pending. The synthetic Locker was unpublished after verification, preserving draft, inquiries, cohort and audit history.

Hosted snapshots and screenshots are retained in the primary ignored `output/bounce-verification-2026-10-13` directory. Expired-window renewals and near-expiry signing were tested against disposable PostgreSQL/mocks, not by waiting48 hours or backdating production. Phone viewport emulation did not apply on this browser (observed width1860 after requested391); actual phone visual QA remains unverified. Desktop controls and empty-room states were inspected, and browser sizing was restored. These limitations must not be represented as completed hosted tests.

## Database, permissions and limitations

The single additive migration is `supabase/migrations/20261013161640_preview_manual_link_access_window.sql`. It adds lifecycle fields to existing short links, actual sent-channel metadata to existing enrollments, and explicit reviewed-email metadata to existing inquiries. It does not create another athlete identity model. Existing published links begin pending their next eligible visible admission; no historic first-open timestamp is fabricated. Generated scoped preview and conversion types were refreshed from the disposable schema. No data is deleted or imported, no provider-specific columns or future-phase graph tables are added, and the exact existing team validator changes only its cap12→32.

Public admission/status RPCs are server-only; extension and email-copy RPCs recheck Admin identity. Lifecycle columns cannot be changed through ordinary Admin table updates. Existing RLS remains enabled. Direct nonstaff SELECT/signing in the two private preview Storage buckets is removed; authorized server code reads through the existing permissions, caps the URL lifetime to the remaining window and signs with the existing server-only client. Admin upload/inspection and unrelated Storage policies remain. New routes are `/api/preview-link-access/start` and `/api/admin/preview-lockers/[id]/access-extension`; the existing paginated photos API, alias, Locker, Photos, Film and video-detail routes enforce the shared deadline. No new environment variables or credentials are needed. Player email sending staysOFF, bounce monitoringON, and broader intelligence workflowsOFF.

Anonymous link possession and an interest form do not verify athlete identity or ownership. Forwarding a link or opening it while signed out can start its shared clock. Already-viewed content, downloaded files, external provider URLs and signed URLs issued before this release cannot be retroactively recalled. Browser-visible public inquiries retain their unverified status even after reviewed contact email copy. Restricted unpublished Auth grants retain their existing assignment-based48-hour behavior. Separate-client race testing was unavailable because Docker is stopped; row-lock logic, serialized retry tests, and subsequent hosted open/reload tests are distinct evidence. Automated player outreach, SMTP sending activation, identity verification and future graph phases remain deferred.

## Product direction and deferred work

This improves the existing Locker distribution, intended-contact relationship, and follow-up loop while preserving the separation between career identity and user accounts. It remains useful for former athletes. No Moment or Value Graph relationship is introduced, and no mature media-management workflow is duplicated. Automated outreach, claims/identity verification, and future-phase graph work remain deferred.

## Production build correction

The documentation checkpoint `507e250` did not replace the live functional `7ec12ac` deployment. Its first deployment failed with a transient registry404 for an unchanged pinned HeroUI tarball; the one exact-source retry installed successfully but failed in Turbopack's `next/font/google` import mapping. The supported production script now explicitly runs `next build --webpack`, matching the successful release validation. Development still uses Turbopack. No dependencies, lockfile entries, credentials, migrations, application behavior or sending flags change. The 84 pre-existing HeroUI lock entries missing resolved/integrity metadata remain deferred reproducibility debt, not a demonstrated cause of the font failure. Verify the new Git deployment is READY on both aliases before claiming this correction is live; retain the sanitized receipt in ignored output.

The actual corrected `npm run build` completed locally with exit0 and98 generated pages, using public Supabase configuration only, trusted TLS, and email sending disabled. The correction changes only this production script and this handoff; the620 regression-test and48 disposable PostgreSQL assertion evidence belongs to the unchanged functional code checkpoint above.
