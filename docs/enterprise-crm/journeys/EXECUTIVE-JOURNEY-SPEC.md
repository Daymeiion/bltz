# BLTZ Executive Action Center — Journey Specification

## Purpose and outcome

The Athletic Director / Executive can understand organization status within 30 seconds, identify material attention items, open source context, assign/delegate work, and see the item resolve when the operator completes it.

This first CRM journey proves the shell, scope/RBAC, shared components, cross-module references, assignments, notifications, audit, and source-of-truth refresh. It does not require complete downstream modules.

## Actors

- **Primary:** Athletic Director / Executive with organization-wide or granted team scope.
- **Supporting:** NIL/partnerships operator, media/rights operator, finance approver, organization admin.
- **Negative:** team-limited operator, executive without finance permission, out-of-scope member, unauthenticated user.

## Entry, success, and out of scope

- **Entry:** authenticated executive lands at Home in the authorized default scope, normally All Athletics.
- **Success:** executive delegates a source item; assignee is notified; ownership/audit update; operator completion changes the source; Action Center reflects resolution without manual repair.
- **Out of scope:** full downstream workspaces; scheduled reports; custom theming; top-level Partner workspace; autonomous AI action.

## Required pages and route responsibilities

Use repository route conventions. These conceptual destinations are contracts, not permission to create a parallel router.

### 1. Persistent Enterprise Shell

- BLTZ identity; school logo and organization identity; approved school tokens.
- Left navigation: Home, Athletes, Media, Opportunities, Activations, Intelligence, Analytics, Organization.
- Active state; organization/team switcher; All Athletics/team scope.
- Global search entry; BLTZ Create menu; notifications; profile; role; organization selector; system health; sidebar collapse.
- Route guard, scope re-authorization, loading, error, restricted, responsive, keyboard/focus behavior.

### 2. Executive Action Center / Home

- Header, description, current scope, reporting/date range.
- File-style pill subnavigation: Executive Overview, Athletics, Revenue, Engagement, Performance, Pipeline.
- KPIs: Athletes, Active Opportunities, Active Activations, Revenue YTD; trend, sparkline, delta.
- Executive Attention: count; rights blocker; approval; financial exception; policy/governance row; priority; due date; View All.
- High-Value Opportunities: partner, title, type, stage, potential value, decision date, View Pipeline/All.
- Active Activations: status, owner, participants, rights/blocker, due date, performance cue, View All.
- Member Workload: donut/distribution; high/medium/low/delegated; delegation opportunity/count; View Team; Assign/Delegate.
- BLTZ Intelligence: icon, title, reason, estimated impact, action, View Opportunity/Analysis, explicit AI indicator.

### 3. Source detail surfaces

These may be thin vertical-slice pages or existing canonical pages, but use durable IDs and real authorization.

- **Opportunity Detail:** origin, stage, owner, value, athlete/organization/partner/media, rights, requirements, assigned work, activity, approve, decline, assign, conversion affordance. Full conversion may remain gated to Journey 3.
- **Media/Rights Detail:** asset/provenance, athlete/team, rights state/blocker, reviewer/owner, due date, activity, assign/review.
- **Activation Detail/Summary:** status, owner, participants, partner/media/rights, tasks/deliverables, approvals, due date, activity, assign/delegate.
- **Financial Exception Detail:** minimum authorized context, source, owner, required decision, activity, assign/approve/resolve. Unauthorized roles receive a non-inferable restricted state.
- **Intelligence/Athlete read-through:** signal reason/source/confidence and linked Athlete 360/archive are read-only proof. Create Opportunity is Journey 4 unless already canonical.

### 4. Assignment/Delegation

- Source summary/current owner; eligible organization/team member picker.
- Owner, priority, optional due date/comment.
- Validation, restricted, submit/loading/error/success, unsaved-change protection.
- Durable assignment, notification, audit, updated source owner and Action Center.

### 5. Team workload

- Authorized members, role/team, workload distribution, delegated work, due/priority cues.
- Financial/private data aggregated or redacted unless permitted.
- Assignment entry; no HR/performance-management expansion.

## Reusable component inventory

### Shell/navigation

