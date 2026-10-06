**Historical UI integration receipt.** Current source/checkpoints and release status are in [CTO status](CTO-STATUS.md). Later caption typography takes priority over older prototype sizes.

# Intelligence Lab release — October 4, 2026

Status: live and verified at [Admin → Intelligence Lab](https://bltz.vercel.app/admin/intelligence). Final production deployment: `dpl_FfFEDxZvz5haNpSjDAkuAfsAKjpy`.

## Summary / scope
The approved athlete and Moment concepts now use the existing canonical athlete and reviewed Intelligence graph. The private Lab is the default `/admin/intelligence` view and is reachable from desktop/mobile admin navigation. The latest production Locker, authentication and dependencies are preserved through an isolated release overlay.

## Files changed
- `app/admin/intelligence/CareerWorkspace.tsx`, `career-workspace.module.css`, existing `page.tsx`, `Workspace.tsx`, `loading.tsx`, `error.tsx`.
- `app/api/admin/intelligence/route.ts`.
- `lib/intelligence/workspace-server.ts`, `workspace-types.ts`, `evidence-projection.ts`, existing `lab-server.ts` and associated focused tests. Client projections exclude review actors, transport payloads and unrelated metadata from evidence data.
- Minimal Intelligence additions in `components/admin/AdminSidebar.tsx` and `AdminThemeShell.tsx`.
- Existing Intelligence readers, signal engine, contracts/types and test support restored because the latest production source lacked the earlier Lab.
- Barlow Condensed font with its OFL license; production integration notes; scoped release preparation helper.
- The platform authorization regression test recognizes and verifies the existing server-only Intelligence assignment gate.

## Routes / database / environment / permissions
Routes: existing `/admin/intelligence`; new protected read-only GET `/api/admin/intelligence`. Moment details use the actual Moment UUID in the same route's query string. No database changes, migrations, environment changes, accounts, credentials, permission changes, provider requests or onboarding changes. The existing internal-admin RPC gates data access before service-role construction. Responses are private and uncached; raw provider payloads and credentials remain server-side.

## Data / graph relationships
Live Keith Rivers check: two reviewed Moments, 21 verified evidence records, eight content references, eight season-stat records, one verified external identity and one explicitly linked private Preview Locker portrait. Source and ingestion relationships resolve. Canonical `players.id` remains the Athlete Career ID. Existing athlete → Moment → evidence → signal → opportunity relationships are made inspectable; no new factual relationships or Value Graph transactions were inferred. This remains useful after an athlete leaves an organization and duplicates no DAM/publishing workflow.

## Tests run
- 231 Intelligence and platform-authorization checks pass (17 files), including client and server regressions for performance-only statistics and excluded review actors, plus a real server-render/hydrate theme regression.
- Isolated release TypeScript: pass.
- Full isolated lint: zero errors, 221 existing warnings; scoped Intelligence lint: clean.
- Untouched baseline suite: 802 passed, 11 failed, 24 skipped. The integrated full run: 1,024 passed, 12 failed, 24 skipped; the additional static authorization-helper recognition failure was corrected and rechecked in the passing focused run. The 11 original failures remain in six auth/Locker test files; they reproduce before the overlay and are not concealed as passing.
- First production build: pass (2m 11s). Statistics patch build: pass (1m 43s). Final theme patch build: pass (1m 37s), including compilation, TypeScript and 93 static pages.
- A local test retry disabled Jiti's temporary transpile cache after an `EPERM` cache-file write; all 230 checks then passed. Runtime/deployment settings were unchanged.

## Release safety
Baseline: `dpl_GVu2mt6e6KG5Vk3yjBA7yzBY8PZp`. All 1,014 source files were SHA1-verified against the live deployment. The isolated release adds 67 allowlisted overlay files; dry upload inventory contains 1,077 files and no environment files, Git metadata, dependency folders, raw reports or fictional activation media. Packages, lockfile, auth, proxy and Locker runtime files remain unchanged. The only follow-up file addition is the explicit evidence projection helper.

First published release: `dpl_3L4mrMm8qVFrDoaNXdiurEqrySKB` (`bltz-jlrmm3nzb-daymeiions-projects.vercel.app`). All 1,076 uploaded source SHA1s matched the isolated release before promotion. Statistics patch: `dpl_4vpuxHBXfznUb3dEr85hrStqfrFm` (`bltz-puj6oozbc-daymeiions-projects.vercel.app`), with all 1,077 uploaded source SHA1s and 67 overlays verified before promotion. Candidates build with production settings and remain held without production aliases until verification. Previous deployments are retained for rollback.

Final live deployment: `dpl_FfFEDxZvz5haNpSjDAkuAfsAKjpy` (`bltz-6mk7c1qbe-daymeiions-projects.vercel.app`). All 1,077 uploaded source SHA1s match the scoped release, with 67 approved overlays and no forbidden files. This changes only the workspace theme control and its regression test compared with the statistics patch. Promoted successfully after build and source verification; `bltz.vercel.app` resolves to this READY deployment.

## Manual verification
- Existing authenticated Chrome session: desktop sidebar and mobile navigation both show **Intelligence Lab** and open the protected workspace. No temporary admin access was created.
- Keith: real portrait loads; canonical Career ID and Sportradar identity are displayed in provenance; two Moments, 21 evidence records and eight public content references are present.
- Search: Lorenzo Alexander is found by name; plus adds him without selecting him, duplicate add is disabled, and selecting him shows zero graph records and no qualifying signals rather than invented history.
- Moment inspection uses actual UUIDs. USC event is October 7, 2006; its October 7, 2026 anniversary is explained through the qualifying signal and retrospective opportunity. Article publication, video release, event and fetch dates remain separate.
- Signal and opportunity cards expand with distinct priority/confidence circles and supporting source evidence. Activations remain empty.
- Moment Evidence, Media and Connections folders all measured the same width (1,113 CSS px at the user's wide desktop viewport). No portrait or article is substituted for missing Moment media.
- Both light/dark appearances and 390px mobile layout pass; portrait precedes identity, search remains in the top navigation, folder tabs fit, watchlist opens/closes, and provenance dismisses with Escape. Mobile horizontal overflow is zero.
- Anonymous production requests: Lab page HTTP 307 to Admin Sign In; API HTTP 401 with private/no-store, `nosniff` and `Vary: Cookie`. Node used trusted system certificates, no cookies, manual redirects and no private response-body inspection.
- Existing Dashboard loads emitted React hydration errors before navigation into the Lab. A later fresh Lab load exposed a theme icon mismatch: the server has no stored theme while the first browser render already knows it. The focused fix uses an identical initial icon and enables the control after mount; a real server-render/hydrate regression passes. After promotion, direct Lab reload, mobile reload, theme switches and sidebar navigation emitted **zero new errors or warnings**. Earlier console warnings remain distinguishable from the final check interval.
- Statistics correction verified in production: USC displays 12 total tackles, two pass deflections and one tackle for loss; no review actor, review timestamp or rights metadata appears as a performance measurement. Source fetch time and evidence confidence remain separately inspectable.
- Final theme patch verified in the existing Chrome session. Desktop portrait measures 250×250px; at 390px mobile the portrait loads above the name and horizontal overflow is zero. At 700×900px the workspace correctly measures 836px high beneath the 64px admin header, with zero horizontal overflow. Temporary viewport overrides were reset. The default dark athlete workspace remains open at `/admin/intelligence`.
- Final anonymous checks reconfirmed the live deployment, page 307 and API 401 after the theme patch; see `output/intelligence-career-release/output/final-theme-production-checks.json`.

## Production screenshots
- [Desktop athlete workspace](C:/Users/Administrator/bltz/output/intelligence-career-release/output/production-lab-desktop.png)
- [Moment evidence and signal](C:/Users/Administrator/bltz/output/intelligence-career-release/output/production-lab-moment.png)
- [Mobile athlete workspace](C:/Users/Administrator/bltz/output/intelligence-career-release/output/production-lab-mobile.png)
- [Light appearance](C:/Users/Administrator/bltz/output/intelligence-career-release/output/production-lab-light.png)

## Limitations / deferred work
Watchlist additions are a browser-session research list, not organization membership. Keith has no normalized roster or legacy media/video records; public article/interview/video references remain distinguishable from cleared assets. YouTube release dates, career status/date and missing contacts remain unknown. Production lacks optional legacy asset approval columns, so those previews are withheld. No Moment-media links are inferred from athlete association. Activations display an honest empty state until approved records and measured results exist. Persistent activation editing, Moment media relationships and further ingestion remain separate authorized work.
