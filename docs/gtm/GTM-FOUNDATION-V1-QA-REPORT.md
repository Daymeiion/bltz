# GTM Foundation V1 Coordinator QA Report

Date: 2026-08-25

Review branch: `codex/gtm-foundation-v1-review`

Combined implementation reviewed through: `e1b5a2b`

Coordinator correction: `0e4ce8f`

Integration base: `81a4efc`

## Gate recommendation

**PASS for staging. Do not merge implicitly; no merge or deployment was performed by this review.**

- Open P0: 0
- Open P1: 0
- Resolved P1: 1
- Open P2: 1
- P3 observations: 2

The required 22-step administrator journey passed as one continuous browser workflow. The P1 metrics defect found during the journey was corrected, replayed from an empty local database, and covered by both migration-contract and rollback-based database tests. Advanced GTM was not started.

## Journey result

| Step | Result | Evidence |
| --- | --- | --- |
| 1. Admin signs in | Pass | Authorized `super_admin` entered BLTZ Admin. |
| 2. Opens GTM | Pass | Overview rendered the existing Admin shell and GTM subnavigation. |
| 3. Opens Imports | Pass | LinkedIn import workspace opened without leaving Admin. |
| 4. Uploads CSV | Pass | Five-row synthetic CSV accepted; no records committed on upload. |
| 5. Maps fields | Pass | Header suggestions worked and an unexpected `League/Level` header was manually mapped. |
| 6. Sees preview | Pass | Preview reported 5 found, 3 new, 1 duplicate, 1 matched Player, 1 possible Player match, and 1 invalid row. |
| 7. Reviews duplicates | Pass | Duplicate and invalid sections expanded with row-level reasons. |
| 8. Reviews Player matches | Pass | Strong team-qualified match selected; ambiguous same-name match required review and was rejected. |
| 9. Confirms import | Pass | First commit: 3 created, 0 updated, 1 skipped, 1 failed. |
| 10. Opens Contacts | Pass | Three active contacts displayed. |
| 11. Searches | Pass | Search isolated Riley Morgan. |
| 12. Opens drawer | Pass | Right-side desktop drawer opened; mobile used a full-width operable drawer. |
| 13. Classifies | Pass | Contact changed to Enterprise with a university-partnership segment. |
| 14. Updates scoring | Pass | Factors 5/5/4/4/5 produced score 93 and Tier A. |
| 15. Adds note | Pass | Timestamped personal-context note appeared in the drawer timeline. |
| 16. Logs interaction | Pass | Outbound LinkedIn interaction, outcomes, follow-up, next action, and next trigger persisted. |
| 17. Adds discovery | Pass | Partial-friendly structured discovery saved, including unknown willingness to pay. |
| 18. Sets next action | Pass | Action and date updated from the drawer. |
| 19. Changes stage | Pass | Contact moved to Demo Candidate. |
| 20. Links Player | Pass | Search returned two same-name canonical Players; Phoenix was manually verified. Duplicate pair prevention passed. |
| 21. Returns to overview | Pass | Overview reflected the completed workflow. |
| 22. Confirms metrics | Pass after P1 correction | 3 total, 1 enterprise, 2 athletes, 1 priority, 1 needs follow-up, 1 discovery conversation, and 1 demo candidate. |

The same CSV was then repeated. Preview changed to 0 new, 3 existing, 3 updates, 1 duplicate, and 1 invalid; commit produced 0 created, 3 updated, 1 skipped, and 1 failed. This demonstrated idempotent identity matching and reliable updates rather than duplicate creation.

## Findings

### P0 — blocking

None.

### P1 — must fix before staging

#### Resolved: archived contacts inflated discovery analytics

The original `get_gtm_metrics_v1` filtered contact metrics through active contacts but queried discovery records directly. Archiving a contact removed it from contact totals while leaving its discovery conversation, problems, features, objections, pilot intent, and willingness-to-pay signals in current-portfolio analytics.

Before correction: discovery conversations changed from 1 to 2 when a discovery record belonging to an already archived contact was inserted.

After correction: the metric remained 1.

Correction: `20260825220000_fix_gtm_metrics_active_discovery.sql` introduces a single active-contact projection and joins every discovery aggregate to it. The migration replaces only the reporting function, preserves historical rows, retains invoker security and the internal-admin guard, and keeps existing grants.

