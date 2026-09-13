# Executive Journey — Integration and Launch Plan

## Dirty-worktree preservation strategy

The source worktree at `C:\Users\Administrator\bltz` remains user-owned and untouched. The Coordinator creates a clean sibling integration worktree and copies only the current CRM baseline paths into it before committing. Unrelated Player Locker, media, output, and other dirty paths are excluded.

### Integration baseline allowlist

- `AGENTS.md`
- `app/client-shell.tsx`
- `app/globals.css`
- `app/organization/**`
- `components/organization/**`
- `docs/design-reference/**`
- `docs/enterprise-crm/**`
- `prompts/codex/**`
- `lib/organization/**`
- `lib/supabase/middleware.ts`
- `tests/organization/**`
- `tests/middleware/redirect.test.ts`

No other dirty source path is copied without a recorded dependency decision. The snapshot is committed only on `codex/crm-integration-executive`; it does not stage, commit, reset, or clean the source worktree.

## Worktree topology

| Role | Branch | Worktree |
|---|---|---|
| Coordinator integration | `codex/crm-integration-executive` | `C:\Users\Administrator\bltz-worktrees\crm-integration-executive` |
| Foundation/DB | `codex/crm-foundation-executive` | `C:\Users\Administrator\bltz-worktrees\crm-foundation-executive` |
| UI Systems | `codex/crm-ui-system-executive` | `C:\Users\Administrator\bltz-worktrees\crm-ui-system-executive` |
| Feature/Journey, later | `codex/journey-executive` | `C:\Users\Administrator\bltz-worktrees\journey-executive` |
| QA, later | `codex/qa-executive` | `C:\Users\Administrator\bltz-worktrees\qa-executive` |

Each role branches from the exact Coordinator-recorded integration commit. Worktrees never share uncommitted files.

## Launch order

1. Coordinator establishes the selective CRM integration baseline and records its commit.
2. Launch Foundation/DB and UI Systems in parallel from that exact commit. Their exclusive paths do not overlap.
3. Coordinator reviews Foundation decision requests before any unresolved schema vocabulary is implemented.
4. Each agent rebases or merges the current integration base, runs its full handoff tests, commits, and reports evidence.
5. Coordinator integrates Foundation first, reruns database/RBAC/protected tests, then integrates UI Systems and reruns UI/protected tests. Resolve contract adaptations in the owning branch; do not patch silently during integration.
6. Coordinator records the Phase 3A–3C gate. Only then create the Feature packet/worktree from the new integrated commit.
7. QA starts only from the integrated Feature candidate, never from an individual implementation branch.

## Collision policy

- Foundation owns server scope, schema, migrations, generated types, audit, fixtures, and data/RBAC tests.
- UI Systems owns CRM tokens, shell/theme presentation, shared components, presentation tests, and UI screenshots.
- `app/organization/[organizationId]/layout.tsx` is frozen during Wave 1 unless the Coordinator assigns a single owner for an accepted contract change.
- `components/organization/OrganizationDashboardOverview.tsx` and the production Executive page composition are frozen for later Feature ownership.
- `package.json`, lockfiles, shared generic `components/ui/**`, and root configuration are Coordinator-controlled. Agents request ownership before editing them.

## Integration acceptance

- Clean integration worktree and recorded commit.
- No unrelated source-worktree changes staged, modified, removed, or committed.
- No overlap outside the allowlisted ownership paths.
- Exact migrations and recovery notes recorded.
- Protected organization/Phase 2 baseline passes.
- New Foundation and UI suites pass.
- UI evidence includes required widths, states, focus/accessibility, and both theme modes.
- No unresolved critical/high issue, authorization leak, missing evidence, invented domain status, or unapproved design deviation.

## Required handoff fields

Every handoff includes worktree/branch, base/head commit, decisions/deviations, files, migrations and operational notes, exact tests/results, screenshots with viewport/state/persona or `not applicable`, blockers/gaps, assumptions, and next-owner notes.

