# BLTZ Master Build Order

## Purpose

This file is the **authoritative implementation sequence** for BLTZ. Codex must follow this sequence unless a task explicitly overrides it. Do not begin a later phase until the current phase meets its acceptance criteria or blockers are documented.

`docs/BLTZ_MASTER_BUILD_ORDER_UPDATED.md` is a historical planning artifact. Do not use its phase numbers or Current Priority section for new work. Media Graph architecture decisions live in `docs/media/MEDIA-GRAPH-ROADMAP.md`.

## Phase 0 — Repository Audit and Stable Baseline

- Confirm the app runs locally and the current deployment works.
- Map routes, authentication, Supabase clients, schema, migrations, generated types, storage, components, tests, environment-variable names, and deployment configuration.
- Review the existing Player Locker and identify incomplete, broken, duplicated, placeholder, and unsecured functionality.
- Create a stable Git checkpoint.
- Deliver `docs/current-system-audit.md`.

Exit criteria: the application runs, the audit exists, the Locker gaps are documented, and the repository has a stable checkpoint.

Status: **Completed July 15, 2026.** Local runtime, Supabase-backed Locker loading, tests, type checking, lint, and production build were verified. The stable checkpoint is maintained on `codex/phase-0-baseline`. Vercel reports a successful production deployment but protects route access with SSO; authoritative Supabase type generation also requires authenticated project access. Both external blockers are documented in `docs/current-system-audit.md`.

## Phase 1 — Finish and Stabilize the Existing Player Locker

Review:

- Public Locker route and athlete identity
- Hero media
- Career statistics
- Awards and achievements
- Highlights and game footage
- Interviews and postgame media
- Merchandise placeholders or integrations
- Teammate, alumni, school, and team relationships
- Mobile and desktop responsiveness
- Loading, empty, and error states
- SEO metadata
- Public/private visibility
- Locker claim state
- Athlete edit permissions
- Media provenance
- Supabase data loading
- Authentication and authorization boundaries
- Reusable components and design consistency

Deliver `docs/player-locker-gap-analysis.md` and classify each feature as:

`complete`, `partially_complete`, `not_started`, `broken`, `blocked`, or `out_of_scope`.

Exit criteria: the public Locker loads real data, works on desktop and mobile, renders eligible media, protects private data, includes required states, and passes type checking and production build validation.

Status: **Completed August 18, 2026.** The public Locker loads real data, works on desktop and mobile, renders eligible media, and protects private data. Remaining Locker items in `docs/player-locker-gap-analysis.md` are explicitly deferred and are not Phase 2 blockers.

## Phase 1.5 — Media Graph Architecture Preparation

Documentation-only architecture freeze. Do not add migrations, tables, application routes, UI, packages, storage buckets, provider integrations, or product features.

- Record canonical identifiers and naming decisions.
- Document current media, video, locker, team, school, and authorization conflicts.
- Define future Media Graph boundaries without designing Phase 5 tables.
- Separate legacy `media`/`videos` models from the future graph.
- Separate legacy license eligibility fields from the future rights engine.
- Require a centralized permission resolver for later media work.
- Deliver `docs/media/MEDIA-GRAPH-ROADMAP.md`.

Exit criteria:

- No schema or application code changed.
- Canonical IDs and naming decisions are explicit.
- Legacy media conflicts are documented.
- Phase 2 can proceed without designing Phase 5 tables.
- No provider-specific dependency is introduced.
- This file is the unambiguous authoritative build-order document.

Status: **Completed August 18, 2026.** Architecture decisions are recorded in `docs/media/MEDIA-GRAPH-ROADMAP.md` and the Media Graph guardrails in `AGENTS.md`.

## Phase 2 — Shared Platform Foundation

Follow `docs/media/MEDIA-GRAPH-ROADMAP.md`. Do not design Phase 5 Media Graph tables.
The ordered implementation and verification slices are defined in `docs/platform/PHASE-2-FOUNDATION-PLAN.md`.

- Users and profiles (`auth.users` identity; `profiles` profile data; do not authorize from `profiles.role`)
- Organizations and organization memberships
- Schools remain directory entities; organizations may reference a school
- Existing teams retain their UUIDs and gain organization context
- Seasons, `sports_events`, and normalized athlete-team-season/roster relationships
- Canonical athlete identifier remains `public.players.id`; do not create a second `athletes` table
- `player_lockers` remain at most 1:1 presentation/configuration and do not own media
- Organization roles and platform roles
- Protected route authorization primitives and layouts
- Server organization-context primitive (the CRM switcher UI belongs to Phase 3)
- Server-side authorization
- RLS review
- Audit-log foundation

Status: **Implementation complete locally on August 18, 2026; production promotion deferred.** The four ordered migrations, generated staging types, server organization context, platform authorization cutover, and staging Beta RLS regression proof are complete. Full staging tenant canary evidence, production reconciliation, backup/PITR confirmation, and an approved production change window remain documented release blockers rather than local Phase 3 blockers.

## Phase 3 — School/Team CRM Shell

- CRM route layout and navigation
- Organization switcher UI using the Phase 2 organization-context primitive
- Team and season filters
- Dashboard shell
- Member access
- Shared table, filter, status, modal, and empty-state components
- Discoverable destinations for every approved CRM workstream, including Players,
  Media, Agreements, Rights, Approvals, Campaigns, Attribution, Reports, Messages,
  Revenue, and Settings
- Development-only preview states for later workstreams so navigation and hierarchy
  can be validated without presenting fixture data as live organization data

