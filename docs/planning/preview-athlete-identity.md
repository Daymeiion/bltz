# Preview athlete identity and Sportradar lookup

## Objective and scope
Use the saved preview identity before asking for athlete search. Resolve `preview_lockers.player_id`, or the existing GTM preview GSIS relationship to `players.gsis_id`. For a master-only preview, require admin review before creating/linking canonical identity. Existing provider review/import remains unchanged.

Product direction follows the supplied AGENTS.md. `docs/product/BLTZ_PRODUCT_DOCTRINE.md` is absent in this checkout. No future-phase graph schema is introduced.

## Summary
The old panel ignored preview identity, searched only `players` and had no request timeout. Live read-only verification found one master-linked preview and zero matching canonical players by GSIS in the configured database. The new panel resolves saved identity, loads saved provider mappings, explains missing mappings, and offers reviewed create/link for master-only previews. Timeouts and retries replace indefinite waiting. Unlinked previews retain explicit canonical search.

## Files changed for this task
- `app/admin/preview-lockers/[id]/edit/SportradarPanel.tsx`: automatic identity resolution, review UI, request timeout and retry.
- `app/admin/preview-lockers/PreviewLockerForm.tsx`: reload notice covers identity updates as well as imports.
- `app/api/admin/sportradar/route.ts`: authenticated identity lookup and reviewed connection action.
- `lib/sportradar/preview-identity.ts`: resolve persisted canonical/GSIS links, return review candidates without guessing identity.
- `supabase/migrations/20260918193313_preview_athlete_identity_review.sql`: atomic reviewed create/link and audit.
- `types/database.generated.ts`: scoped new RPC declaration generated from isolated PostgreSQL signature.
- `tests/sportradar/preview-identity.test.ts`, `tests/sportradar/route.test.ts`, `tests/preview-lockers/form.test.tsx`: regressions.
- `scripts/verify-preview-athlete-identity.mjs`: isolated migration, authorization, identity and audit verification.
- This report.

Existing uncommitted work was preserved.

## Routes, database, migration, environment and permissions
Existing `/admin/preview-lockers/[id]/edit` and `/api/admin/sportradar` extended. No new routes or environment variables.

Migration adds `review_preview_athlete_identity` only. It requires authenticated internal-admin authorization, checks the persisted preview/GSIS relationship, serializes duplicate checks and creation, reuses GSIS matches, requires review of existing name matches, prevents conflicting identity reassignment, and writes an audit record. New identities are private, unclaimed, unverified, and have no user account. No public Locker or provider mapping is created by this step. Existing identity visibility is preserved.

The application requires explicit approval before calling the RPC. The RPC derives the actor from auth.uid(), never a browser actor parameter. Anonymous execution is revoked. Existing stats imports keep their own separate review. No grants or table schemas were changed.

## Validation
- 59 targeted Vitest tests passed across importer, resolver, authorization and builder tests.
- Isolated PGlite migration checks passed: creation, existing identity link, private flags, idempotency, audit creation, stale reference rejection, conflict rollback, anonymous/non-admin denial.
- TypeScript and production build passed; build reports existing CSS warnings.
- Full lint: zero errors, 209 warnings. Scoped changed-file lint passed.
- Full test suite earlier in this task: 720 passed, 24 skipped, 9 failed across auth session rejection, auth recovery, public video mapping and preview media/stats regression. These failures are outside the changed lookup workflow; no clean-baseline comparison was run.
- Read-only hosted lookup verified the missing GSIS-to-canonical relationship; initial Node fetch needed system CA support.

## Manual verification and rollout
Migration and app deployment are pending. No live data mutations, provider API calls, or deployment were performed.
1. Apply the migration through the approved deployment process, then deploy application changes.
2. Open the existing master-linked preview and expand Pull Sportradar stats only.
3. Confirm the displayed master name, school, team, DOB and GSIS. Select a presented existing athlete, or review creation of a private identity when no candidate exists.
4. Check approval and confirm athlete identity. Reload the saved version as prompted because the preview revision changed.
5. Reopen stats. Confirm the athlete loads automatically without searching. A saved provider mapping enables Fetch; otherwise enter the Sportradar UUID.
6. Fetch, review the provider identity and stats, approve import, reload, and check the private preview statistics.
7. Confirm non-admin access is rejected; check narrow/mobile layout and keyboard focus in the authenticated browser.

Browser/mobile manual verification was not performed. The initial raw name lookup still requires the Search BLTZ button for previews without any saved identity link. No automatic fuzzy identity matching is performed. Existing candidate review deliberately prevents creation when an identical-name canonical record exists.

## Product direction and deferred work
Strengthens Player Master -> Athlete Career ID -> Preview relationships and permits persistent athlete stats to use the canonical ID. This remains useful after organizational departure. Moment and Value graphs are unchanged. No DAM/provider workflow was duplicated and no generalized media-management scope was added. Deployment, live reviewed connection/import and browser verification remain pending. Provider-ID discovery from a name is outside this change.
