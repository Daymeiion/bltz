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

## Phase 3 — School/Team CRM Shell

- CRM route layout and navigation
- Organization switcher UI using the Phase 2 organization-context primitive
- Team and season filters
- Dashboard shell
- Member access
- Shared table, filter, status, modal, and empty-state components

## Phase 4 — Roster and Athlete Records

- Athlete list, search, and filters
- Athlete detail
- Roster-management UX over the Phase 2 team, season, and athlete-history schema
- Locker and claim status
- Manual creation and CSV import
- Duplicate warnings
- Locker preview

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

## Phase 12 — Revenue Attribution and Financial Review

- Revenue records and sources
- Athlete, organization, rights-holder, and BLTZ allocations
- Status workflows
- Disputes and Admin review
- Append-only adjustment history where practical

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

`Phase 2 — Shared Platform Foundation`.

Phase 1 is complete, with remaining Locker items explicitly deferred. Phase 1.5 is complete. Do not design Phase 5 Media Graph tables during Phase 2. Do not begin the CRM shell until the shared identity, organization, membership, team, season, and event foundation exists.
