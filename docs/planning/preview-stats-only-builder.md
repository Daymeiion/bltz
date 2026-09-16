# Private preview builder: stats-only access

## Summary and scope
The saved preview builder now has a Pull Sportradar stats only button directly above Career statistics. It expands the existing authenticated Sportradar importer rather than invoking the discovery scraper. The separate bottom-of-page importer was removed. Newly saved drafts can use the same control.

The existing workflow retains explicit canonical athlete selection, provider ID, cached fetch or quota-consuming refresh, identity review, and approved import. It does not automatically match names. NFL is supported; NCAA remains disabled by the existing cohort restriction. Manual career totals remain separate from imported season statistics.

## Files and routes
- app/admin/preview-lockers/PreviewLockerForm.tsx: stats toggle, pending-operation guard, dirty draft import gate, post-import reload requirement.
- app/admin/preview-lockers/[id]/edit/SportradarPanel.tsx: optional busy/import callbacks and import-disabled guard.
- app/admin/preview-lockers/[id]/edit/page.tsx: remove duplicate importer.
- tests/preview-lockers/form.test.tsx: preservation, saved-preview requirement, and stats-only import regression coverage.
- This report.
Routes: /admin/preview-lockers/[id]/edit and shared new-preview builder after its first save. Existing /api/admin/sportradar reused unchanged.

## Persistence and permissions
No database changes, migrations, new environment variables, or permission changes. Existing admin authorization, request quotas, provider caching, identity approval, import RPC, and audit entries retained. The import RPC updates normalized statistics and athlete linkage without overwriting photos, videos, biography, awards, or manual career totals. Import is disabled with unsaved builder changes. While requests run, builder controls are locked. After import, editing/saving is blocked until explicit reload because the preview revision changed; no automatic draft discard.

## Validation
Production build, TypeScript, scoped ESLint, and whitespace checks passed. Form tests: 15 passed. Existing Sportradar route/service tests: 10 passed, including unauthorized/non-admin rejection and provider request/cache/error handling. The new form flow asserts only preview/import calls to the stats endpoint, biography/manual stats/awards preservation, and reload after import.
No live provider request, production mutation, or browser-admin import was performed. Provider quota, current credentials, and actual returned player coverage therefore remain unverified by this change. Supabase changelog markdown fetch was unavailable; no Supabase API or schema behavior was changed.

## Product direction and limitations
Reuses the existing athlete-to-provider identity and season-stat relationship, improving career accuracy and persistent Locker usefulness after team changes. No new Moment/Value Graph relationships, duplicated provider workflow, or media-management scope expansion. Doctrine file is absent from this checkout; supplied AGENTS product guidance followed.
Production release approved. Isolated from unrelated in-progress college CSV work; no schema changes in this release. A saved preview and existing canonical athlete/provider ID are required; creating missing canonical athletes or enabling NCAA is outside this change.

Release validation: isolated production checkout passed 25 targeted tests, scoped lint, and clean webpack production build with system certificates. Local Turbopack could not follow the shared node_modules junction; Vercel retains the normal build command. Unrelated CFB CSV edits and migration excluded.
