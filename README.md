# BLTZ

BLTZ is an Athlete Career Identity Network. The Player Locker presents persistent athlete identity, career history and permitted media; the internal Intelligence Lab inspects supported relationships and evidence. Public players.id remains the canonical Athlete Career ID, separate from authentication identity.

## Current direction

- [Product Doctrine](docs/product/BLTZ_PRODUCT_DOCTRINE.md) is authoritative.
- [Build order](docs/BLTZ_BUILD_ORDER.md) controls phase boundaries.
- [Active build](docs/ACTIVE_BUILD.md) identifies current code and continuation gates.
- [Current design index](docs/design-reference/current-design-index.md) separates retained production UI/UX from concept references.
- [CTO status](docs/intelligence/CTO-STATUS.md) records release boundaries.

Older plans, prototypes and revenue/dashboard tutorials are historical context. They do not authorize future schemas, rights, campaigns, earnings, payouts or an Organization CRM.

## Local development

Preserve the stack: Next.js 16.3.6 App Router, TypeScript, React, Supabase Auth/PostgreSQL/Storage, npm and Vercel. Node must satisfy >=22.12.0 <25.

Install with npm ci. If no .env.local exists, copy the example there and configure the intended non-production project, then run npm run dev. Never overwrite an existing environment file, commit secrets or paste them into a report. See [setup](docs/SETUP.md) for variable names and server-only credentials.

Current surfaces include public /player/[slug], protected /admin, private or explicitly published invite /preview-lockers/[slug], and Admin-only /admin/intelligence. Existing routes and authentication remain shared.

## Validation

Run npm test, node node_modules/typescript/bin/tsc --noEmit --incremental false, npm run lint, npm run build, and npm audit --omit=dev.

For restored preview enrichment, node scripts/verify-preview-enrichment.mjs --check-types executes isolated SQL/RLS/persistence checks and compares additive types. It does not connect to or migrate a hosted database.

## Release boundaries

Authentication/security fixes are live. Measured analytics/review source is preserved separately and disabled. All four analytics/workflow flags in vercel.json are false. Do not enable them by changing only environment values. Hosted staging, migration-history preflight, signed canary and operational recovery checks are still required by the [release plan](docs/intelligence/production-release-plan-2026-10-05.md).

Preview awards/news reconciliation is source work, not proof of remote migration application or a production release. Displayed award evidence remains unverified; discovery and reference illustrations establish no licensing or financial rights.

Pitch-deck source and deliverables are intentionally uncommitted pending review. Dependencies, local evidence, recovery copies and CLI caches stay outside source control. Historical checkouts with unique work require ownership/preservation review before retirement. Never broadly stage recovery data or decks.
