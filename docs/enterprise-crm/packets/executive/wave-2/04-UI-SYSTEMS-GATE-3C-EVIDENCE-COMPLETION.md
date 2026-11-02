# Executive Wave 2 — Gate 3C Evidence Completion Packet

**Owner:** UI Systems agent, with QA-style independent evidence discipline  
**Start commit:** `966507f71b3b9d923379f8c4df3907661e294e67`  
**Launch tag:** `crm-executive-wave2-gate3c-evidence-base` (verify against the Coordinator handoff)  
**Suggested branch:** `codex/crm-ui-system-executive-gate3c-evidence`  
**Suggested worktree:** `C:\Users\Administrator\bltz-worktrees\crm-ui-system-executive-gate3c-evidence`

## Outcome

Close only the five evidence gaps recorded in `GATE-3B-3C-REPORT.md` so the Coordinator can re-run Gate 3C. This is an evidence/test completion pass, not a component expansion, visual redesign, Feature/Journey implementation, or shell/RBAC task.

Read completely, in the required order: `AGENTS.md`, `MASTER-BUILD-ORDER.md`, `BLTZ-ENTERPRISE-DESIGN-SPEC.md`, `EXECUTIVE-JOURNEY-SPEC.md`, Wave 2 packets 02–03, the Wave 2 gate report, then every existing Enterprise CRM component/test/evidence file touched by this packet.

## Hard boundary

Do not change product behavior, business rules, routes, server code, schema, migrations, database types, RBAC contracts, permission keys, school-theme resolution, production shell wiring, entity/status/stage vocabulary, packages, lockfiles, generic UI primitives, or completed phases.

Do not add a component. If a new test exposes a real defect in an existing Enterprise CRM component, stop and record the failing test, reproduction, severity, proposed minimal fix, and exact file. A repair may proceed only inside the conditional UI allowlist below and must not alter the public contract except to satisfy its documented behavior. Visual preference is not a defect.

## Authorized paths

### Primary evidence allowlist

- `tests/enterprise-crm/ui/**`
- `output/enterprise-crm/ui-system-wave2/gate-3c-evidence/**`
- `docs/enterprise-crm/evidence/executive/wave-2/GATE-3C-ACCESSIBILITY-REPORT.md`
- `components/organization/preview/ExecutiveSystemPreview.tsx` only to expose already-existing components and fictional states for isolated evidence; no product route, business behavior, or new vocabulary

### Conditional defect-fix allowlist

Use only when a new test first proves a true defect and the handoff identifies test-before/fix-after commits:

- `components/enterprise-crm/**`
- CRM-scoped selectors/tokens in `app/globals.css`

All `app/**` except the single preview file above, `lib/**`, `supabase/**`, `types/**`, generic `components/ui/**`, organization shell/theme files, configuration, dependencies, and all later-journey paths are forbidden.

## Required component test matrix

Create focused tests, not one assertion-light smoke test. Every required export must have its contract, semantics, caller callbacks/disabled behavior where applicable, and non-color labelling asserted.

### Navigation and data

- `Breadcrumb`: ordered hierarchy, link/current-page semantics, long-label behavior.
- `FilterBar`: label, active count, result announcement, reset callback, zero-active behavior.
- `SearchInput`: labelled search, controlled input, clear, disabled, count announcement, keyboard activation.
- `Sparkline`: finite/empty/single/multiple input, accessible title/description, no fabricated value.
- `MetricDelta`: up/down/flat plus neutral/positive/negative semantics without color-only meaning.
- `AvatarGroup`: visible/remainder/empty/max-zero cases and complete accessible member label.
- `DataTable`: default and sortable direction toggling; loading; empty; filtered-empty/reset; error/retry; restricted/non-inference; row actions; alignment; zero rows; responsive semantics.
- `Pagination`: first/middle/last, invalid page/count normalization, disabled, Previous/Next callbacks and keyboard activation.

### Workflow

- `MemberPicker`, `WorkloadLegend`, `TaskRow`, `ApprovalRow`, `ActivityFeed`, `CommentThread`, and `NotificationItem`: labelled structures, empty/populated cases, disabled/action callbacks, timestamps/status/priority/unread non-color cues, and keyboard-native interaction.
- `AssignmentDrawer`: default, validation, submitting, error/retry-ready, success, restricted, unsaved protection, source context, optional fields, caller-only submit, and no authorization claim.

### Domain and intelligence

- `OpportunityRow`, `OpportunityStageBadge`, `PartnerReference`, `ActivationSummaryRow`, `RightsSummary`, and `ParticipantGroup`: caller-supplied labels, optional fields/actions, blocked/restricted semantics, empty participants, keyboard-native actions, and no fixed business vocabulary.
- `IntelligenceCard`: detected, inferred, recommended, verified, stale, and restricted/non-inference states.
- `ConfidenceScore`: lower/upper clamp, coverage, progress semantics.
- `SourceIndicator`: labelled source, optional detail/freshness, link/non-link semantics.
- `RecommendedAction`: enabled/disabled, callback, visible human-control context, keyboard activation.

## Keyboard and focus acceptance