`AppShell`, `Sidebar`, `NavigationItem`, `ScopeSwitcher`, `GlobalSearch`, `CreateMenu`, `NotificationMenu`, `ProfileMenu`, `SystemHealth`, `PageHeader`, `PillTabs`, `Breadcrumb`, `DateRangeSelector`.

### Summary/data

`KpiCard`, `Sparkline`, `MetricDelta`, `StatusBadge`, `PriorityBadge`, `EntityReference`, `PartnerReference`, `AvatarGroup`, `DataTable`, `DataRow`, `Pagination`, `FilterBar`, `SearchInput`.

### Executive/workflow

`ExecutiveAttentionCard`, `AttentionRow`, `OpportunityRow`, `ActivationSummaryRow`, `MemberWorkload`, `WorkloadLegend`, `AssignmentDrawer`, `MemberPicker`, `TaskRow`, `ApprovalRow`, `ActivityFeed`, `CommentThread`, `NotificationItem`.

### Domain context

`OpportunityStageBadge`, `RightsSummary`, `ParticipantGroup`, `IntelligenceCard`, `ConfidenceScore`, `SourceIndicator`, `RecommendedAction`, `FinancialValue`, `RestrictedFinancialValue`.

### States

`LoadingState`, `Skeleton`, `EmptyState`, `FilteredEmptyState`, `ErrorState`, `PermissionState`, `RestrictedState`, `ProcessingState`, `SuccessState`.

All use canonical tokens, large rounded grouping containers, restrained elevation, file-style pill navigation, and BLTZ-controlled action/semantic treatment.

## Data dependencies

Foundation/DB maps these concepts to existing models before adding anything.

| Data | Minimum contract |
|---|---|
| Organization / school | organization ID, canonical school reference, name/logo, theme mode, safe tokens |
| Team / scope | team ID, organization ID, name/mark, authorized scope, All Athletics eligibility |
| Membership / permission | user/member IDs, role bundles, organization/team scope, status, domain permissions |
| Athlete summary | authorized counts/references; no private fields in aggregates |
| Opportunity | ID/scope, title/type/stage, owner, partner, athlete refs, value visibility, date, rights, activity |
| Activation | ID/scope, title/type/status, owner, participants, rights/blocker, due date, performance cue |
| Media / rights | asset/right IDs, provenance, athlete/team, status, blocker/reviewer, expiry/due date |
| Financial exception | ID/scope, type/status, authorized value/context, owner, due date, source |
| Intelligence signal | ID/scope, category, title, AI meaning, confidence, sources, reason, impact, links, freshness |
| Assignment / task | ID, organization/team, source type/ID, assignee/assigner, priority, due, comment, status, version/timestamps |
| Notification | recipient, safe type, source, read state, timestamp; no restricted content |
| Audit event | actor, organization/team, target, action, timestamp, safe before/after metadata |
| Executive projection | scope/date KPIs, attention, opportunities/activations, workload, intelligence from canonical sources |

### Data behavior

- Authorize every count, chart, search result, and detail for current organization/team scope on the server.
- Action Center is a projection. Source objects own truth; changes invalidate/refetch projections.
- KPI definitions/date windows are explicit. Missing/stale data is labeled; never fabricate values.
- Assignment creation/completion is concurrency-safe; stale versions receive recoverable conflict states.
- Notifications reveal only what the recipient may view at the source.
- Fixtures include rights blocker, approval, financial exception, high-value Opportunity, active Activation, overloaded member, Intelligence recommendation, resolved item, empty scope, and restricted user.

## Permission matrix

`Allow` always means within authorized organization/team scope. Reuse the canonical permission registry.

| Capability | Executive | Team operator | Media/rights | Finance | Org admin |
|---|---:|---:|---:|---:|---:|
| Executive overview | Allow | If scoped/granted | If granted | If granted | If granted |
| Organization-wide scope | If granted | No | If granted | If granted | If granted |
| Opportunity summary/detail | Allow | Scoped | Scoped/read | Financial subset | If granted |
| Approve Opportunity | If granted | If granted | No default | No default | No default |
| Activation summary/detail | Allow | Scoped | Scoped | Financial subset | If granted |
| Rights detail/review | Read/review if granted | Scoped read | Allow | No default | If granted |
| Create assignment | Allow | If granted | Domain-scoped | Domain-scoped | If granted |
| Member workload | Allow | Team/granted | Team/granted | Team/granted | If granted |
| Revenue / financial exception | Explicit finance permission | No default | No | Allow | No default |
| Intelligence | If granted | Scoped/granted | Scoped/granted | Scoped/granted | If granted |
| Change theme | No default | No | No | No | Allow |

