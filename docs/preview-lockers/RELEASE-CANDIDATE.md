# Private Preview Lockers release candidate

Base: `f645f8bd380896409854260c90ed60d993d1a94f` (released Admin/GTM).
Branch: `codex/preview-lockers-release`.
Scope: restore the Admin Preview Player Uploader / Preview Lockers workflow only.

## Recoverable implementation

- `909fb0b`: additive private schema, bounded validation, generated scoped types, local database proof.
- `02e6818`: authorized create/edit, idempotent creation, optimistic edits, request-owned bounded discovery.
- `b7ef789`: Admin list/new/edit, full private Locker/Photos/Film rendering, additive sidebar, focused tests.

The original source, preserved preview prototype, Dante media, previous integration,
released auth/GTM implementation and 27 historical migrations were not rewritten.
No package/lockfile, Next configuration, media binary, environment or hosted setting changes.
No push, merge, deployment, production migration or real-person import performed by this task.

## Restored behavior and boundaries

- Admin list (50-row pages), manual entry, optional discovery suggestions, review gate, durable save, edit/reload and full private presentation.
- Shared Locker and Photos keep their existing public behavior; only the explicit private branch suppresses public analytics, Spotify identity lookup, search/follow actions and synthetic financial/media claims. All preview navigation stays under `/preview-lockers`.
- Photos retain credits/source links and explicit rights-unverified labels. Arbitrary valid preview image hosts bypass the shared optimizer.
- CRUD uses the authenticated session, canonical `is_internal_admin`, column grants and RLS, never service-role CRUD. Existing discovery adapters can use their established service-role roster reads; preview discovery does not write canonical players or onboarding runs.
- Inputs are strict, bounded and unknown-key rejecting. Public HTTPS references only; no server download of operator-supplied media URLs. Nested text/URL checks also run in PostgreSQL.
- Creator/revision/timestamps are trigger-owned. Create retries with the same UUID and semantically equal JSONB return the original record only at revision 1. Slug conflicts do not overwrite records. Edits compare expected revision atomically. Audit insertion and mutation share one transaction; no DELETE grant/handler.
- Discovery is Admin-only POST, same-origin, request-owned stream, at most 40 progress events and 90 seconds, three-minute admission spacing and ten daily starts per Admin. Cancellation stops later pipeline stages; an already-running source can finish under its existing timeout. Terminal output occurs once. No raw source payload/DOB/canonical IDs/auto-confirmed flags are projected.
- Suggestions fill empty fields only. Failed discovery cannot erase a manually entered biography or media. A conflict retains the draft and offers an explicit full-document reload that discards unsaved work.

## Verification

- Full Vitest suite: **532 passed, 24 skipped**, 69 passing files / 2 skipped files. New preview suite: 39 tests.
- Typecheck passes. Error-level repository lint passes; existing warnings remain. New preview files have no lint errors.
- Production build passes with the two pre-existing `@custom-variant` / `@theme` CSS warnings. Build assets embed the LOCAL verifier URL and must never be deployed prebuilt.
- Final 28-migration chain replayed in a second fresh disposable project, `bltz-preview-final-20260831` on 59321/59322; no reset of existing local stacks. All **38 real authenticated database assertions** pass against that untouched final replay.
- Database proof covers nested media insertion without private-schema USAGE, anonymous/ordinary/legacy denial, hidden creator field, immutable audit, audit-failure rollback, revision concurrency, URL/control parity, admission throttling and unchanged canonical/GTM/onboarding tables.
- **42 real HTTP assertions** pass: create, reordered JSONB retry, slug conflict, stale edit, CSRF, invalid/oversized payloads, unsupported delete, private views/no-cache/noindex, and denial for anonymous/ordinary/legacy users.
- Local security advisors flag legacy mutable-search-path and permissive-policy findings; none names a new preview table/function. No unrelated remediation included.
- Coordinator independent browser QA: normal UI login on `localhost:3127`, manual create/review/save, edit/reload persistence, full Locker/Career without earnings/25% claims, Photos credits/private labels, Film namespace/source link and return to GTM.
- Owner browser QA: confirmed mock suggestions preserve manual biography and populate editable photo/video/award fields; reviewed save opens full Locker/Photos. Desktop 1280×720 and mobile 390×844 inspected. Mobile uploader has no horizontal overflow; Tab gives visible focus to the 44px menu button, Enter opens the drawer, Escape closes it and restores visible focus. Photos/Locker showed no console errors. Film playback verified using the existing local `demo-reel.mp4` through a synthetic URL interception (the 28-byte `demo.mp4` is not a playable fixture).

