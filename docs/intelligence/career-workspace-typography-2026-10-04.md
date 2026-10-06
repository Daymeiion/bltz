**Historical UI integration receipt.** Current source/checkpoints and release status are in [CTO status](CTO-STATUS.md). Later caption typography takes priority over older prototype sizes.

# Intelligence Lab typography follow-up — October 4, 2026

## Summary and files
Increase all sixteen explicit 11px text declarations in `app/admin/intelligence/career-workspace.module.css` to 14px. This covers contact values, descriptions, evidence paragraphs and subtitles, disclosures, completeness rows, circle labels, popovers, expanded findings, empty states and the evaluation date field. Preserve 14px contact text on mobile instead of the prior 10px override. Also increase the smaller Moment overlines and findings-card subtitles from 9px to 14px, and allow long identifiers to wrap in completeness rows.

Release tooling `scripts/prepare-intelligence-career-release.cjs` recognizes the explicit saved typography candidate proof pair; it is excluded from uploaded runtime source. This report is also excluded. The isolated release changes only the workspace stylesheet from the preceding production deployment.

## Routes, schema, environment and permissions
Existing `/admin/intelligence`; no route additions. No database changes, migrations, environment variables, dependencies, permission changes or accounts. Existing server-side access control, canonical identifiers, private projections and media eligibility remain in effect. No provider calls, onboarding changes, graph writes or organization workflow changes.

## Validation and deployment
Live at [Admin → Intelligence Lab](https://bltz.vercel.app/admin/intelligence). Production deployment: `dpl_9LmZbkPrhaKGDBWi4KBUmyY5y41x` (`bltz-4r81kqqsw-daymeiions-projects.vercel.app`). Previous spacing deployment `dpl_3uC6g58LF6ypXPxhMxgiFoWnULzK` remains available for rollback.

- 231 existing Intelligence and platform authorization tests pass across 17 files. TypeScript passes; scoped lint is clean. No new tests were added for this reversible typography adjustment; unrelated baseline failures remain documented in the original release report.
- Held production build passed in 1m40s, including compilation, TypeScript and 93 static pages.
- All 1,077 uploaded source hashes match the isolated release; 67 approved overlays and exactly one runtime stylesheet changed from prior production. No forbidden files. The original 1,014-file baseline, authentication, Lockers and dependencies are preserved.
- Promotion and final production alias confirmed READY. Anonymous Lab page returns 307 to the existing admin login; API returns 401 with private/no-store, `nosniff` and `Vary: Cookie`. Trusted TLS verification enabled, no cookies or response bodies inspected.
- Proofs: `output/intelligence-career-release/output/typography-candidate-source-verification.json`, `typography-candidate-source-hashes.json` and `typography-production-checks.json`.

## Manual verification
- Existing authenticated Chrome session, no temporary access. Confirmed computed 14px contact values, evidence paragraphs and source subtitles, popover headings/text, Signal subtitles, circle labels, and expanded Signal, Opportunity and Activation descriptions. No remaining visible 11px Barlow text in the checked athlete view.
- Wide desktop: both outer column gaps remain 17px, zero horizontal overflow.
- 1,100px compact desktop: all Moment Connections values are 14px; canonical identifiers wrap with zero cell or page overflow.
- 390px mobile: contact values and athlete profile subtitle are 14px; portrait remains above the identity information; horizontal overflow is zero. Temporary viewport overrides reset.
- Keyboard navigation opens and closes the checked disclosures; attribution dismisses with Escape. Browser mouse dispatches timed out before clicks took effect; fresh snapshots confirmed the state and keyboard navigation completed verification. Returned to the top with the browser's Home shortcut before the final screenshot.
- Fresh load and subsequent navigation emitted zero new errors or warnings. Default desktop athlete view left open with the admin sidebar link intact.
- [Athlete screenshot](C:/Users/Administrator/bltz/output/intelligence-career-release/output/production-lab-typography.png), [Moment evidence screenshot](C:/Users/Administrator/bltz/output/intelligence-career-release/output/production-lab-moment-typography.png).

## Product direction, limitations and deferred work
Existing athlete → Moment → evidence → signal → opportunity relationships become easier to inspect; this CSS adjustment creates no factual graph links or Value Graph records. It remains useful after an athlete leaves an organization. No mature third-party workflow is duplicated and no generalized media-management scope is introduced. Existing data limitations remain documented in the original workspace release. No additional work is deferred by this typography change.
