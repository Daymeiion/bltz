# Prompt 4 — GTM UI / QA Handoff

## Scope delivered

- Added the `Admin → GTM` executive overview with the requested scorecard and operational panels.
- Expanded the contacts workspace to the complete filter, sorting, responsive, loading, empty, and action-column contract.
- Kept routine relationship work inside the right-side contact drawer and added authorized inline note editing.
- Added a dedicated `Admin → GTM → Imports` seven-step LinkedIn CSV workflow with adaptive field mapping, validation, preview counts, explicit uncertain Player-match review, approval, and commit.
- Preserved canonical Player architecture. GTM stores only contact-to-Player links and never writes Player Master records.
- Added a server-backed Admin logout and cleared stale sessions on rejected Admin re-authentication after browser QA exposed the authorization edge case.

## Files and ownership notes

- Routes: `app/admin/gtm/**`, `app/api/admin/login/route.ts`, `app/api/admin/logout/route.ts`
- GTM UI: `components/admin/gtm/**`, `components/admin/AdminSidebar.tsx`
- Import/matching contracts: `app/admin/gtm/actions.ts`, `lib/gtm/player-matching.ts`
- QA: `tests/admin/**`, `tests/auth/**`, `tests/gtm/**`, `supabase/tests/gtm_foundation_v1_ui_qa.sql`

No Supabase migration or canonical Player schema file was changed in Prompt 4.

## Acceptance result

All Prompt 4 acceptance areas pass: contact create/update/classification/filter/search/stage/scoring/archive; note create/edit/order/authorization; interaction metadata; partial/full discovery; LinkedIn import edge cases and 2,000-row boundary; Player matching ambiguity/manual verification/rejection/duplicate prevention; ordinary-user denial; and home, Player Locker, Admin, Users, and authentication regression routes.

## Verification evidence

- Full Vitest suite: 50 files passed, 2 skipped; 359 tests passed, 24 skipped.
- ESLint: pass.
- TypeScript: pass.
- Production build: pass with `next build --webpack` and the system certificate store; all 83 static pages generated. Turbopack cannot follow the worktree-only dependency junction outside the filesystem root.
- Local Supabase reset and database lint: pass.
- Rollback-only SQL acceptance: pass.
- Browser QA: pass at 1440×1000 and 390×844 with no GTM runtime errors.
- Screenshots and detailed findings: `.gstack/qa-reports/qa-report-localhost-2026-08-25.md` (locally ignored by Git) and the accompanying screenshot directory.

## Known non-blocking observations

- The development server reports existing remote-font fallback, image sizing, and Beta Intelligence GSAP warnings. No warning originates from the GTM surfaces.
- Import review renders the first 50 row previews while calculating batch-wide counts and presenting every uncertain Player match; the commit remains capped at 2,000 rows.
- Discovery aggregation is intentionally straightforward V1 exact-value aggregation; no AI summarization was added.

## Coordinator recommendation

Ready to merge after confirming the final commit and CI-equivalent command results below. No critical/high defects, authorization leak, migration change, Player architecture change, hidden TODO, or speculative feature was introduced.