Regression coverage now archives the fixture contact, asserts discovery conversations fall to zero, restores it, and verifies audit creation/redaction.

### P2 — should fix

#### Standard Supabase test command does not understand repository SQL checks

`npx supabase test db` exits 1 because all three existing SQL files are rollback/report scripts and emit no pgTAP plan. Each script succeeds when executed directly with `ON_ERROR_STOP=1`, including the strengthened GTM workflow/RLS/audit regression. Convert these scripts to pgTAP or move non-test inventory reports out of `supabase/tests` so the standard command becomes a reliable CI gate.

This does not block staging because the scripts themselves executed successfully and rolled back, but the wrapper command currently reports a false-negative test failure.

### P3 — future enhancement

1. Add `League/Level` as an import-header suggestion alias. Manual mapping already handles it correctly.
2. Clarify preview copy that currently groups duplicate and invalid rows under “rows skipped,” while the final result splits skipped and failed counts.

## Security and data-integrity verification

- Ordinary authenticated user: Admin sign-in rejected with `not_admin`; direct `/admin/gtm` access redirected.
- Ordinary authenticated REST read of `gtm_contacts`: no rows returned under RLS.
- Ordinary metrics RPC and GTM write: denied with 403.
- Admin reads, counts, imports, mutations, and metrics remained server-authorized; client visibility was not used as authorization.
- GTM notes, interaction summaries, and discovery prose were absent from audit metadata. Required note, interaction, discovery, and Player-link audit events were emitted.
- Two seeded canonical Player rows remained two after import and matching. GTM code selects Players and writes only `gtm_contact_players`; it contains no Player insert/update path.
- Two same-name Players produced an ambiguous review rather than an automatic name-only merge.
- Re-verifying the same contact/Player pair retained one join row.
- Archive retained history while excluding the contact and its discovery data from current metrics.
- GTM migrations contain no Player table writes, no Player entity duplication, and no destructive table removal.

## Migration and type verification

- Clean `supabase db reset`: pass; all migrations through `20260825220000` applied in order.
- `supabase db lint --level warning`: pass, no schema errors.
- GTM rollback workflow/RLS/import/matching/metrics/audit script: pass.
- Phase 2 deployment inventory script: pass.
- Phase 2 tenant RLS script: pass.
- Recovery model: additive, forward-fix oriented. The coordinator correction is data-preserving and can be recovered by replacing the function with a corrected definition; no backfill or destructive rollback is required.
- Fresh local type generation matches the committed `public` schema. The only textual differences are the intentionally preserved staging PostgREST metadata and local-only `graphql_public` output.

## Automated and regression gates

| Gate | Result |
| --- | --- |
| Vitest | Pass — 51 files passed, 2 skipped; 361 tests passed, 24 skipped |
| TypeScript | Pass — `tsc --noEmit` |
| ESLint | Pass — 0 errors; 204 pre-existing warnings, no GTM warnings |
| Production build | Pass — Next.js 16.3.1 webpack build, 83 static pages generated |
| Database reset | Pass |
| Database lint | Pass |
| Direct database regression scripts | Pass |
| Standard `supabase test db` wrapper | P2 — false-negative because scripts are not pgTAP |

Existing Player Locker, Admin navigation/authentication, organizations/tenant authorization, onboarding/Player pipeline tests, and production route compilation all remained green. The GTM diff was also scanned for hidden TODO/FIXME/HACK markers and Player write paths; none were found.

## Responsive and visual evidence

Desktop overview and import states use the existing BLTZ Admin navigation, typography, neutral surfaces, controls, cards, tables, and drawer patterns. At 390 × 844, contacts reflow to cards and the drawer becomes full width while keeping the five primary actions visible.

- Overview before journey: `gtm-review-overview-before.png`
- Import preview: `gtm-review-import-preview.png`
- Overview after journey: `gtm-review-overview-after.png`
- Mobile contacts: `gtm-review-contacts-mobile.png`
- Mobile drawer: `gtm-review-drawer-mobile.png`

## Final coordinator decision

GTM Foundation V1 has no open P0 or P1 findings and is ready for staging review. The branch has not been merged or deployed. Advanced GTM may be planned only after the staging owner accepts this report; this review did not begin that work.
