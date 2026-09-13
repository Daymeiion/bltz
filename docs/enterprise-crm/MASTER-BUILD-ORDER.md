# BLTZ Enterprise CRM — Master Build Order

## Status and scope

Phases 1, 1.5, and 2 are complete and protected. This plan starts with Enterprise CRM and does not authorize unrelated rewrites. Build one complete journey, pass its gate, then begin the next. Pull shared work forward only when required by the next approved journey.

## Phase 3A — CRM foundation confirmation

### Deliverables

- Inventory routes, schema, migrations, auth/RBAC, tests, theme data, and UI primitives.
- Map canonical objects: Organization, Team, Membership/Role, Athlete, Locker, Media Asset, Rights, Partner, Opportunity, Activation, Assignment/Task, Notification, Intelligence Signal, Revenue/Financial Exception, Audit Event.
- Confirm organization/team scope propagation and the Division I/II identity source; do not duplicate branding.
- Define deterministic Executive fixtures and minimum additive migrations.

### Gate 3A

- No duplicate entity or branding model.
- Data ownership, boundaries, permission matrix, and enforcement points are documented.
- Migration deploy order, backfill, compatibility, and recovery notes are reviewed.
- Existing test baseline is green or pre-existing failures are documented.

## Phase 3B — Enterprise shell

### Deliverables

- BLTZ and organization identity.
- Navigation: Home, Athletes, Media, Opportunities, Activations, Intelligence, Analytics, Organization.
- Active state; organization/team switcher; All Athletics and team scope.
- Global search entry, BLTZ Create menu, notifications, profile, role, organization selector, system health, sidebar collapse.
- Server route guards and scope-aware data boundary.
- School theme resolution and BLTZ Default fallback.
- Loading, error, restricted, responsive, keyboard, and focus behavior.

### Gate 3B

- Shell works at required desktop/responsive widths without page-specific forks.
- Scope changes re-authorize data and never reveal broader cached data.
- Navigation/utilities respect permissions.
- Theming passes contrast and cannot alter semantic/primary actions.
- Keyboard, focus order, and WCAG 2.2 AA checks pass.

## Phase 3C — Core component library

### Deliverables

- Foundations: tokens, typography, spacing, radii, borders, restrained elevation, density, focus, motion.
- Navigation: `PageHeader`, `PillTabs`, `Breadcrumb`, `DateRangeSelector`, `FilterBar`, `SearchInput`.
- Data: `KpiCard`, `Sparkline`, `StatusBadge`, `PriorityBadge`, `DataTable`, `Pagination`, `EntityReference`, `AvatarGroup`.
- Workflow: `ExecutiveAttentionCard`, rows, `AssignmentDrawer`, member picker, `MemberWorkload`, `ActivityFeed`.
- Domain: `OpportunityRow`, stage badge, partner reference, activation summary, `RightsSummary`.
- Intelligence: recommendation, confidence/source, recommended action.
- States: loading, first-time empty, filtered empty, error, restricted, processing, success.

### Gate 3C

- Shared components have stable contracts and representative states.
- No duplicate primitives or page-local token systems.
- Component, interaction, accessibility, and visual-regression tests pass.
- Executive pages compose without new foundational patterns.

## Phase 4 — Journey 1: Executive Action Center

Use `docs/enterprise-crm/journeys/EXECUTIVE-JOURNEY-SPEC.md` as the controlling specification.

### Vertical slices

1. Role-aware All Athletics landing, KPIs, pill subnavigation, date/scope.
2. Attention, opportunities, activations, authorized revenue, workload, intelligence.
3. Open source object, review context, assign owner/priority/due date/comment, notify, audit.
4. Operator completion updates source; Action Center resolves and reports material update.
5. Proofs: high-value opportunity, rights blocker, AI alumni read-through, financial exception.

### Gate 4

- Executive understands state and urgent action within 30 seconds.
- Delegation is durable, permission-checked, notified, and audited.
- Restricted financial and athlete/media data do not leak.
- Action Center reflects source truth after mutation and refresh.
- Journey-spec E2E, accessibility, responsive, visual, and regression criteria pass.

## Phase 5 — Journey 2: Archive → Athlete → Locker

### Outcome and scope

An operator locates an archive asset, confirms identity/rights, links the canonical Athlete 360 record, and adds/publishes it to the correct Locker without duplicate athletes/media. Build archive search/detail, match/link review with ambiguity handling, rights/visibility gate, Athlete 360 media/Locker summary, and publish processing/success/failure/repair.

### Gate 5

- Duplicate prevention and ambiguous-match recovery pass.
- Restricted media cannot reach Locker.
- Organization/team/private-athlete boundaries pass.
- Provenance and publishing are audited.
- Executive and completed phases regress cleanly.

## Phase 6 — Journey 3: Archive → Opportunity → Activation

### Outcome and scope

An archive asset/collection becomes a reviewed Opportunity and, after approval, a durable Activation retaining media, rights, partner, athlete/team, owner, and audit context. Build create-from-archive, Opportunity detail/stages/ownership/value/date/context, blocker handling, idempotent conversion, and Activation detail for participants, deliverables, approvals, distribution, and approved performance/revenue fields.

### Gate 6

- Source context survives both creations.
- Invalid/duplicate conversion is prevented.
- Rights blockers stop and resolve predictably.
- Permissions, notifications, audit, and transitions pass.
- Journeys 1–2 regress cleanly.

## Phase 7 — Journey 4: AI Signal → Alumni Opportunity

### Outcome and scope

An explainable alumni signal leads an authorized user through Athlete 360 and archive/rights context to a human-reviewed Opportunity. Build signal detail with category, confidence, sources, reasons, freshness, detected/inferred/recommended labels; linked alumni/archive context; save/dismiss; and confirmed create/assign.

### Gate 7

- Provenance, confidence, freshness, uncertainty, and AI-versus-verified meaning are visible.
- Human confirmation is required.
- Stale, duplicate, out-of-scope, and low-confidence states pass.
- Journeys 1–3 regress cleanly.

## Phase 8 — Journey 5: Athlete-Originated Opportunity

### Outcome and scope

An athlete-authorized request becomes an internal Opportunity without enterprise access or exposure of internal notes, finance, or other athletes. Build consent/privacy intake, triage, dedupe, ownership, communication/status, review decisions, safe athlete updates, and origin/consent audit.

### Gate 8

- Athlete and enterprise permission surfaces remain separated.
- Consent, privacy, notifications, and internal-note isolation pass.
- Duplicate/replay is idempotent.
- Journeys 1–4 regress cleanly.

## Phase 9 — Journey 6: Brand → Multi-Athlete Activation

### Outcome and scope

An authorized user starts from a durable contextual Partner, creates an Opportunity across organization/team/athlete scopes, selects eligible athletes, clears rights/approvals, and creates one coordinated Activation. Build contextual Partner history (no top-level Partners nav), organization-capable Opportunity, multi-athlete selection with per-athlete eligibility/consent/rights, partial blockers, and coordinated participants/owners/deliverables/approvals/audit.

### Gate 9

- Partner is durable and not athlete-dependent.
- Cross-team permission checks occur per participant.
- One athlete’s restriction cannot leak private context or silently invalidate others.
- Partial blockers and idempotent creation pass.
- All six journeys and completed phases pass regression.

## Release rule after every gate

The Coordinator records the integrated commit, migrations, feature-flag/release state, tests, screenshots, limitations, and next prerequisites. A failed gate returns work to its owner; it never authorizes skipping ahead.
