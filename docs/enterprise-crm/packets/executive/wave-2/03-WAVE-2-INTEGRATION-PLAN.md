# Executive Journey Wave 2 — Integration and Launch Plan

## Parallelism

Foundation Stage A and UI Systems component completion may run in parallel from `crm-executive-wave2-base`. Their authorized files do not overlap.

Foundation Stage B may not start without a user-approved persisted authorization and school-directory decision. UI Systems must not wire shell capabilities in parallel with Foundation; that small wiring step is assigned only after the Foundation contract integrates.

## Integration order

1. Integrate Foundation Stage A and run RBAC/data/theme plus protected regressions.
2. Review its schema/source proposal and obtain the required user decision.
3. Integrate UI Systems inventory and run component/accessibility/visual/protected regressions.
4. If the user approves Foundation Stage B, issue an amended migration packet, integrate it, then assign UI Systems the bounded shell-capability/theme wiring adaptation.
5. Re-run Gates 3B and 3C independently.
6. Issue Feature only if both gates pass.

## Frozen and Coordinator-owned paths

- `app/organization/[organizationId]/layout.tsx`
- `components/organization/OrganizationDashboardOverview.tsx`
- `components/organization/OrganizationShell.tsx` during parallel work
- `components/organization/OrganizationTheme.tsx` during parallel work
- `package.json`, lockfiles, root config, generic `components/ui/**`

No agent may silently edit a frozen path. The Coordinator assigns exactly one owner after contract integration.

## Gate 3B acceptance

- Requested team scope is validated against canonical organization/team and trusted actor grants on the server.
- Query state never grants access.
- Revoked/missing/cross-scope permissions deny immediately and cannot reuse broader cache entries.
- Navigation/search/Create/notifications/theme/finance availability consumes resolved capabilities while server enforcement remains authoritative.
- School theme resolves through the approved exact canonical directory link, passes contrast validation, and falls back safely.
- Shell responsive, keyboard, focus, loading/error/restricted behavior and protected regressions pass.

## Gate 3C acceptance

- Every Master-required component is exported with stable typed contracts and representative states.
- No new foundational pattern is required to compose the Executive journey.
- Component, keyboard, accessibility, responsive, visual, full-test, and production-build evidence passes.
- No invented domain vocabulary, business mutation, page-local token system, or permission logic is present.

## Handoff fields

Every handoff reports worktree/branch, base/head, decisions/deviations, files, migrations and operational notes, exact tests/results, screenshots with viewport/state/theme/persona or `not applicable`, blockers/gaps, assumptions, and next-owner notes.

