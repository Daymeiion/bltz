# Intelligence Lab production handoff — October 5, 2026

## Published state

The latest approved Intelligence Lab is live at https://bltz.vercel.app/admin/intelligence and accessible from the Admin sidebar.

Current production: `dpl_95pdtfr5Ka2BR9qZHuiS9EGhJ9Hr`, READY. All 67 approved Lab source overlays, including all 41 runtime files, match the final approved release and current local Lab code. No newer unpublished Lab runtime files were found. This newer release also preserves subsequent Locker changes. No redeployment was needed for this closeout.

The final stylesheet includes 12px captions formerly set to 9px, 11px JetBrains Mono, prior 14px descriptions, equal 17px column gaps and the small-screen watchlist spacing fix. The reviewed evidence privacy projection remains intact.

## Source checkpoint for the next task

Local Git branch: `codex/intelligence-production-2026-10-05`. Its source comes from the exact 1,085-file official production inventory, verified byte for byte, plus this handoff and the final typography report. It preserves the published platform rather than reconstructing it from the mixed working checkout. The original checkout, current branch and index were preserved. This is a local checkpoint, not a remote GitHub push.

The exact published-source copy and verification receipts are in `output/intelligence-closeout-2026-10-05`. The product doctrine at `docs/product/BLTZ_PRODUCT_DOCTRINE.md` is restored from that verified published source for the next task.

Future deployments should start from the current production source or this checkpoint. The older `output/intelligence-*-release` folders and pinned packaging helpers are historical artifacts; their contents can predate the latest Locker changes. The application does not depend on the local concept preview server.

## Verification

- Official production inventory: 1,085 verified files; all approved Lab overlays present; no environment files, credentials, dependency folders or build caches included.
- Existing authenticated Chrome: sidebar link, 12px captions, 11px monospace, 17px outer gaps and no desktop horizontal overflow verified after reloading the current production release.
- Anonymous page redirects to the existing Admin login (307). Anonymous API access returns 401 with private/no-store, nosniff and Vary: Cookie.
- Prior final Lab validation remains applicable to unchanged Lab code: 253 core tests across 19 files, TypeScript and production build passed. No new runtime changes were made, so tests/build were not repeated for this verification-only closeout.

## Scope and remaining product work

Files added for closeout are this handoff, local audit/checkpoint artifacts and the restored published Product Doctrine. No routes, database records, schemas, migrations, environment variables, dependencies, permissions or accounts changed. No provider calls were made. Existing migration files in the source snapshot are historical versioned source, not new database operations.

The approved Lab UI release has no pending publication work. Getty access/clearance, broader ingestion, persisted intelligence and activation editing are future product work, not missing parts of this release. The previously documented unrelated mock-video category test failure and inherited Locker lint warnings remain outside this closeout.

This closeout preserves inspection of existing Athlete Career → Moment → evidence → signal → opportunity relationships. It creates no new Career, Moment or Value Graph relationships and duplicates no third-party workflow. The Lab remains useful after an athlete leaves an organization.
