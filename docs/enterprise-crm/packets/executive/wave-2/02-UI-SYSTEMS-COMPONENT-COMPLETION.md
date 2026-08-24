# Executive Journey Wave 2 — UI Systems Component Completion Packet

**Branch:** `codex/crm-ui-system-executive-wave2`  
**Worktree:** `C:\Users\Administrator\bltz-worktrees\crm-ui-system-executive-wave2`  
**Start from:** immutable tag `crm-executive-wave2-base`; verify the commit from the Coordinator handoff

## Outcome

Complete the Master Build Order Gate 3C shared inventory so Feature/Journey composition does not introduce foundational patterns. Build typed, reusable presentation and interaction contracts only; do not implement business mutations, server permissions, or production values.

Read all governing documents, the Wave 1 gate report, Decisions 0001–0002, existing Wave 1 components/tests, and current generic UI primitives before acting.

## Required inventory

### Navigation and data

- `Breadcrumb`, `FilterBar`, `SearchInput`
- `Sparkline`, standalone `MetricDelta`, `DataTable`, `Pagination`, `AvatarGroup`

### Workflow

- `AssignmentDrawer`, `MemberPicker`, `WorkloadLegend`
- `TaskRow`, `ApprovalRow`, `ActivityFeed`, `CommentThread`, `NotificationItem`

### Domain

- `OpportunityRow`, `OpportunityStageBadge`, `PartnerReference`
- `ActivationSummaryRow`, `RightsSummary`, `ParticipantGroup`

### Intelligence

- `IntelligenceCard`, `ConfidenceScore`, `SourceIndicator`, `RecommendedAction`

Use existing Wave 1 components instead of duplicating them. Align exports and names to the controlling design/journey inventory.

## Required behavior

- Typed contracts contain no invented business stages/statuses. Domain state props use approved generic semantic variants or caller-supplied labels.
- `AssignmentDrawer` includes source summary, eligible-member input contract, priority input without inventing persisted vocabulary, optional due/comment, validation, loading/error/success, unsaved-change protection, focus trap/return, and full-width mobile behavior. Submission is a caller callback only.
- Tables/lists support approved responsive behavior and default/loading/empty/filtered-empty/error/restricted states.
- Intelligence components visibly distinguish detected, inferred, recommended, and verified; show provenance, confidence/coverage, freshness, reasoning, and human-controlled action.
- Financial/private examples are labelled fictional and use restricted variants.
- All styling uses CRM tokens; no page-local colors/radii/shadows/z-index.
- WCAG 2.2 AA semantics, keyboard behavior, focus, reflow, reduced motion, and non-color cues are tested.

## Exclusive ownership

- `components/enterprise-crm/**`
- `tests/enterprise-crm/ui/**`
- `output/enterprise-crm/ui-system-wave2/**`
- `app/globals.css` only for CRM component selectors/tokens
- `components/organization/preview/ExecutiveSystemPreview.tsx` only for clearly labelled component evidence

Do not edit `components/organization/OrganizationShell.tsx` or `OrganizationTheme.tsx` while Foundation Stage A runs. Do not edit `lib/**`, migrations, routes, feature pages, package/lock/config, or generic `components/ui/**` without Coordinator reassignment.

## Tests and evidence

- Component contract and state tests for every export.
- Keyboard tests for drawer, member picker, table controls, pagination, filters, search, activity/comments, and intelligence actions.
- Focus entry/trap/return and unsaved-change tests for `AssignmentDrawer`.
- Semantic assertions for tables/lists/status/provenance/confidence; automated accessibility evidence using existing dependencies, plus manual results. Do not add a dependency without approval.
- Responsive screenshots at 375, 768, 1024, and 1440 for the component board, AssignmentDrawer, table/list adaptation, intelligence provenance, default/loading/error/restricted/success states, BLTZ Default, School Theme, and visible focus.
- Typecheck, exact owned-path lint, targeted tests, protected organization regressions, full tests, and production build.

## Handoff

Report worktree/branch/base/head, component exports and contracts, files, migrations `none`, exact tests, screenshot path/viewport/state/theme labels, blockers, assumptions, and precise Feature usage notes.