Status: **In progress.** Phase 3 adds the protected responsive shell, authenticated organization entry and switching, server-supplied team and season filters, complete planned-workspace information architecture, and dashboard loading, empty, error, and access-denied states. Later workflows may appear in the development preview but remain locked in authenticated tenant routes until their server contracts and permissions exist. Roster, media, rights, approval, campaign, intelligence, analytics, revenue, settings, and member-management behavior remain in their scheduled phases.

## Phase 4 — Roster and Athlete Records

- Athlete list, search, and filters
- Athlete detail
- Roster-management UX over the Phase 2 team, season, and athlete-history schema
- Locker and claim status
- Manual creation and CSV import
- Duplicate warnings
- Locker preview
- Player social-source summary and the future Digital Intelligence entry point; live
  scores and recommendations remain unavailable until Phase 11A contracts exist

## Phase 5 — BLTZ Media Graph

Follow `docs/media/MEDIA-GRAPH-ROADMAP.md`. Do not extend legacy `media` or `videos` tables into this graph.

- Canonical media-asset identity, storage locators, and derivatives
- Media library and media detail against the new graph
- Upload or authorized URL workflow
- Media metadata and types
- Many-to-many athlete-media relationships
- Association to Phase 2 organization, team, season, and event records
- Publication status and activity history
- Provider adapters for external media sources

## Phase 6 — Media Rights, Attribution & Clearance Engine

Follow `docs/media/MEDIA-GRAPH-ROADMAP.md`. Do not treat legacy `media.license_*` fields as this engine.

- Rights records and statuses
- Attribution of rights holders and stakeholders
- Clearance, usage restrictions, and expiration dates
- Supporting documents
- Athlete, organization, and rights approvals
- Approval responses
- Publication-blocking rules enforced through `resolveMediaPermissions(asset, usageContext)`
- Audit history

## Phase 7 — Locker Publishing Workflow

Required end-to-end workflow:

1. Organization selects an asset.
2. Organization associates athletes.
3. Rights are recorded.
4. Required approvals are requested.
5. Athlete responds.
6. Eligible content is published.
7. Content appears in the correct Locker.
8. Provenance is displayed.
9. Content can be unpublished.

Do not begin campaigns or advanced analytics until this workflow works.

## Phase 8 — BLTZ Admin Foundation

- Platform Admin roles and protected routes
- Admin navigation and dashboard
- Organization review
- User review
- Locker claim review
- Identity conflict queue
- Audit viewer

## Phase 9 — Rights Exceptions, Takedowns, and Trust & Safety

- Rights cases
- Temporary restrictions
- Takedown requests
- Evidence and internal notes
- Trust and safety cases
- Account and content enforcement
- Escalation workflows

## Phase 10 — Campaigns

- Sponsor and campaign records
- Athlete and media selection
- Deliverables and dates
- Approval and status workflows
- Publishing destinations
- Reporting shell

## Phase 11 — Analytics

Initial metrics:

- Qualified views
- Unique viewers
- Total watch time
- Average watch duration
- Completion and rewatch rates
- Shares and Locker visits
- Sponsor clicks and commerce conversions
- Direct revenue
- Estimated media value
- Network lift

Direct revenue and estimated media value must remain separate.

## Phase 11A — Digital Presence Intelligence and Organization Reporting

This workstream is intentionally visible in the CRM information architecture before
its production implementation. Preview values must remain labelled fixture data; live
tenant routes show `Not scanned` until the contracts below exist.

- Verified official-source and social-profile inventory
- Reproducible scan snapshots and review status
- Explainable, versioned Digital Presence Score and category scores
- Confidence and coverage calculation
- Evidence-linked recommendations with assignment and dismissal state
- Historical score and source-change tracking
- Athlete and roster-level intelligence reports
- Server-generated PDF reports with immutable snapshot, methodology, audit, storage,
  and authorization metadata

Every percentage must identify its scale or denominator and selected time window.
Measured observations, modeled estimates, and BLTZ recommendations remain visibly
separate. No unsupported reach, visibility, valuation, or revenue claim may be shown.

## Phase 12 — Revenue Attribution and Financial Review

- Revenue records and sources
- Athlete, organization, rights-holder, and BLTZ allocations
- Status workflows
- Disputes and Admin review
- Append-only adjustment history where practical
- Financial document and invoice-PDF support only after an authoritative invoice,
  line-item, currency, payment-status, versioning, and authorization contract is approved

Automated invoicing remains deferred in the current School/Team CRM PRD. Its CRM
destination may be previewed in Phase 3, but no production invoice generation is
authorized by this phase entry alone.

## Phase 13 — Production Hardening

- Security and RLS review
- Upload validation and rate limiting
- Error and job monitoring
- Performance and accessibility review
- Data retention, backup, and recovery
- Production validation
- Deployment and rollback procedures

## Task Execution Rules

For every task:

1. Reference the relevant PRD section.
2. State included and excluded scope.
3. Inspect existing code first.
4. Reuse existing components.
5. Identify migrations before coding.
6. Do not edit unrelated files.
7. Run lint, type checks, tests, and build validation where available.
8. Report changed files, database changes, tests, limitations, and manual verification steps.
9. Do not claim completion when acceptance criteria are unmet.

## Current Priority

`Phase 3 — School/Team CRM Shell`.

Phase 1 and Phase 1.5 are complete. Phase 2 is implemented locally with production
promotion deferred behind its documented release gates. Continue Phase 3 without
designing Phase 5 Media Graph tables or presenting later-phase preview fixtures as
live organization data.
