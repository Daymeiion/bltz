**Historical UI integration receipt.** Current source/checkpoints and release status are in [CTO status](CTO-STATUS.md). Later caption typography takes priority over older prototype sizes.

# Intelligence Lab spacing follow-up — October 4, 2026

## Objective and scope
Equalize the visible desktop spacing between the athlete watchlist, middle workspace and findings rail. This is a small follow-up to the approved production Intelligence Lab. The existing Product Doctrine and [workspace release](career-workspace-release-2026-10-04.md) govern the workflow. No graph, ingestion, onboarding or organization workflow changes are included.

## Changes
- `app/admin/intelligence/career-workspace.module.css`: cap the desktop portrait grid track at 250px (or 40% on narrower desktops), align the portrait to the start of the middle column, and remove the folder's leading inset. Both visible outer gaps retain the existing 17px spacing. Mobile portrait centering remains in its existing breakpoint.
- `scripts/prepare-intelligence-career-release.cjs`: recognize the saved, verified theme deployment as the existing production baseline for this scoped follow-up. The deployment helper is excluded from uploaded runtime source.
- This report is excluded from the runtime upload.

## Routes, data and permissions
Existing `/admin/intelligence` only; no route additions. No database changes, migrations, environment variables, permission changes or new accounts. Existing server-side authorization is retained. The isolated release preserves production authentication, Lockers, package files and dependencies.

## Validation and deployment
Live at [Admin → Intelligence Lab](https://bltz.vercel.app/admin/intelligence). Production deployment: `dpl_3uC6g58LF6ypXPxhMxgiFoWnULzK` (`bltz-cbpti2cab-daymeiions-projects.vercel.app`). Previous production `dpl_FfFEDxZvz5haNpSjDAkuAfsAKjpy` remains available for rollback.

- Existing Intelligence and platform authorization tests: 231 passed across 17 files. TypeScript passed; scoped lint clean. No new tests were added for this reversible CSS adjustment. Unrelated baseline test failures remain documented in the preceding release report.
- Held production build passed in 1m54s, including compilation, TypeScript and 93 static pages.
- All 1,077 uploaded source hashes match the isolated release; 67 approved overlays, exactly one runtime stylesheet changed from preceding production, no forbidden files. Original 1,014-file source baseline preserved. Source attestation and final live-alias verification completed before and after promotion.
- Anonymous production checks passed: page 307 to existing admin login; API 401 with private/no-store, `nosniff` and `Vary: Cookie`. No cookies or response bodies inspected.

Proofs: `output/intelligence-career-release/output/spacing-candidate-source-verification.json`, `spacing-candidate-source-hashes.json`, and `spacing-production-checks.json`.

## Manual verification
- Existing authenticated Chrome session; no temporary access created. Intelligence Lab remains in the admin sidebar.
- 1,864px desktop: left portrait gap, left folder gap and right folder gap all measure 17px. Portrait remains 250×250px. The preceding portrait gap was 212px.
- 1,100px compact desktop: both outer folder gaps measure 17px; no horizontal overflow.
- Moment Evidence and Media tabs both measure 1,113px folder width on wide desktop; no tab-related expansion.
- 390px mobile: portrait centered at 300×300px, identity information below it, zero horizontal overflow. Temporary viewport overrides reset.
- Fresh production load, tab changes and sidebar navigation emitted zero new errors or warnings. Default desktop athlete view left open.
- [Verified desktop screenshot](C:/Users/Administrator/bltz/output/intelligence-career-release/output/production-lab-spacing.png).

## Product direction / limitations / deferred work
This presentation adjustment preserves the existing athlete → Moment → evidence → signal → opportunity relationships; it creates no factual relationships or Value Graph records. It remains useful after an athlete leaves an organization and duplicates no third-party media workflow. Existing data limitations and deferred ingestion work are unchanged. No additional work is deferred by this spacing change.
