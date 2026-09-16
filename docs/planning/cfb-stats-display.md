# CFB season statistics display

## Objective and scope
Expose the existing college football season table before connecting NCAA API requests. The existing `StructuredStats` component supports NCAA data but the Career tab previously mounted it only when structured data existed. Reuse its stored-data rendering and totals logic. API integration and stats editing are deferred.

## Page intent
Primary user: authorized private-preview viewer or public Locker visitor.
Primary action: expand College Football in the Career statistics view.
Critical information: season/team statistics, games played/started, source and available coverage.
Mobile priority: horizontally scroll the populated table within the section.
Known exclusions: API requests, imports, manual edits, identity changes.

Hierarchy: Career tab -> team history -> collapsed College Football section -> saved season table or honest empty state. Existing career summary cards remain available when structured records are absent.

## Completion report
- Summary: College Football is always discoverable, collapsed initially, with game-log-style surfaces and a native keyboard-accessible disclosure. Existing NCAA rows render inside it when present. NFL rendering is preserved outside it.
- Files changed: `components/player/StructuredStats.tsx`, `app/player/[slug]/LockerView.tsx`, `tests/sportradar/render.test.tsx`, and this note. Other working-tree changes predated this task.
- Routes affected: existing `/preview-lockers/[slug]` and `/player/[slug]` through their shared view; no new routes.
- Database, migrations, environment variables, permissions: unchanged.
- Tests: stats rendering and normalization pass. Full suite: 697 passed, 24 skipped, 9 failed in four files (admin session rejection, auth recovery, public video categories, preview media/stats fixture identity). The latter two failures also reproduced in a focused run; neither concerns the new table. Lint: zero errors, 209 warnings. Production build passed with existing CSS at-rule warnings. TypeScript passed.
- Manual verification: signed-in browser and mobile visual checks have not been performed. Open a private Locker, select Career, expand College Football, and verify the empty state or saved season data. Check keyboard disclosure and narrow-screen table scrolling.
- Limitations: no new college data is added; the empty state intentionally contains no invented values. The existing data reader still determines which saved records are available.
- Deferred: NCAA access and import setup, dedicated manual season-stat editor, deployment, authenticated visual verification.
- Product direction: exposes existing career-stat history attached to canonical athlete identity; creates no new graph relationships. Useful beyond organizational departure. No Moment/Value Graph changes, duplicated third-party workflow, or media-management scope drift.
