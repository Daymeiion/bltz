# Executive Journey — UI Systems Task Packet

**Branch:** `codex/crm-ui-system-executive`  
**Worktree:** `C:\Users\Administrator\bltz-worktrees\crm-ui-system-executive`  
**Start from:** immutable tag `crm-executive-wave1-base` on `codex/crm-integration-executive`; verify its commit against the Coordinator launch handoff

## Required outcome

Complete the minimum Phase 3B shell and Phase 3C shared UI contracts needed for the first Executive vertical slice. Build reusable presentation and interaction systems only; do not create business data, permission behavior, or feature mutations.

## Required reading

Read completely, in the governing order, the five controlling documents listed in `00-COORDINATOR-BASELINE.md`, then inspect current CRM shell, preview, UI primitive, font, token, responsive, and test conventions.

## Authorized work

1. Add the `[data-product="enterprise-crm"]` token layer from the approved design specification without changing Player Locker styling.
2. Bring the persistent organization shell to the required CRM contract: BLTZ/organization identity, navigation, organization/team scope presentation, search entry, Create, notifications, profile/role, system health, collapse/drawer, loading/error/restricted, keyboard/focus, and responsive behavior.
3. Use exact primary labels: Home, Athletes, Media, Opportunities, Activations, Intelligence, Analytics, Organization. Unimplemented destinations remain visibly unavailable and unlinked.
4. Implement stable shared contracts for `PageHeader`, `PillTabs`, `DateRangeSelector`, `KpiCard`, `MetricDelta`, `StatusBadge`, `PriorityBadge`, `EntityReference`, `ExecutiveAttentionCard`, `AttentionRow`, `MemberWorkload`, and applicable loading/empty/filtered-empty/error/restricted/processing/success states.
5. Provide typed fixture-driven component demonstrations/tests only. Do not imply preview values are live.
6. Verify School Theme and BLTZ Default without allowing school tokens to change actions, semantics, layout, or permissions.

## Exclusive ownership

UI Systems exclusively owns during Wave 1:

- `app/globals.css` only for CRM-scoped tokens/selectors and necessary non-CRM preservation fixes;
- `components/organization/OrganizationShell.tsx`;
- `components/organization/OrganizationTheme.tsx`;
- `components/organization/preview/**` when used only as labelled design/component demonstrations;
- `components/enterprise-crm/shell/**`;
- `components/enterprise-crm/navigation/**`;
- `components/enterprise-crm/data/**`;
- `components/enterprise-crm/workflow/**`;
- `components/enterprise-crm/states/**`;
- `tests/organization/shell.test.tsx` and presentation-only organization shell tests;
- `tests/enterprise-crm/ui/**`;
- UI screenshot artifacts under `output/enterprise-crm/ui-system/**`.

UI Systems must not edit `lib/organization/**`, Supabase migrations, generated database types, server permission code, feature route pages, `OrganizationDashboardOverview.tsx`, public Locker routes, or Foundation-owned tests.

If shell presentation needs a new server-supplied field, request a typed contract from Foundation; do not query around it or edit Foundation files.

## Component constraints

- Use canonical CRM tokens only; remove page-local hard-coded values from files touched in scope.
- File-style pills use 12px radius, never full bubble pills.
- Buttons use BLTZ action tokens, 12px radius, and at least 44px height.
- Large section containers use the 24px token only for coherent modules.
- The workspace remains light/neutral; dark chrome is restrained and globally consistent.
- Every shared surface includes applicable loading, empty, filtered-empty, error, restricted, processing, and success behavior.
- Focus, keyboard, overlay focus return, reduced motion, zoom/reflow, and non-color status cues follow WCAG 2.2 AA.

## Tests and screenshots

Run component/interaction/accessibility/responsive tests and the affected protected organization regression suite. Capture labelled evidence at 375, 768, 1024, and 1440 for:

- expanded/collapsed or drawer shell;
- focus-visible and keyboard navigation;
- School Theme and BLTZ Default;
- `PillTabs` default/active/focus/disabled/overflow;
- representative default, loading, empty, error, restricted, processing, and success states.

## Handoff

Report:

- worktree, branch, base/head commits;
- decisions and approved deviations;
- files changed;
- token/components/variants/states exported;
- migrations as `none`;
- exact test commands and pass/fail/skipped results;
- screenshot paths with viewport, state, and theme;
- blockers, assumptions, gaps, and precise Feature usage notes.
