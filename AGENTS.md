# BLTZ Enterprise CRM — Agent Operating Contract

## Repository context

This workspace is the local mirror of the ChatGPT project **Blitz**.

- Treat every file under `sources/` as read-only reference material. Do not edit, rename, move, or delete it.
- One project source could not be synced. Do not assume the mirror is complete.
- Phases 1, 1.5, and 2 are complete. Do not rewrite, rename, re-platform, or “clean them up” unless the Coordinator records a blocking incompatibility and the user approves it.
- The next production phase is the Enterprise CRM shell. Work proceeds one canonical user journey at a time.

## Required reading order

Before planning or coding, every agent must read:

1. `AGENTS.md`
2. `docs/enterprise-crm/MASTER-BUILD-ORDER.md`
3. `docs/enterprise-crm/BLTZ-ENTERPRISE-DESIGN-SPEC.md` (or the Coordinator-designated equivalent)
4. The active journey specification; first: `docs/enterprise-crm/journeys/EXECUTIVE-JOURNEY-SPEC.md`
5. Existing schema, migrations, route conventions, tests, and component documentation touching the assigned scope

If the design specification is absent, incomplete, or conflicts with these documents, stop at the planning boundary and report the exact gap. Do not invent a substitute direction.

## Canonical journeys and order

Only one journey may be active for feature implementation at a time:

1. Executive Action Center: oversight → review → assign/delegate → resolve
2. Archive → Athlete → Locker
3. Archive → Opportunity → Activation
4. AI Signal → Alumni Opportunity
5. Athlete-Originated Opportunity
6. Brand → Multi-Athlete Activation

Foundation and shared-component work may precede a journey only when required by `docs/enterprise-crm/MASTER-BUILD-ORDER.md`. Never partially build a later journey “while the files are open.”

## Team topology and ownership

### Coordinator

Owns sequencing, scope, architecture decisions, branch/worktree coordination, dependency resolution, gate sign-off, and integration. Creates bounded packets, assigns file/migration ownership, prevents concurrent edits, records deviations, and integrates only with complete evidence.

### Foundation / Database agent

Owns schema review, additive migrations, seed/fixture contracts, authorization primitives, server data access, audit events, and data-integrity tests. Does not own layout, visual polish, or product flows.

### UI Systems agent

Owns design tokens, theme resolution, accessibility primitives, shell, navigation, shared states, and reusable components. Does not create business rules or substitute client visibility for server authorization.

### Feature / Journey agent

Owns active-journey routes, composition, queries/mutations, adapters, state transitions, and journey tests. Consumes approved components/contracts. Does not add a parallel design system, duplicate entities, or begin a later journey.

### QA agent

Owns independent acceptance, regression, permission-matrix, accessibility, responsive/visual checks, screenshots, defects, and gate recommendation. May improve assigned tests but returns product defects to the owning agent instead of silently redesigning behavior.

## Branches, worktrees, and handoffs

- Every agent uses a separate Git worktree and dedicated `codex/` branch.
- Suggested names: `codex/crm-foundation`, `codex/crm-ui-system`, `codex/journey-executive`, `codex/qa-executive`.
- Never share an uncommitted directory or edit another agent’s worktree.
- Rebase or merge the Coordinator-designated integration base before handoff; never force-push shared branches.
- Each handoff reports scope, files, migrations, tests/results, screenshots with viewport/state, blockers, assumptions, gaps, and next-owner notes.
- Failing required tests, unexplained snapshots, missing migration notes, or hidden TODOs make a handoff incomplete.

## Do-not-improvise rules

Agents must not invent or silently change:

- navigation labels, route hierarchy, journey order, or entity names;
- roles, permission semantics, organization/team scope, or financial visibility;
- database entities/columns when a canonical model can be extended;
- stages, statuses, approvals, rights meanings, or audit behavior;
- action/semantic colors, spacing, radii, density, table behavior, or one-off controls;
- AI confidence, provenance, or detected/inferred/recommended/verified distinctions;
- destructive behavior, integrations, analytics formulas, or production seed data.

Inspect established code and documents first. If no canonical answer exists, submit a decision request with context, options, recommendation, affected files/data, and reversibility. Continue only on unrelated in-scope work.

## UI and design-system rules