Denied users receive safe restricted/not-found behavior per anti-enumeration policy. Client controls mirror permissions but never enforce them alone.

## Canonical end-to-end flow

1. Executive authenticates; role/scopes resolve.
2. Home opens at authorized default scope.
3. Executive reviews KPIs, attention, opportunities, activations, authorized revenue, workload, Intelligence.
4. Selecting attention opens its canonical source.
5. Executive reviews context and chooses Assign/Delegate.
6. Picker shows only eligible members for organization/team/domain.
7. Executive submits owner, priority, optional due date/comment.
8. Server re-authorizes and atomically updates assignment/source, notification, and audit.
9. UI shows success and refreshes Action Center.
10. Assignee opens notification and completes permitted source work.
11. Completion is audited; executive receives update; attention resolves and KPIs update where relevant.

## Cross-module scenarios

- **High-value Opportunity:** Home → detail → athletes/partner/media/rights → assign NIL manager → approve if permitted → conversion affordance. Full conversion is Journey 3.
- **Rights blocker:** Home → Media/Rights → assign Media Director → resolve rights → linked Activation unblocks → executive update.
- **AI alumni read-through:** Home/Intelligence → signal → Athlete 360/archive/cleared media. Create Opportunity remains Journey 4.
- **Financial exception:** authorized executive reviews/assigns/approves and audit clears item. Same executive without finance permission cannot see or infer it.

## End-to-end QA acceptance

### Functional

- Executive lands in correct scope and understands status within 30 seconds.
- Scope/date changes update all modules consistently with visible filters.
- Every attention row opens the correct durable source.
- Assignment filters eligible members, validates, handles conflict, persists after refresh, updates owner, sends exactly one safe notification, and creates one audit event.
- Operator completion updates source truth and resolved Action Center state.
- Direct URL, refresh, back/forward, and deep links preserve authorization/state.

### RBAC/privacy

- Test all personas at API/data and UI layers.
- Team users cannot query, count, search, export, or infer other-team data.
- Financial data never reaches unauthorized payloads, charts, logs, errors, notifications, or screenshots.
- Broad-to-narrow scope changes clear broad cached data immediately.
- Revoked permission applies on the next protected request.

### Integrity/audit

- Organization/team constraints and transitions hold.
- Retry cannot duplicate assignment, notification, approval, or audit.
- Failed atomic mutation leaves no partial state.
- Audit proves actor, target, action, scope, timestamp, and safe metadata for assign, complete, approve/decline, rights resolution, and financial resolution.

### UI/accessibility/responsive

- Match light/neutral modern enterprise direction, large rounded boxes, restrained chrome/elevation, file-style pills, BLTZ actions, and safe school theming.
- Screenshots: overview at standard desktop and narrow desktop/tablet; attention/detail; assignment default/error/success; loading; empty; server error; restricted finance; team scope; school theme; BLTZ Default.
- No page overflow; use approved responsive table/card behavior.
- Happy path is keyboard-operable; focus is visible/restored; pills/menus use correct semantics/keys.
- Accessibility scan has no serious/critical issues; contrast, zoom/reflow, labels, headings, announcements, and reduced motion pass manual review.

### Resilience/performance

- Loading/partial failure never shows false zeroes or stale broad-scope data.
- Failed assignment retries safely with non-sensitive input preserved.
- Empty, filtered-empty, restricted, processing, and error are distinct.
- Use existing performance budgets; if none exist, record baseline and regressions instead of inventing thresholds.

### Regression/gate evidence

- Phase 1/1.5/2 tests pass or unchanged pre-existing failures are documented.
- Unit/component, data/RBAC integration, migration, and Executive E2E suites pass.
- QA reports files/tests, migrations, screenshots, defects, blockers, and PASS/FAIL recommendation.
- No critical/high defect, authorization leak, unexplained error, or unapproved deviation remains.