Automated component tests must cover Enter/Space activation as appropriate, native input/select/textarea use, table sorting, filter reset/search clear, pagination, comments, row/domain actions, and intelligence actions.

Provide a separate real-browser focus record for `AssignmentDrawer`:

1. focus starts on the opening trigger;
2. opening moves focus to the first eligible owner field;
3. repeated Tab stays within the drawer and wraps last-to-first;
4. Shift+Tab wraps first-to-last;
5. Escape/close with a dirty draft exposes unsaved protection without losing the draft;
6. Keep editing returns focus to an appropriate drawer control;
7. Discard closes and returns focus to the exact opening trigger;
8. submitting disables mutation controls without trapping focus on a removed element;
9. success and restricted states preserve a deterministic close path and return focus.

Record browser, viewport, input method, observed focus order, PASS/FAIL, and screenshot name. A JSDOM `role=dialog` assertion alone is not Tab-cycle evidence.

## Accessibility, reflow, and reduced-motion report

Create `docs/enterprise-crm/evidence/executive/wave-2/GATE-3C-ACCESSIBILITY-REPORT.md` containing:

- tool/browser/version and whether an existing automated scanner is available; do not add a dependency;
- automated findings or an explicit `not available` plus the expanded semantic assertions used instead;
- manual headings/landmarks/names/roles/value/status-live-region/table/list/form/error review;
- keyboard order, focus visibility, drawer trap/return, and no keyboard dead end;
- contrast review for BLTZ Default and School Theme, with status never communicated by color alone;
- 200% zoom and 320-CSS-pixel reflow results with no two-dimensional page scrolling (data-table region may use its documented local behavior only);
- text resizing, long labels, error text, filtered-empty, restricted/non-inference, and touch-target review;
- `prefers-reduced-motion: reduce` verification for drawer/overlay/state transitions, including the computed outcome or recording method;
- defects with severity/owner or an explicit no-open-defects statement.

Do not claim WCAG conformance from screenshots alone.

## Required isolated screenshots

Save lossless PNGs under `output/enterprise-crm/ui-system-wave2/gate-3c-evidence/`. Each image must show its state name in visible fictional preview copy and the handoff must state CSS viewport, captured bitmap dimensions, theme, keyboard/focus state, and browser zoom.

### Navigation/data

- `navigation-filters-search-default-1440-bltz.png`
- `navigation-filters-search-long-labels-375-bltz.png`
- `data-table-default-focus-1440-bltz.png`
- `data-table-loading-768-bltz.png`
- `data-table-empty-375-bltz.png`
- `data-table-filtered-empty-375-bltz.png`
- `data-table-error-768-bltz.png`
- `data-table-restricted-1440-bltz.png`
- `data-table-responsive-actions-375-bltz.png`

### Workflow/drawer

- `workflow-lists-actions-focus-1440-bltz.png`
- `workflow-lists-responsive-375-bltz.png`
- `assignment-drawer-tab-wrap-1440-bltz.png`
- `assignment-drawer-shift-tab-wrap-375-bltz.png`
- `assignment-drawer-unsaved-focus-375-bltz.png`
- `assignment-drawer-submitting-1440-bltz.png`
- `assignment-drawer-error-1440-bltz.png`
- `assignment-drawer-success-1440-bltz.png`
- `assignment-drawer-restricted-375-bltz.png`

### Domain/intelligence and reflow

- `domain-primitives-default-1440-bltz.png`
- `domain-primitives-responsive-375-bltz.png`
- `intelligence-meanings-provenance-1440-bltz.png`
- `intelligence-restricted-non-inference-375-bltz.png`
- `component-board-school-theme-1440.png`
- `component-board-reflow-320-bltz.png`
- `component-board-zoom-200-percent-1280-bltz.png`

Development-only tool indicators must be identified in the report or hidden without changing product CSS. No screenshot may present unlabeled fictional values as production truth.

## Required commands and acceptance

Run and report exact output for:

1. `npx tsc --noEmit`
2. exact ESLint over changed tests/evidence-preview/component files
3. `npm test -- tests/enterprise-crm/ui`
4. `npm test -- tests/enterprise-crm tests/organization`
5. protected Phase 2/middleware regression command from the Wave 2 gate report
6. `npm test`
7. `npm run lint`
8. `npm run build`

Gate 3C evidence completion is acceptable only when:

- every named export/state has meaningful assertions and all tests pass;
- all keyboard/focus steps above have reproducible evidence;
- the accessibility report is complete with no open critical/high defect;
- all required named screenshots exist and pass visual inspection at their stated viewport/state/theme;
- no product/business/server/schema/package change occurred;
- any conditional defect repair is minimal, test-first, inside the allowlist, and separately identified;
- protected phases and the full build remain green.

## Handoff

Report branch/worktree, verified launch tag/base, commits in order, exact files, migrations `none`, components added `none`, tests/results, accessibility report path, screenshot inventory/metadata, defects/fixes, blockers, assumptions, and Coordinator/QA next-owner notes. Do not mark Gate 3C PASS yourself; return a recommendation and evidence for Coordinator review.

Feature, Stage B schema, production shell wiring, and Gate 3B remain blocked and out of scope.