- This is modern enterprise CRM, not an enlarged Player Locker: data-led, calm, precise, and suitable for repeated professional use.
- Use a light/neutral workspace, restrained product chrome, generous whitespace, large rounded section containers, thin quiet borders, and restrained elevation. Media may use darker previews but must not dominate operational pages.
- Use file-style pill subnavigation. One shared component supplies active, hover, focus, disabled, overflow, keyboard, and responsive behavior.
- BLTZ controls primary actions (`Create`, `Save`, `Approve`, `Publish`, `Submit`, `Continue`, `Confirm`, `Complete`, `Assign`), destructive actions, warnings, semantic states, typography, spacing, radius, elevation, and interaction behavior.
- School theming is presentation only. It may affect identity, logo, navigation selection, scope accents, non-semantic highlights, team marks, and accessible chart accents—never permissions, workflow, data, semantic status, destructive treatment, or primary-action meaning.
- Resolve school identity from the existing Division I/II logo/color dataset. Do not create another school directory or duplicate brand fields. Authorized admins may select School Theme or BLTZ Default; missing branding falls back safely.
- Use canonical tokens only—no arbitrary page-local colors, spacing, radii, shadows, or z-index values.
- Reuse approved button, input, badge, entity-reference, table, card, drawer, modal, filter, chart, and state families.
- Major surfaces need default, loading, empty, filtered-empty where relevant, error, restricted, disabled, and success/processing states.
- Meet WCAG 2.2 AA: visible focus, keyboard access, semantic names, non-color status cues, contrast, reduced motion, and usable zoom/reflow.
- Align Figma/design and code component names wherever practical.

## Database and RBAC rules

- Existing schema is authoritative. Prefer additive, backward-compatible migrations with rollback/forward-fix notes.
- Every tenant record has an organization boundary. Team records preserve team scope; cross-team access needs explicit permission.
- Enforce authorization server-side for reads, writes, exports, search, counts, aggregates, and jobs. Hidden controls are not authorization.
- Roles are permission bundles, not hard-coded UI conditionals. Use canonical memberships and distinguish organization-wide from team-limited scope.
- Minimum Executive domains: overview read, athlete read, opportunity read/manage/approve, activation read/manage, rights read/review, assignment create/manage, workload read, financial summary/exception read, intelligence read, member read, and theme administer.
- Financial values/exceptions require explicit permission. Users cannot infer restricted data through counts, charts, search, errors, or exports.
- Athlete-private and media/rights constraints remain active even for broad executives.
- Scope changes re-authorize on the server and never reuse stale broader-scope data.
- Assignment, approval/decline, rights decision, conversion, theme change, and financial resolution emit immutable audit events with actor, organization, target, action, timestamp, and safe metadata.
- State transitions are server-validated, concurrency-safe, and idempotent where retryable. Use database constraints for invariants.
- Fixtures are deterministic, non-production, rights-safe, and representative. Never copy private production data into tests.
- Migrations need schema/authorization tests and backfill, deployment-order, compatibility, and recovery notes.

## Journey-by-journey execution

The Coordinator packet defines outcome, actor, entry/exit, routes, components, data contracts, permissions, transitions, audit/analytics events, fixtures, and out-of-scope items.

1. Baseline: verify prior gates and tests/screenshots.
2. Contract: Foundation/DB confirms data and authorization.
3. System: UI Systems builds only missing approved primitives.
4. Vertical slice: Feature implements the smallest complete durable outcome.
5. Hardening: all states, accessibility, responsiveness, observability, audit, and tests.
6. Independent QA: fresh roles and fixtures.
7. Gate: Coordinator accepts evidence and records integration.

Do not start the next journey until criteria pass or a user-approved waiver records owner and expiry.

## QA workflow and gate

QA tests at least an organization executive, team-limited operator, domain operator without financial access, organization admin, and unauthorized/out-of-scope user.

Required evidence: unit/component tests; data/RBAC/audit/transition integration tests; end-to-end happy path plus denial and recovery; screenshots at required widths and for loading/empty/error/restricted; keyboard and accessibility results; migration verification; and affected completed-phase regression results.

A journey passes only with no open critical/high defects, required tests passing, no known authorization leak, design-spec conformance, verified audit events, and a reproducible end-to-end handoff.
