# Getty meeting views — October 23, 2026

## Summary and scope

The admin Getty meeting page now has Original overview (default), Visual one-sheet and Image workflow tabs. The original presentation was moved verbatim into a route-local component. The two new views have matching one-page landscape PDFs, downloaded through an independently authorized route.

The three proposed cases are print on demand, a player podcast video episode and a player documentary. Each names a potential buyer, Getty revenue mechanism and approval requirements. The proposed 50-player pilot allows up to three approved stills per player, capped at 150 unique images; duration, budget and success targets remain open. Two blank quote spaces are reserved for actual player interviews and permission to quote.

## Files and routes

- `app/admin/getty-partnership/page.tsx`: server composition and metadata.
- `OriginalOverview.tsx`: unchanged original chart, including both logos.
- `MeetingViews.tsx`: existing accessible Radix tabs; only the switcher requires client JavaScript.
- `PilotViews.tsx`, `meeting-content.json`, `meeting.module.css`: the two responsive document views and shared copy.
- `_documents/`: two private PDFs and the reproducible ReportLab generator. It reads the same JSON as the page; requires Python, ReportLab, pypdf and Windows Arial fonts.
- `download/route.ts`: allowlisted document downloads, checked with `getCurrentAuthorizationProfile` before file access; private/no-store responses.
- `next.config.ts`: narrow PDF file-tracing inclusion for that download route.
- `tests/admin/getty-partnership.test.tsx`, `getty-download.test.ts`: tab interaction, original contents, admin/non-admin/anonymous behavior, allowlist and actual bundled PDF responses.
- `docs/design-reference/getty-meeting-tabs.md`: page intent and layout reference.

Routes: existing `/admin/getty-partnership`; new `/admin/getty-partnership/download?document=one-sheet` or `document=workflow`.

## Data, permissions and boundaries

No database changes, migrations, environment variables, dependencies or permission changes. The page retains the shared admin layout. The download handler repeats authorization because route handlers do not inherit layout protection. PDFs are outside `public/`; no public PDF URL is introduced. No sensitive write occurs, so no new audit event is needed.

No licensing workflow, analytics collection, payments, automatic revenue allocation, quote editing or media processing was implemented. Proposed player shares, royalties and referral fees are subject to agreement. Attribution is distinct from payment rights. Views and exposure are distinct from license revenue.

## Validation

- Full Vitest run: 236 files passed, 2 skipped; 1,912 tests passed, 24 skipped.
- Repository ESLint check passed (quiet errors-only mode).
- Production Next webpack build and TypeScript passed; generated route traces include both PDFs.
- Original component compared to main: verbatim apart from component name and relocated metadata.
- PDF generator confirmed one page each and all three use cases; both rendered to PNG and visually reviewed.
- Local visual fixtures verified desktop and approximately 375 CSS-pixel layouts with no horizontal overflow. Live authenticated tab, navigation and download verification follows deployment.

Existing suite emits its known disabled YouTube iframe-loading diagnostic; all tests passed. Existing Vite config-loader notice remains unchanged.

## Product direction

This is presentation material describing career identity → moment → licensed use → attribution and value. It does not create graph records. Career, Moment and Value Graph relationships are illustrated, not newly persisted. The concept remains useful after an athlete leaves an organization. No mature third-party DAM, publishing, licensing, payment or production workflow was duplicated; no generalized media-management scope was added.

## Known limitations and deferred work

Actual player quotes, participating players, buyer commitments, Getty approvals, image eligibility, pricing, pilot timing/budget and numerical success targets remain to be gathered or agreed. Quote spaces are presentation placeholders, not editable/persisted fields. PDF downloads are static generated documents, so copy changes require rerunning the generator and committing both PDFs.

## Removal

To remove just the new material, restore `page.tsx` to render `OriginalOverview`, delete the other route-local new files and download handler, remove the single `outputFileTracingIncludes` entry and update the tests. To remove the entire meeting page, also remove its existing sidebar link and exact-path theme-shell case. No schema or data cleanup is required. Keep any previously distributed PDFs as separate meeting artifacts as needed.
