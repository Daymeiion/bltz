# Getty meeting views — October 27, 2026

## Summary

The main Getty one-sheet and workflow are now visual maps for a short executive call. Each has about 54 visible words: Getty image sets → Player Lockers → player marketing → buyer interest (Tinybird + QStash events) → agreed licenses / Getty revenue. The four use icons cover editorial, podcast, print on demand, and events/camps/speaking. Two large icon panels show Getty and BLTZ pilot roles; the one-sheet emphasizes the proposed 50-player cohort.

The original overview stays the default and is unchanged. The newer Commercial model remains available as the user's requested backup for pricing/payout questions. Dense briefs, quote placeholders and extended pilot assumptions have been removed from the two primary meeting maps. Pricing, eligibility and detailed terms remain discussion/MOU material.

## Files changed

- `PilotViews.tsx`: document wrapper, protected PDF link and readable mobile alternative.
- `MeetingDiagram.tsx`: shared vector diagram; large icons/labels, connected stages, uses and pilot panels.
- `meeting-content.json`: short labels and screen-reader description.
- `meeting.module.css`: dark/navy/gold presentation styling, larger tabs and container-based mobile stacking.
- `_documents/render_diagrams.mjs`: server-renders the actual React SVG for export.
- `_documents/build_documents.py`: creates two PDFs from that SVG. Requires existing Node dependencies, Python ReportLab/svglib/pypdf and Windows Arial. svglib was installed only in ignored `output/getty-pdf-dependencies`; there is no production dependency change.
- `_documents/getty-one-sheet.pdf`, `_documents/getty-image-workflow.pdf`: matching one-page vector PDFs, 1280 × 790 points.
- `tests/admin/getty-partnership.test.tsx`: current four-tab navigation, compact diagram contents and commercial backup checks. This also fixes the stale three-tab expectation left after PR #22.
- `docs/design-reference/getty-meeting-tabs.md`: current visual wireframe and superseded reference.

All app paths above are relative to `app/admin/getty-partnership/` except the tests/docs paths.

## Routes changed

The existing `/admin/getty-partnership` presentation content is revised. PDF content is updated at the existing `/admin/getty-partnership/download?document=one-sheet` and `document=workflow` URLs. No new route.

## Database changes

None. No graph records, licensing records, payment data or analytics records were created or modified.

## Migrations

None.

## Environment variables

No application environment-variable changes. Optional local `PYTHONPATH=output/getty-pdf-dependencies` locates the PDF-only authoring dependency.

## Permissions

Unchanged. Shared server-side admin layout and independently authorized PDF route remain intact. Sidebar and other dashboards are unchanged. No authentication bypass was introduced.

## Tests and validation

- Full Vitest suite: 236 files passed, 2 skipped; 1,912 tests passed, 24 skipped.
- Production Next webpack build / TypeScript passed.
- Repository ESLint passed after making the offline renderer an ES module compatible with the existing Next lint preset.
- Existing real-PDF download tests cover admin access, anonymous/non-admin denial, allowlisting, private/no-store headers and file signatures.
- Keyboard tab switching, original logos, the compact maps and commercial calculator availability pass the presentation test.
- Build trace includes both private PDFs.
- Both latest PDFs were rendered and visually inspected; one page each with large labels and no clipping or overlapping elements.

## Manual verification and limitations

Computer Use stopped browser interaction because it could not confidently determine the current Chrome URL. No further browser input or alternate browser automation was used. An authenticated live visual check, exact viewport measurements and live PDF-click verification are therefore not claimed for this revision. The mobile alternative is implemented with 20–36px text and stacked stages; it needs a live-device screen check when browser access is available. PDF rendering checks and automated access/navigation/build checks are complete. Deployment evidence will be recorded with the release handoff.

The diagram is a proposal. It does not implement new Tinybird events, QStash delivery, license agreements or payments. Static PDF copies must be regenerated after copy/diagram changes. Both PDFs are vector documents intended for screen review and can be scaled when printed.

## Deferred work

Actual pilot imagery, participants, MOU terms, use-specific quotes, pricing, approvals, revenue participation and production integrations remain subject to separate agreement and implementation. Existing player-quote collection can continue as meeting preparation; quote placeholders are no longer on the main visual maps.

## Product direction

The maps illustrate Getty asset → athlete identity/Locker → discovery/usage → attribution and potential value. No Career, Moment or Value Graph relationships were persisted by this presentation-only change. The persistent athlete relationship remains useful after a team affiliation ends. No mature DAM, social publishing, licensing or payment workflow was rebuilt; no generalized media-management scope was added.

## Removal

All new presentation code and both PDFs remain route-local. Restore the two `PilotViews` documents and their copy/styles to revert this visual revision. To remove the meeting feature entirely, remove its route, the existing sidebar link, the exact-path theme-shell case and the narrow PDF tracing configuration. No data/schema cleanup is required.
