# Preview builder disclosures — September 18, 2026

## Summary
School history, pro team history, awards, college CSV import, and manual career statistics now start collapsed. Shared native details/summary controls match the existing media sections, show item counts, support keyboard operation, and preserve mounted draft fields. Manual statistics are labeled as a fallback when Sportradar data cannot be located; this is guidance, not a new restriction on editing existing totals.

Name search, candidate review/profile fetch, cached profile fetch, and provider refresh each show a visible quota indicator. Cached actions say “API quota if uncached”; refresh says “Uses API quota.” Opening the importer and approving stored statistics do not themselves fetch provider data.

## Files and route
- `app/admin/preview-lockers/BuilderSection.tsx`: shared disclosure.
- `app/admin/preview-lockers/PreviewLockerForm.tsx`: optional editor sections.
- `app/admin/preview-lockers/CfbCsvImport.tsx`: collapsed CSV editor.
- `app/admin/preview-lockers/[id]/edit/SportradarPanel.tsx`: quota indicators.
- `tests/preview-lockers/form.test.tsx`: existing workflow selectors updated for the visible labels.

Existing admin preview create/edit routes only. No database, migration, environment-variable, or permission changes. No public Locker changes.

## Validation
35 focused form/import/API tests passed. TypeScript, scoped ESLint, whitespace checks, and local production build passed. Existing repository-wide failures documented in the previous name-lookup report remain outside this UI-only scope. Native disclosures keep form children mounted, avoiding input reset on collapse. Production browser verification follows deployment.

## Product direction and limitations
Improves editing existing athlete career affiliations, awards and statistics; remains useful after the athlete leaves an organization. No new graph relationships or Moment/Value Graph changes, no third-party workflow duplication, and no media-management scope expansion. Quota labels indicate possible provider consumption rather than an exact request count; cache availability determines actual usage. No deferred implementation work.

Release commit: `c040905`. Deployment: https://bltz-cchw8lws3-daymeiions-projects.vercel.app.

Production verification: bltz.vercel.app now serves the release. Authenticated browser confirmed all five requested editor groups start collapsed, manual fallback opens with its fields, Enter toggles the focused summary, and a temporary unsaved value survives close/reopen. The temporary value was cleared without saving; no athlete data was changed. Quota labels verified visually on search, cached profile, and refresh buttons. No additional provider requests were made for UI verification. Dedicated mobile viewport verification was not performed.