### QA exception — do not omit

At approximately **2026-08-31 16:57:51 UTC**, a browser mock-registration snippet failed,
but a chained click still initiated one real local discovery for **Synthetic Browser Preview**.
The local server reported Wikipedia/ESPN unreachable and YouTube timeout. No real-person
input or hosted database writes occurred. Provider cost is **unknown**, not assumed zero.
The coordinator/user were informed. Subsequent discovery interception was registered
with a dedicated command and independently listed before interaction. The browser
run must not be represented as having made zero provider calls.

## Local review evidence

Use **http://localhost:3127/admin/preview-lockers** for normal sign-in. The existing
Admin login redirects to Next's internal localhost hostname; starting on 127.0.0.1
can create a different cookie domain. No unrelated auth rewrite is included.

Evidence and synthetic credentials are outside Git at `C:/tmp/bltz-preview-20260831/`:
`db-proof.json`, `http-proof.json`, `.playwright-cli/` captures, `fixtures.json` and
`status.json`. Do not publish credentials/session files. Final replay proof is in
`C:/tmp/bltz-preview-final-20260831/db-proof.json`.

Screenshots: desktop Locker `page-2026-08-31T17-00-33-918Z.png`, mobile Locker
`page-2026-08-31T17-00-34-931Z.png`, mobile Photos `page-2026-08-31T17-01-05-368Z.png`,
mobile navigation `page-2026-08-31T17-03-40-591Z.png`, mobile uploader/focus
`page-2026-08-31T17-04-25-762Z.png`, all in the first evidence directory's `.playwright-cli/`.

## Single production migration — coordinator review required

Only `20260831161831_private_preview_lockers.sql` is eligible. The historical public-read
preview migration must never be replayed. Production has 47 historical ledger rows;
the repository has 27 released migration files. **Do not run repository-wide db push,
replay old migrations, or repair/delete/update historical ledger rows.**

1. Run `PRODUCTION-PREFLIGHT.sql` read-only in the explicitly verified BLTZ main Production dashboard.
2. Coordinator observed: table/private rate table/public RPC/version absent, admin guard/audit present, authenticated private USAGE false; history count 47, latest `20260828233000`, ordered-version fingerprint `736e33d43006e7f9cd7d11bad3d98742`. Verify ledger columns are standard `version`, `name`, `statements` (text, text, text[]) and recheck before execution.
3. Generate an exact review packet locally with `node scripts/prepare-preview-deployment.mjs <explicit-outside-repository.sql>`. The generator connects to no database. It embeds the committed migration, locks the ledger, checks the exact baseline, applies only the new DDL and appends one standard new-version ledger row in the same transaction. A final permission/ledger guard precedes COMMIT. Existing 47 rows are untouched. Do not auto-retry a packet if any version/object now exists.
4. Coordinator reviews packet/migration hashes and obtains the release gate before SQL execution or publication. The production-specific guarded packet is **not applied by this task**; the migration body was verified locally, while production history guards require the observed hosted baseline.
5. Migration before application deployment. Confirm target version appears once; history count is 48; fingerprint excluding the new version remains unchanged; RLS enabled, no anonymous column access, no authenticated DELETE, no private-schema USAGE, expected policies/triggers/functions. No production fixture insert or provider test without explicit authorization.
6. Deploy source through normal GitHub/Vercel build with existing production environment, never the local prebuilt `.next`. Admin session, manual preview save/edit/open and denial verification require coordinator authorization in production.

Recovery: an error before COMMIT rolls the entire packet back. After successful migration,
roll back application source if needed and leave additive schema/data/audit intact; forward-fix
under a new reviewed migration. Do not drop data or remove ledger history. Existing rows
are not migrated into this table. No backfill is needed. No environment variables are added.

Deferred: image upload/storage, archive/delete UX, public sharing, recurring product discovery,
Career Graph/rights/payment semantics and broader GTM/auth fixes. This is a private demo tool,
not a new product phase or a canonical athlete creation path.
